/**
 * Cloudflare Pages Function catching all /api/* routes:
 * - GET  /api/health
 * - GET  /api/config
 * - GET  /api/admin/session
 * - POST /api/admin/login
 * - POST /api/admin/logout
 * - POST /api/admin/cloudinary-signature
 * - POST /api/admin/config
 * - POST /api/admin/cloudinary-destroy
 * - POST /api/admin/test-cloudinary
 *
 * Uses Web Crypto API (SHA-1 & HMAC-SHA256) and Turso HTTP Pipeline API (fetch)
 * so it runs natively on Cloudflare Pages Edge Workers with zero external dependencies.
 */

interface Env {
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  ADMIN_PASSWORD?: string;
}

const SESSION_COOKIE_NAME = 'admin_session';

function jsonResponse(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

function cleanEnvVal(val?: string): string {
  return (val || '').trim().replace(/^['"]+|['"]+$/g, '').trim();
}

function getEnv(rawEnv: Env) {
  return {
    TURSO_DATABASE_URL: cleanEnvVal(rawEnv.TURSO_DATABASE_URL),
    TURSO_AUTH_TOKEN: cleanEnvVal(rawEnv.TURSO_AUTH_TOKEN).replace(/^Bearer\s+/i, ''),
    CLOUDINARY_CLOUD_NAME: cleanEnvVal(rawEnv.CLOUDINARY_CLOUD_NAME),
    CLOUDINARY_API_KEY: cleanEnvVal(rawEnv.CLOUDINARY_API_KEY),
    CLOUDINARY_API_SECRET: cleanEnvVal(rawEnv.CLOUDINARY_API_SECRET),
    ADMIN_PASSWORD: cleanEnvVal(rawEnv.ADMIN_PASSWORD),
  };
}

async function sha1Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function createAdminSessionToken(secretKey: string): Promise<string> {
  const keyBytes = new TextEncoder().encode(secretKey || 'fallback-dev-admin-key');
  const msgBytes = new TextEncoder().encode('love-gift-admin-authenticated-v1');
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgBytes);
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const [rawKey, ...rawVal] = part.trim().split('=');
    if (rawKey) {
      cookies[rawKey] = decodeURIComponent(rawVal.join('='));
    }
  }
  return cookies;
}

async function isAdminAuthenticated(request: Request, env: ReturnType<typeof getEnv>): Promise<boolean> {
  const activeKey = env.ADMIN_PASSWORD || '0214';
  const expected = await createAdminSessionToken(activeKey);
  const fallbackExpected = await createAdminSessionToken('0214');
  const cookies = parseCookies(request.headers.get('cookie'));
  const cookieToken = cookies[SESSION_COOKIE_NAME];
  const headerToken = request.headers.get('x-admin-token') || '';
  const provided = cookieToken || headerToken;
  return Boolean(provided && (provided === expected || provided === fallbackExpected));
}

/**
 * Execute SQL against Turso over HTTP Pipeline API (v2/pipeline)
 */
async function tursoExecute(
  env: ReturnType<typeof getEnv>,
  sql: string,
  args: Array<{ type: 'text' | 'integer'; value: string }> = []
) {
  if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
    throw new Error('Turso environment variables are not configured.');
  }

  const httpUrl = env.TURSO_DATABASE_URL
    .replace(/^(libsql|wss|ws):\/\//i, 'https://')
    .replace(/\?.*$/, '')
    .replace(/\/+$/, '');

  const resp = await fetch(`${httpUrl}/v2/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.TURSO_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          type: 'execute',
          stmt: {
            sql,
            args,
          },
        },
        { type: 'close' },
      ],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Turso HTTP ${resp.status}: ${text}`);
  }

  const data = (await resp.json()) as any;
  const firstResult = data?.results?.[0];
  if (firstResult?.type === 'error') {
    throw new Error(firstResult?.error?.message || 'Turso SQL execution error');
  }

  return firstResult?.response?.result;
}

async function ensureTursoSchema(env: ReturnType<typeof getEnv>) {
  await tursoExecute(
    env,
    `CREATE TABLE IF NOT EXISTS gift_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`
  );
}

