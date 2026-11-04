const ADMIN_TOKEN_STORAGE_KEY = 'love_gift_admin_token';

export function getStoredAdminToken(): string {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredAdminToken(token: string | null) {
  try {
    if (token) {
      sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function getAdminHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getStoredAdminToken();
  return {
    ...(token ? { 'x-admin-token': token } : {}),
    ...extra,
  };
}

/**
 * 100 KB WebP Compression Pipeline:
 * 1. Tries quality 0.92 down to 0.75 at initial dimensions (capped at 1600px max side).
 * 2. If still > 100 KB (102,400 bytes), shrinks dimensions iteratively at quality 0.75 until <= 100 KB.
 */
export async function compressImageToWebPUnder100KB(file: File | Blob): Promise<File> {
  const MAX_BYTES = 100 * 1024; // 100 KB

  const img = await loadImageFromBlob(file);
  let width = img.naturalWidth || img.width || 800;
  let height = img.naturalHeight || img.height || 800;

  const maxInitialDim = 1600;
  if (width > maxInitialDim || height > maxInitialDim) {
    const ratio = Math.min(maxInitialDim / width, maxInitialDim / height);
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));
  }

  // Step 1: Try quality 0.92 down to 0.75
  const qualities = [0.92, 0.86, 0.80, 0.75];
  let bestBlob: Blob | null = null;

  for (const q of qualities) {
    const blob = await renderCanvasWebP(img, width, height, q);
    bestBlob = blob;
    if (blob.size <= MAX_BYTES) {
      return new File([blob], 'upload.webp', { type: 'image/webp' });
    }
  }

  // Step 2: Shrink dimensions iteratively until <= 100 KB
  let curWidth = width;
  let curHeight = height;
  for (let attempt = 0; attempt < 10; attempt++) {
    curWidth = Math.max(64, Math.round(curWidth * 0.82));
    curHeight = Math.max(64, Math.round(curHeight * 0.82));
    const blob = await renderCanvasWebP(img, curWidth, curHeight, 0.75);
    bestBlob = blob;
    if (blob.size <= MAX_BYTES || (curWidth <= 96 && curHeight <= 96)) {
      break;
    }
  }

  return new File([bestBlob!], 'upload.webp', { type: 'image/webp' });
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode image file.'));
    };
    img.src = url;
  });
}

function renderCanvasWebP(
  img: HTMLImageElement,
  width: number,
  height: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas 2D context unavailable.'));
      return;
    }
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to encode WebP image.'));
          return;
        }
        resolve(blob);
      },
      'image/webp',
      quality
    );
  });
}

export interface SignedUploadResult {
  secure_url: string;
  public_id: string;
  bytes?: number;
}

interface SignatureResponse {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  error?: string;
}

/**
 * Requests a fresh signature from POST /api/admin/cloudinary-signature before every upload,
 * then uploads via XMLHttpRequest to https://api.cloudinary.com/v1_1/{cloudName}/{resourceType}/upload
 * with FormData fields: file, api_key, timestamp, folder, signature.
 */
export async function uploadToCloudinarySigned(
  file: File | Blob,
  resourceType: 'image' | 'video',
  onProgress?: (percent: number) => void
): Promise<SignedUploadResult> {
  // 1. Request a fresh signature before every upload
  const sigResp = await fetch('/api/admin/cloudinary-signature', {
    method: 'POST',
    credentials: 'include',
    headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ resourceType }),
  });

  const sigData = (await sigResp.json().catch(() => ({}))) as SignatureResponse;
  if (!sigResp.ok || !sigData.signature || !sigData.cloudName || !sigData.apiKey) {
    throw new Error(
      sigData.error || `Failed to obtain Cloudinary signature (HTTP ${sigResp.status})`
    );
  }

  // 2. Compress images through the 100 KB WebP pipeline before uploading (unless it's a tiny 1px test blob)
  let uploadFile: File | Blob = file;
  if (resourceType === 'image' && file.size > 512) {
    uploadFile = await compressImageToWebPUnder100KB(file);
  }

  // 3. Upload directly to Cloudinary with XMLHttpRequest for real progress
  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
    sigData.cloudName
  )}/${resourceType}/upload`;

  const formData = new FormData();
  formData.append('file', uploadFile);
  formData.append('api_key', sigData.apiKey);
  formData.append('timestamp', String(sigData.timestamp));
  formData.append('folder', sigData.folder);
  formData.append('signature', sigData.signature);

  return new Promise<SignedUploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const pct = Math.round((event.loaded / event.total) * 100);
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      let parsed: any = {};
      try {
        parsed = JSON.parse(xhr.responseText || '{}');
      } catch {
        parsed = {};
      }

      if (xhr.status >= 200 && xhr.status < 300 && parsed.secure_url && parsed.public_id) {
        onProgress?.(100);
        resolve({
          secure_url: parsed.secure_url,
          public_id: parsed.public_id,
          bytes: parsed.bytes,
        });
      } else {
        const exactError =
          parsed?.error?.message ||
          `Cloudinary error (HTTP ${xhr.status || 'Network Error'})`;
        reject(new Error(exactError));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error while uploading to Cloudinary (check cloud name or CORS).'));
    };

    xhr.send(formData);
  });
}

/**
 * Cloudinary Optimized Delivery URLs:
 * Injects f_auto,q_auto,dpr_auto (and optional width w_X) into Cloudinary upload URLs.
 */
export function isCloudinaryUrl(url?: string): boolean {
  return Boolean(
    url &&
      typeof url === 'string' &&
      url.includes('res.cloudinary.com/') &&
      url.includes('/image/upload/')
  );
}

export function getOptimizedCloudinaryUrl(url: string, width?: number): string {
  if (!isCloudinaryUrl(url)) return url;
  const transforms = width
    ? `f_auto,q_auto,dpr_auto,c_limit,w_${width}`
    : 'f_auto,q_auto,dpr_auto';
  return url.replace('/image/upload/', `/image/upload/${transforms}/`);
}

export function getCloudinarySrcSet(url: string): string | undefined {
  if (!isCloudinaryUrl(url)) return undefined;
  return [400, 800, 1200]
    .map((w) => `${getOptimizedCloudinaryUrl(url, w)} ${w}w`)
    .join(', ');
}

export function getCloudinaryBlurPlaceholder(url: string): string | undefined {
  if (!isCloudinaryUrl(url)) return undefined;
  return url.replace('/image/upload/', '/image/upload/f_auto,q_1,e_blur:1000,w_40/');
}
