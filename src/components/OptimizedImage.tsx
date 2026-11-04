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
  fallback?: React.ReactNode;
}

/**
 * Renders an image with Cloudinary delivery optimizations:
 * - f_auto,q_auto,dpr_auto
 * - Responsive srcSet (400w, 800w, 1200w)
 * - Blurred low-res placeholder (e_blur:1000,q_1,w_40) while loading
 */
export function OptimizedImage({
  src,
  alt,
  className = '',
  sizes = '(max-width: 768px) 100vw, 50vw',
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

  return (
    <div className="relative w-full h-full overflow-hidden">
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
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isCloud && !loaded ? 'opacity-0' : 'opacity-100'
        } ${className}`}
      />
    </div>
  );
}