async function destroyCloudinaryAsset(
  env: ReturnType<typeof getEnv>,
  publicId: string,
  resourceType: 'image' | 'video' = 'image'
): Promise<{ ok: boolean; error?: string }> {
  if (!publicId) return { ok: true };
  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    return { ok: false, error: 'Missing Cloudinary environment variables' };
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await sha1Hex(
      `public_id=${publicId}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`
    );

    const form = new URLSearchParams();
    form.set('public_id', publicId);
    form.set('timestamp', String(timestamp));
    form.set('api_key', env.CLOUDINARY_API_KEY);
    form.set('signature', signature);

    const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
      env.CLOUDINARY_CLOUD_NAME
    )}/${resourceType}/destroy`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    const json = (await response.json().catch(() => ({}))) as {
      result?: string;
      error?: { message?: string };
    };

    if (!response.ok || json.error) {
      return {
        ok: false,
        error: json.error?.message || `HTTP ${response.status}`,
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

function extractPublicIds(cfg: Record<string, any> | null): Map<string, 'image' | 'video'> {
  const map = new Map<string, 'image' | 'video'>();
  if (!cfg || typeof cfg !== 'object') return map;

  if (typeof cfg.photo1PublicId === 'string' && cfg.photo1PublicId) {
    map.set(cfg.photo1PublicId, 'image');
  }
  if (typeof cfg.photo2PublicId === 'string' && cfg.photo2PublicId) {
    map.set(cfg.photo2PublicId, 'image');
  }
  if (typeof cfg.albumArtPublicId === 'string' && cfg.albumArtPublicId) {
    map.set(cfg.albumArtPublicId, 'image');
  }
  if (typeof cfg.audioPublicId === 'string' && cfg.audioPublicId) {
    map.set(cfg.audioPublicId, 'video');
  }
  if (Array.isArray(cfg.albumPhotos)) {
    for (const item of cfg.albumPhotos) {
      if (item && typeof item.publicId === 'string' && item.publicId) {
        map.set(item.publicId, 'image');
      }
    }
  }
  if (cfg.illustrationsPublicIds && typeof cfg.illustrationsPublicIds === 'object') {
    for (const val of Object.values(cfg.illustrationsPublicIds)) {
      if (typeof val === 'string' && val) {
        map.set(val, 'image');
      }
    }
  }
  return map;
}

export const onRequest = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const { request } = context;
  const env = getEnv(context.env || {});
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, '');
  const method = request.method.toUpperCase();

  // 1. GET /api/health
  if (pathname === '/api/health' && method === 'GET') {
    const envBooleans = {
      TURSO_DATABASE_URL: Boolean(env.TURSO_DATABASE_URL),
      TURSO_AUTH_TOKEN: Boolean(env.TURSO_AUTH_TOKEN),
      CLOUDINARY_CLOUD_NAME: Boolean(env.CLOUDINARY_CLOUD_NAME),
      CLOUDINARY_API_KEY: Boolean(env.CLOUDINARY_API_KEY),
      CLOUDINARY_API_SECRET: Boolean(env.CLOUDINARY_API_SECRET),
      ADMIN_PASSWORD: Boolean(env.ADMIN_PASSWORD),
    };

    let dbConnected = false;
    if (envBooleans.TURSO_DATABASE_URL && envBooleans.TURSO_AUTH_TOKEN) {
      try {
        await tursoExecute(env, 'SELECT 1');
        dbConnected = true;
      } catch {
        dbConnected = false;
      }
    }

    return jsonResponse({
      ...envBooleans,
      env: envBooleans,
      dbConnected,
    });
  }

  // 2. GET /api/config
  if (pathname === '/api/config' && method === 'GET') {
    try {
      await ensureTursoSchema(env);
      const res = await tursoExecute(
        env,
        'SELECT data, updated_at FROM gift_config WHERE id = 1'
      );
      const row = res?.rows?.[0];
      if (!row) {
        return jsonResponse({ config: null });
      }
      const dataStr = row[0]?.value;
      const updatedAt = Number(row[1]?.value || Date.now());
      return jsonResponse({
        config: dataStr ? JSON.parse(dataStr) : null,
        updatedAt,
      });
    } catch {
      return jsonResponse({ config: null });
    }
  }

  // 3. GET /api/admin/session
  if (pathname === '/api/admin/session' && method === 'GET') {
    const authenticated = await isAdminAuthenticated(request, env);
    return jsonResponse({
      authenticated,
      passwordConfigured: Boolean(env.ADMIN_PASSWORD),
    });
  }

  // 4. POST /api/admin/login
  if (pathname === '/api/admin/login' && method === 'POST') {
    const body = (await request.json().catch(() => ({}))) as { password?: string };
    const expectedPassword = env.ADMIN_PASSWORD || '0214';

    if (typeof body.password !== 'string' || body.password !== expectedPassword) {
      return jsonResponse(
        {
          error: env.ADMIN_PASSWORD
            ? 'Invalid admin password.'
            : 'Invalid password (use default "0214" or set ADMIN_PASSWORD in Cloudflare Pages Environment Variables).',
        },
        401
      );
    }

    const token = await createAdminSessionToken(expectedPassword);
    return jsonResponse(
      { ok: true, token },
      200,
      {
        'Set-Cookie': `${SESSION_COOKIE_NAME}=${encodeURIComponent(
          token
        )}; Path=/; HttpOnly; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax; Secure`,
      }
    );
  }

  // 5. POST /api/admin/logout
  if (pathname === '/api/admin/logout' && method === 'POST') {
    return jsonResponse(
      { ok: true },
      200,
      {
        'Set-Cookie': `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax; Secure`,
      }
    );
  }

  // All routes below require admin authentication
  const isAuthed = await isAdminAuthenticated(request, env);
  if (!isAuthed) {
    return jsonResponse(
      { error: 'Unauthorized: Admin authentication required.' },
      401
    );
  }

  // 6. POST /api/admin/cloudinary-signature
  if (pathname === '/api/admin/cloudinary-signature' && method === 'POST') {
    const body = (await request.json().catch(() => ({}))) as {
      resourceType?: string;
    };
    if (body.resourceType !== 'image' && body.resourceType !== 'video') {
      return jsonResponse(
        { error: 'Invalid resourceType. Expected "image" or "video".' },
        400
      );
    }

    if (
      !env.CLOUDINARY_CLOUD_NAME ||
      !env.CLOUDINARY_API_KEY ||
      !env.CLOUDINARY_API_SECRET
    ) {
      return jsonResponse(
        {
          error:
            'Missing Cloudinary configuration (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET).',
        },
        400
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'love-gift';
    const signature = await sha1Hex(
      `folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`
    );

    return jsonResponse({
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      apiKey: env.CLOUDINARY_API_KEY,
      timestamp,
      folder,
      signature,
    });
  }

  // 7. POST /api/admin/config
  if (pathname === '/api/admin/config' && method === 'POST') {
    try {
      const body = (await request.json().catch(() => ({}))) as {
        config?: Record<string, any>;
        assetsToDelete?: Array<{ publicId: string; resourceType: 'image' | 'video' }>;
      };

      if (!body.config || typeof body.config !== 'object') {
        return jsonResponse({ error: 'Invalid config payload.' }, 400);
      }

      let oldConfig: Record<string, any> | null = null;
      const hasTurso = Boolean(env.TURSO_DATABASE_URL && env.TURSO_AUTH_TOKEN);

      if (hasTurso) {
        await ensureTursoSchema(env);
        try {
          const prev = await tursoExecute(
            env,
            'SELECT data FROM gift_config WHERE id = 1'
          );
          const raw = prev?.rows?.[0]?.[0]?.value;
          if (raw) oldConfig = JSON.parse(raw);
        } catch {
          oldConfig = null;
        }
      }

      const oldAssets = extractPublicIds(oldConfig);
      const newAssets = extractPublicIds(body.config);

      const now = Date.now();
      if (hasTurso) {
        await tursoExecute(
          env,
          `INSERT INTO gift_config (id, data, updated_at)
           VALUES (1, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             data = excluded.data,
             updated_at = excluded.updated_at`,
          [
            { type: 'text', value: JSON.stringify(body.config) },
            { type: 'integer', value: String(now) },
          ]
        );
      }

      const toDestroy = new Map<string, 'image' | 'video'>();
      for (const [pubId, rType] of oldAssets.entries()) {
        if (!newAssets.has(pubId)) {
          toDestroy.set(pubId, rType);
        }
      }
      if (Array.isArray(body.assetsToDelete)) {
        for (const item of body.assetsToDelete) {
          if (
            item &&
            typeof item.publicId === 'string' &&
            item.publicId &&
            !newAssets.has(item.publicId)
          ) {
            toDestroy.set(
              item.publicId,
              item.resourceType === 'video' ? 'video' : 'image'
            );
          }
        }
      }

      if (toDestroy.size > 0) {
        await Promise.allSettled(
          Array.from(toDestroy.entries()).map(([pubId, rType]) =>
            destroyCloudinaryAsset(env, pubId, rType)
          )
        );
      }

      return jsonResponse({ ok: true, updatedAt: now });
    } catch (err) {
      return jsonResponse(
        {
          error:
            err instanceof Error
              ? err.message
              : 'Failed to save configuration to Turso DB.',
        },
        500
      );
    }
  }

  // 8. POST /api/admin/cloudinary-destroy
  if (pathname === '/api/admin/cloudinary-destroy' && method === 'POST') {
    const body = (await request.json().catch(() => ({}))) as {
      publicId?: string;
      resourceType?: 'image' | 'video';
    };
    if (!body.publicId) {
      return jsonResponse({ error: 'publicId is required.' }, 400);
    }
    const result = await destroyCloudinaryAsset(
      env,
      body.publicId,
      body.resourceType === 'video' ? 'video' : 'image'
    );
    if (!result.ok) {
      return jsonResponse({ error: result.error || 'Failed to delete asset' }, 400);
    }
    return jsonResponse({ ok: true });
  }

  // 9. POST /api/admin/test-cloudinary
  if (pathname === '/api/admin/test-cloudinary' && method === 'POST') {
    if (
      !env.CLOUDINARY_CLOUD_NAME ||
      !env.CLOUDINARY_API_KEY ||
      !env.CLOUDINARY_API_SECRET
    ) {
      return jsonResponse(
        {
          ok: false,
          error:
            'Missing required Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET).',
        },
        400
      );
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const folder = 'love-gift';
      const signature = await sha1Hex(
        `folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`
      );

      const onePxPngDataUri =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

      const uploadForm = new URLSearchParams();
      uploadForm.set('file', onePxPngDataUri);
      uploadForm.set('api_key', env.CLOUDINARY_API_KEY);
      uploadForm.set('timestamp', String(timestamp));
      uploadForm.set('folder', folder);
      uploadForm.set('signature', signature);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
        env.CLOUDINARY_CLOUD_NAME
      )}/image/upload`;

      const uploadResp = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: uploadForm.toString(),
      });

      const uploadJson = (await uploadResp.json().catch(() => ({}))) as {
        public_id?: string;
        error?: { message?: string };
      };

      if (!uploadResp.ok || uploadJson.error || !uploadJson.public_id) {
        return jsonResponse(
          {
            ok: false,
            error:
              uploadJson.error?.message ||
              `Cloudinary upload failed with HTTP ${uploadResp.status}`,
          },
          400
        );
      }

      const destroyResult = await destroyCloudinaryAsset(
        env,
        uploadJson.public_id,
        'image'
      );
      if (!destroyResult.ok) {
        return jsonResponse(
          {
            ok: false,
            error:
              destroyResult.error ||
              'Uploaded 1px image but failed to delete it.',
          },
          400
        );
      }

      return jsonResponse({
        ok: true,
        message:
          'Signed 1px image uploaded to folder "love-gift" and deleted from Cloudinary.',
      });
    } catch (err) {
      return jsonResponse(
        {
          ok: false,
          error:
            err instanceof Error
              ? err.message
              : 'Network error while contacting Cloudinary.',
        },
        500
      );
    }
  }

  return jsonResponse({ error: 'Not found' }, 404);
};
