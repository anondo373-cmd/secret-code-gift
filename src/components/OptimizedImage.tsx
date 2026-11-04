import React, { useState } from 'react';
import {
  getCloudinaryBlurPlaceholder,
  getCloudinarySrcSet,
  getOptimizedCloudinaryUrl,
  isCloudinaryUrl,
} from '../utils/cloudinary';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  fit?: 'contain' | 'cover';
  fallback?: React.ReactNode;
}

/**
 * Renders an image with Cloudinary delivery optimizations:
 * - f_auto,q_auto,dpr_auto
 * - Responsive srcSet (400w, 800w, 1200w)
 * - Blurred low-res backdrop + full uncropped image (object-contain by default)
 */
export function OptimizedImage({
  src,
  alt,
  className = '',
  sizes = '(max-width: 768px) 100vw, 50vw',
  fit = 'contain',
  fallback,
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <>
        {fallback ?? (
          <div
            className={`w-full h-full bg-[#FDEBF1] flex items-center justify-center text-[#D6336C] text-2xl ${className}`}
          >
            ♥
          </div>
        )}
      </>
    );
  }

  const isCloud = isCloudinaryUrl(src);
  const optimizedSrc = getOptimizedCloudinaryUrl(src);
  const srcSet = getCloudinarySrcSet(src);
  const blurUrl = getCloudinaryBlurPlaceholder(src);
  const fitClass = fit === 'cover' ? 'object-cover' : 'object-contain';

  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-[#FDEBF1]">
      {/* Soft ambient blurred fill so portrait/landscape photos never leave harsh empty bars */}
      {fit === 'contain' && (
        <img
          src={blurUrl || optimizedSrc}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-45 pointer-events-none select-none"
        />
      )}
      {isCloud && blurUrl && !loaded && (
        <img
          src={blurUrl}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          className={`absolute inset-0 w-full h-full object-cover scale-105 blur-md transition-opacity duration-300 ${className}`}
        />
      )}
      <img
        src={optimizedSrc}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`relative z-10 w-full h-full ${fitClass} transition-opacity duration-300 ${
          isCloud && !loaded ? 'opacity-0' : 'opacity-100'
        } ${className}`}
      />
    </div>
  );
}
