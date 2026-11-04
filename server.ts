import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient, Client } from '@libsql/client';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAVED_CONFIG_FILE = path.join(__dirname, 'src', 'savedConfig.json');

function readSavedConfigFile(): Record<string, any> | null {
  try {
    if (fs.existsSync(SAVED_CONFIG_FILE)) {
      const raw = fs.readFileSync(SAVED_CONFIG_FILE, 'utf-8').trim();
      if (raw && raw !== '{}') {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          return parsed;
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function writeSavedConfigFile(cfg: Record<string, any>) {
  try {
    fs.writeFileSync(SAVED_CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write src/savedConfig.json:', err);
  }
}

const PORT = 3000;
const SESSION_COOKIE_NAME = 'admin_session';

// Read environment variables dynamically so changes in secrets are picked up immediately
function getEnv() {
  return {
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL?.trim() || '',
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN?.trim() || '',
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME?.trim() || '',
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY?.trim() || '',
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET?.trim() || '',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD?.trim() || '',
  };
}

let dbClient: Client | null = null;
let lastDbUrl = '';
let lastAuthToken = '';

async function getDb(): Promise<{ client: Client; isRemoteTurso: boolean }> {
  const env = getEnv();
  const hasTurso = Boolean(env.TURSO_DATABASE_URL);
  const targetUrl = hasTurso ? env.TURSO_DATABASE_URL : 'file:local.db';
  const targetToken = hasTurso ? env.TURSO_AUTH_TOKEN : '';

  if (!dbClient || targetUrl !== lastDbUrl || targetToken !== lastAuthToken) {
    dbClient = createClient(
      hasTurso
        ? { url: targetUrl, authToken: targetToken || undefined }
        : { url: 'file:local.db' }
    );
    lastDbUrl = targetUrl;
    lastAuthToken = targetToken;

    await dbClient.execute(`
      CREATE TABLE IF NOT EXISTS gift_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  }

  return { client: dbClient, isRemoteTurso: hasTurso };
}

// Parse cookies from request header without extra dependencies
function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const cookies: Record<string, string> = {};
  for (const part of header.split(';')) {
    const [rawKey, ...rawVal] = part.trim().split('=');
    if (rawKey) {
      cookies[rawKey] = decodeURIComponent(rawVal.join('='));
    }
  }
  return cookies;
}

// Create deterministic HMAC token for admin session
function createAdminSessionToken(secretKey: string): string {
  return crypto
    .createHmac('sha256', secretKey || 'fallback-dev-admin-key')
    .update('love-gift-admin-authenticated-v1')
    .digest('hex');
}

function isAdminAuthenticated(req: Request): boolean {
  const { ADMIN_PASSWORD } = getEnv();
  const activeKey = ADMIN_PASSWORD || '0214';
  const expected = createAdminSessionToken(activeKey);

  const cookies = parseCookies(req);
  const cookieToken = cookies[SESSION_COOKIE_NAME];
  const headerToken = req.headers['x-admin-token'];

  const provided =
    cookieToken || (typeof headerToken === 'string' ? headerToken : '');
  if (!provided || provided.length !== expected.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(provided, 'utf8'),
      Buffer.from(expected, 'utf8')
    );
  } catch {
    return false;
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!isAdminAuthenticated(req)) {
    res.status(401).json({ error: 'Unauthorized: Admin authentication required.' });
    return;
  }
  next();
}

/**
 * Compute Cloudinary SHA-1 signature using Node's built-in crypto.
 * Parameters must be sorted alphabetically, joined with '&', and have CLOUDINARY_API_SECRET appended directly.
 */
function signCloudinaryParams(
  params: Record<string, string | number>,
  apiSecret: string
): string {
  const serialized = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return crypto
    .createHash('sha1')
    .update(`${serialized}${apiSecret}`)
    .digest('hex');
}

/**
 * Destroy an old asset on Cloudinary when replaced.
 * Ignores failures silently so saving never breaks.
 */
async function destroyCloudinaryAsset(
  publicId: string,
  resourceType: 'image' | 'video' = 'image'
): Promise<{ ok: boolean; error?: string }> {
  if (!publicId) return { ok: true };
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    getEnv();
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return { ok: false, error: 'Missing Cloudinary environment variables' };
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    // Signing "public_id=<id>&timestamp=<timestamp>" + secret
    const signature = signCloudinaryParams(
      { public_id: publicId, timestamp },
      CLOUDINARY_API_SECRET
    );

    const form = new URLSearchParams();
    form.set('public_id', publicId);
    form.set('timestamp', String(timestamp));
    form.set('api_key', CLOUDINARY_API_KEY);
    form.set('signature', signature);

    const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
      CLOUDINARY_CLOUD_NAME
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

/**
 * Extract all { publicId, resourceType } references from a config object
 * so we can automatically clean up any replaced assets after DB save.
 */
function extractPublicIds(
  cfg: Record<string, any> | null
): Map<string, 'image' | 'video'> {
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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // 1. GET /api/health - Reports the 6 env var booleans + DB connectivity, with NO values
  app.get('/api/health', async (_req: Request, res: Response) => {
    const env = getEnv();
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
        const { client } = await getDb();
        await client.execute('SELECT 1');
        dbConnected = true;
      } catch {
        dbConnected = false;
      }
    }

    res.json({
      ...envBooleans,
      env: envBooleans,
      dbConnected,
    });
  });

  // 2. GET /api/config - Fetch saved gift config from DB or src/savedConfig.json
  app.get('/api/config', async (_req: Request, res: Response) => {
    try {
      const { client } = await getDb();
      const result = await client.execute(
        'SELECT data, updated_at FROM gift_config WHERE id = 1'
      );
      if (result.rows.length > 0) {
        const rawData = result.rows[0].data as string;
        const parsed = JSON.parse(rawData);
        // Ensure src/savedConfig.json stays synced with DB
        if (!readSavedConfigFile()) {
          writeSavedConfigFile(parsed);
        }
        res.json({
          config: parsed,
          updatedAt: result.rows[0].updated_at,
        });
        return;
      }
      const fileConfig = readSavedConfigFile();
      res.json({ config: fileConfig });
    } catch {
      res.json({ config: readSavedConfigFile() });
    }
  });

  // 2b. POST /api/sync-config - Syncs browser-cached config into DB & src/savedConfig.json if DB was empty
  app.post('/api/sync-config', async (req: Request, res: Response) => {
    try {
      const { config: clientConfig } = req.body || {};
      if (!clientConfig || typeof clientConfig !== 'object') {
        res.status(400).json({ error: 'Invalid config' });
        return;
      }
      const { client } = await getDb();
      const existing = await client.execute('SELECT data FROM gift_config WHERE id = 1');
      if (existing.rows.length === 0 && !readSavedConfigFile()) {
        const now = Date.now();
        await client.execute({
          sql: `INSERT INTO gift_config (id, data, updated_at) VALUES (1, ?, ?)
                ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
          args: [JSON.stringify(clientConfig), now],
        });
        writeSavedConfigFile(clientConfig);
        res.json({ ok: true, synced: true });
        return;
      }
      res.json({ ok: true, synced: false });
    } catch {
      res.json({ ok: false });
    }
  });

  // 3. Admin Session & Login / Logout
  app.get('/api/admin/session', (req: Request, res: Response) => {
    const { ADMIN_PASSWORD } = getEnv();
    res.json({
      authenticated: isAdminAuthenticated(req),
      passwordConfigured: Boolean(ADMIN_PASSWORD),
    });
  });

  app.post('/api/admin/login', (req: Request, res: Response) => {
    const { ADMIN_PASSWORD } = getEnv();
    const expectedPassword = ADMIN_PASSWORD || '0214';

    const { password } = req.body || {};
    if (typeof password !== 'string' || password !== expectedPassword) {
      res.status(401).json({
        error: ADMIN_PASSWORD
          ? 'Invalid admin password.'
          : 'Invalid password (use default "0214" or set ADMIN_PASSWORD in Secrets).',
      });
      return;
    }

    const token = createAdminSessionToken(expectedPassword);
    const isSecure =
      req.secure || req.headers['x-forwarded-proto'] === 'https';

    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Max-Age=${
        60 * 60 * 24 * 7
      }; ${isSecure ? 'SameSite=None; Secure' : 'SameSite=Lax'}`
    );

    res.json({ ok: true, token });
  });

  app.post('/api/admin/logout', (req: Request, res: Response) => {
    const isSecure =
      req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; ${
        isSecure ? 'SameSite=None; Secure' : 'SameSite=Lax'
      }`
    );
    res.json({ ok: true });
  });

  // 4. POST /api/admin/cloudinary-signature (admin cookie required)
  // Body: { resourceType: "image" | "video" }
  // Sets timestamp = current Unix time in seconds and folder = "love-gift",
  // builds string "folder=love-gift&timestamp=<timestamp>", appends CLOUDINARY_API_SECRET,
  // and returns SHA-1 hex digest as signature.
  app.post(
    '/api/admin/cloudinary-signature',
    requireAdmin,
    (req: Request, res: Response) => {
      const { resourceType } = req.body || {};
      if (resourceType !== 'image' && resourceType !== 'video') {
        res.status(400).json({
          error: 'Invalid resourceType. Expected "image" or "video".',
        });
        return;
      }

      const {
        CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET,
      } = getEnv();

      if (
        !CLOUDINARY_CLOUD_NAME ||
        !CLOUDINARY_API_KEY ||
        !CLOUDINARY_API_SECRET
      ) {
        res.status(400).json({
          error:
            'Missing Cloudinary configuration (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET).',
        });
        return;
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const folder = 'love-gift';

      // Build "folder=love-gift&timestamp=<timestamp>" + CLOUDINARY_API_SECRET -> SHA-1 hex
      const stringToSign = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
      const signature = crypto
        .createHash('sha1')
        .update(stringToSign)
        .digest('hex');

      res.json({
        cloudName: CLOUDINARY_CLOUD_NAME,
        apiKey: CLOUDINARY_API_KEY,
        timestamp,
        folder,
        signature,
      });
    }
  );

  // 5. POST /api/admin/config (admin cookie required)
  // Saves updated config to DB, then deletes any replaced Cloudinary assets silently on the server.
  app.post(
    '/api/admin/config',
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const { config: newConfig, assetsToDelete } = req.body || {};
        if (!newConfig || typeof newConfig !== 'object') {
          res.status(400).json({ error: 'Invalid config payload.' });
          return;
        }

        const { client } = await getDb();

        // Read previous config so we can detect replaced public_ids
        let oldConfig: Record<string, any> | null = null;
        try {
          const prevRes = await client.execute(
            'SELECT data FROM gift_config WHERE id = 1'
          );
          if (prevRes.rows.length > 0) {
            oldConfig = JSON.parse(prevRes.rows[0].data as string);
          }
        } catch {
          oldConfig = null;
        }

        const oldAssets = extractPublicIds(oldConfig);
        const newAssets = extractPublicIds(newConfig);

        const now = Date.now();
        await client.execute({
          sql: `
            INSERT INTO gift_config (id, data, updated_at)
            VALUES (1, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              data = excluded.data,
              updated_at = excluded.updated_at
          `,
          args: [JSON.stringify(newConfig), now],
        });

        // Also write directly to src/savedConfig.json so git push / Cloudflare Pages builds include all changes!
        writeSavedConfigFile(newConfig);

        // Collect old assets that were replaced or explicitly marked for deletion
        const toDestroy = new Map<string, 'image' | 'video'>();
        for (const [pubId, rType] of oldAssets.entries()) {
          if (!newAssets.has(pubId)) {
            toDestroy.set(pubId, rType);
          }
        }
        if (Array.isArray(assetsToDelete)) {
          for (const item of assetsToDelete) {
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

        // Delete old assets on the server and ignore failures silently so saving never breaks
        if (toDestroy.size > 0) {
          Promise.allSettled(
            Array.from(toDestroy.entries()).map(([pubId, rType]) =>
              destroyCloudinaryAsset(pubId, rType)
            )
          ).catch(() => {});
        }

        res.json({ ok: true, updatedAt: now });
      } catch (err) {
        res.status(500).json({
          error:
            err instanceof Error ? err.message : 'Failed to save configuration.',
        });
      }
    }
  );

  // 6. POST /api/admin/cloudinary-destroy (admin cookie required)
  // Used by "Test Cloudinary" or manual asset cleanup to delete a specific public_id
  app.post(
    '/api/admin/cloudinary-destroy',
    requireAdmin,
    async (req: Request, res: Response) => {
      const { publicId, resourceType = 'image' } = req.body || {};
      if (!publicId || typeof publicId !== 'string') {
        res.status(400).json({ error: 'publicId is required.' });
        return;
      }
      const result = await destroyCloudinaryAsset(
        publicId,
        resourceType === 'video' ? 'video' : 'image'
      );
      if (!result.ok) {
        res.status(400).json({ error: result.error || 'Failed to delete asset' });
        return;
      }
      res.json({ ok: true });
    }
  );

  // 7. POST /api/admin/test-cloudinary (admin cookie required)
  // Performs a signed upload of a 1px image to Cloudinary, then deletes it,
  // and returns Cloudinary's exact error message if either step fails.
  app.post(
    '/api/admin/test-cloudinary',
    requireAdmin,
    async (_req: Request, res: Response) => {
      const {
        CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET,
      } = getEnv();

      if (
        !CLOUDINARY_CLOUD_NAME ||
        !CLOUDINARY_API_KEY ||
        !CLOUDINARY_API_SECRET
      ) {
        res.status(400).json({
          ok: false,
          error:
            'Missing required Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET).',
        });
        return;
      }

      try {
        const timestamp = Math.floor(Date.now() / 1000);
        const folder = 'love-gift';
        const stringToSign = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
        const signature = crypto
          .createHash('sha1')
          .update(stringToSign)
          .digest('hex');

        // 1x1 transparent PNG data URI
        const onePxPngDataUri =
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

        const uploadForm = new URLSearchParams();
        uploadForm.set('file', onePxPngDataUri);
        uploadForm.set('api_key', CLOUDINARY_API_KEY);
        uploadForm.set('timestamp', String(timestamp));
        uploadForm.set('folder', folder);
        uploadForm.set('signature', signature);

        const uploadUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
          CLOUDINARY_CLOUD_NAME
        )}/image/upload`;

        const uploadResp = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: uploadForm.toString(),
        });

        const uploadJson = (await uploadResp.json().catch(() => ({}))) as {
          public_id?: string;
          secure_url?: string;
          error?: { message?: string };
        };

        if (!uploadResp.ok || uploadJson.error || !uploadJson.public_id) {
          const exactMessage =
            uploadJson.error?.message ||
            `Cloudinary upload failed with HTTP ${uploadResp.status}`;
          res.status(400).json({ ok: false, error: exactMessage });
          return;
        }

        // Now immediately delete the 1px test image
        const destroyResult = await destroyCloudinaryAsset(
          uploadJson.public_id,
          'image'
        );

        if (!destroyResult.ok) {
          res.status(400).json({
            ok: false,
            error:
              destroyResult.error ||
              'Uploaded 1px image but failed to delete it.',
          });
          return;
        }

        res.json({
          ok: true,
          message:
            'Signed 1px image uploaded to folder "love-gift" and deleted from Cloudinary.',
        });
      } catch (err) {
        res.status(500).json({
          ok: false,
          error:
            err instanceof Error
              ? err.message
              : 'Network error while contacting Cloudinary.',
        });
      }
    }
  );

  // Vite middleware for development / static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
