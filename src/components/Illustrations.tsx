import React, { useState } from 'react';
import { useAppConfig } from '../context/ConfigContext';
import {
  getCloudinarySrcSet,
  getOptimizedCloudinaryUrl,
} from '../utils/cloudinary';

interface IllustrationProps {
  className?: string;
}

/**
 * Helper wrapper that renders a custom image from config if provided,
 * falling back to the inline SVG sticker if unset or if loading fails.
 */
function ReplaceableSticker({
  src,
  alt,
  className,
  children,
}: {
  src?: string;
  alt: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [imgError, setImgError] = useState(false);

  if (src && !imgError) {
    const optimizedSrc = getOptimizedCloudinaryUrl(src);
    const srcSet = getCloudinarySrcSet(src);
    return (
      <img
        src={optimizedSrc}
        srcSet={srcSet}
        sizes="(max-width: 768px) 50vw, 300px"
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`object-contain select-none ${className ?? ''}`}
      />
    );
  }
  return <>{children}</>;
}

/**
 * 1. Pink Ribbon Bow (Top-right of Lock Screen & accents)
 */
export function BowIllustration({ className = 'w-24 h-24' }: IllustrationProps) {
  const { appConfig } = useAppConfig();
  return (
    <ReplaceableSticker src={appConfig.illustrations.bow} alt="Pink ribbon bow" className={className}>
      <svg
        viewBox="0 0 160 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`select-none drop-shadow-[0_4px_0_rgba(255,255,255,0.95)] ${className}`}
        aria-hidden="true"
      >
        {/* White sticker outline base */}
        <g stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round">
          <path d="M74 68 C40 30, 12 45, 22 76 C30 98, 58 84, 74 74 Z" />
          <path d="M86 68 C120 30, 148 45, 138 76 C130 98, 102 84, 86 74 Z" />
          <path d="M72 78 C58 104, 42 126, 32 138 L48 134 L54 142 C64 122, 72 100, 78 80" />
          <path d="M88 78 C102 104, 118 126, 128 138 L112 134 L106 142 C96 122, 88 100, 82 80" />
          <ellipse cx="80" cy="73" rx="11" ry="13" />
        </g>
        {/* Ribbon Tails */}
        <path
          d="M72 78 C58 104, 42 126, 32 138 L48 134 L54 142 C64 122, 72 100, 78 80 Z"
          fill="#F4A5C2"
          stroke="#5A2A2A"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M88 78 C102 104, 118 126, 128 138 L112 134 L106 142 C96 122, 88 100, 82 80 Z"
          fill="#F4A5C2"
          stroke="#5A2A2A"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Left & Right Bow Loops */}
        <path
          d="M74 68 C40 30, 12 45, 22 76 C30 98, 58 84, 74 74 Z"
          fill="#F8C8D8"
          stroke="#5A2A2A"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M86 68 C120 30, 148 45, 138 76 C130 98, 102 84, 86 74 Z"
          fill="#F8C8D8"
          stroke="#5A2A2A"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Inner creases */}
        <path d="M66 69 C52 60, 42 64, 38 71" stroke="#D6336C" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M94 69 C108 60, 118 64, 122 71" stroke="#D6336C" strokeWidth="2.5" strokeLinecap="round" />
        {/* Center knot */}
        <ellipse
          cx="80"
          cy="73"
          rx="11"
          ry="13"
          fill="#D6336C"
          stroke="#5A2A2A"
          strokeWidth="3"
        />
        <ellipse cx="77" cy="69" rx="3" ry="4" fill="#FFF3DC" opacity="0.7" />
      </svg>
    </ReplaceableSticker>
  );
}

/**
 * 2. Sparkles / Stars Sticker Overlay
 */
export function SparkleSticker({ className = 'w-6 h-6' }: IllustrationProps) {
  const { appConfig } = useAppConfig();
  return (
    <ReplaceableSticker src={appConfig.illustrations.sparkles} alt="Sparkle" className={className}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`select-none ${className}`}
        aria-hidden="true"
      >
        <path
          d="M20 3 C21.5 14, 26 18.5, 37 20 C26 21.5, 21.5 26, 20 37 C18.5 26, 14 21.5, 3 20 C14 18.5, 18.5 14, 20 3 Z"
          fill="#FFF3DC"
          stroke="#D6336C"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="20" r="2.2" fill="#D6336C" />
      </svg>
    </ReplaceableSticker>
  );
}

/**
 * 3. Heart-Shaped Photo Frame with Scalloped Lace / Doily Border
 */
export function HeartPhotoFrame({
  photoUrl,
  alt,
  clipId,
  className = '',
}: {
  photoUrl: string;
  alt: string;
  clipId: string;
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const optimizedUrl = getOptimizedCloudinaryUrl(photoUrl, 800);

  // Scalloped outer circles along a heart curve
  const scallops = [
    [100, 36], [85, 25], [67, 20], [49, 23], [33, 33], [23, 49],
    [20, 68], [25, 87], [36, 105], [50, 122], [66, 138], [83, 153],
    [100, 168], [117, 153], [134, 138], [150, 122], [164, 105],
    [175, 87], [180, 68], [177, 49], [167, 33], [151, 23], [133, 20], [115, 25],
  ];

  return (
    <div className={`relative select-none ${className}`}>
      <svg
        viewBox="0 0 200 195"
        className="w-full h-full drop-shadow-[0_8px_16px_rgba(214,51,108,0.18)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id={clipId}>
            <path d="M100 48 C100 32, 68 22, 46 38 C24 54, 26 86, 48 112 C68 135, 92 152, 100 160 C108 152, 132 135, 152 112 C174 86, 176 54, 154 38 C132 22, 100 32, 100 48 Z" />
          </clipPath>
        </defs>

        {/* Lace Doily Scallops */}
        <g>
          {scallops.map(([cx, cy], idx) => (
            <g key={idx}>
              <circle
                cx={cx}
                cy={cy}
                r="14"
                fill="#FFF3DC"
                stroke="#F8C8D8"
                strokeWidth="2.5"
              />
              <circle cx={cx} cy={cy} r="9" fill="none" stroke="#D6336C" strokeWidth="1" strokeDasharray="2 2" opacity="0.55" />
              <circle cx={cx} cy={cy} r="2.2" fill="#FDEBF1" stroke="#D6336C" strokeWidth="1" opacity="0.65" />
            </g>
          ))}
        </g>

        {/* Cream Heart Base */}
        <path
          d="M100 42 C100 24, 64 14, 40 32 C16 50, 18 86, 42 115 C64 140, 90 159, 100 168 C110 159, 136 140, 158 115 C182 86, 184 50, 160 32 C136 14, 100 24, 100 42 Z"
          fill="#FFF3DC"
          stroke="#5A2A2A"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Clipped Photo Inside Heart */}
        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width="200" height="195" fill="#F8C8D8" />
          {!imgFailed ? (
            <image
              href={optimizedUrl}
              x="18"
              y="18"
              width="164"
              height="160"
              preserveAspectRatio="xMidYMid slice"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <g>
              <rect x="18" y="18" width="164" height="160" fill="#FDEBF1" />
              <path
                d="M100 85 C100 72, 80 65, 80 80 C80 94, 100 104, 100 112 C100 104, 120 94, 120 80 C120 65, 100 72, 100 85 Z"
                fill="#D6336C"
              />
            </g>
          )}
        </g>

        {/* Inner Stitched Lace Rim */}
        <path
          d="M100 48 C100 32, 68 22, 46 38 C24 54, 26 86, 48 112 C68 135, 92 152, 100 160 C108 152, 132 135, 152 112 C174 86, 176 54, 154 38 C132 22, 100 32, 100 48 Z"
          fill="none"
          stroke="#D6336C"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M100 52 C100 37, 70 28, 50 42 C30 57, 32 85, 52 109 C70 130, 92 146, 100 154 C108 146, 130 130, 148 109 C168 85, 170 57, 150 42 C130 28, 100 37, 100 52 Z"
          fill="none"
          stroke="#FFF3DC"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
      </svg>
      <span className="sr-only">{alt}</span>
    </div>
  );
}

/**
 * 4. Gift Box Illustration (Light blue box #A9D6F0, pink ribbon and bow)
 */
export function GiftBoxIllustration({
  className = 'w-36 h-36',
  badgeNumber,
}: IllustrationProps & { badgeNumber?: number }) {
  const { appConfig } = useAppConfig();
  return (
    <ReplaceableSticker src={appConfig.illustrations.giftBox} alt={`Gift Box ${badgeNumber ?? ''}`} className={className}>
      <svg
        viewBox="0 0 180 185"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`select-none drop-shadow-[0_6px_0_rgba(255,255,255,0.95)] ${className}`}
        aria-hidden="true"
      >
        {/* Sticker white halo */}
        <g stroke="#FFFFFF" strokeWidth="10" strokeLinejoin="round" strokeLinecap="round">
          <rect x="30" y="74" width="120" height="92" rx="12" />
          <rect x="22" y="52" width="136" height="28" rx="9" />
          <path d="M84 50 C52 14, 28 28, 38 52 C46 66, 70 56, 84 52 Z" />
          <path d="M96 50 C128 14, 152 28, 142 52 C134 66, 110 56, 96 52 Z" />
        </g>

        {/* Ground soft shadow */}
        <ellipse cx="90" cy="172" rx="62" ry="8" fill="#D6336C" opacity="0.14" />

        {/* Box Body (Soft Blue #A9D6F0) */}
        <rect
          x="30"
          y="74"
          width="120"
          height="92"
          rx="12"
          fill="#A9D6F0"
          stroke="#5A2A2A"
          strokeWidth="3.5"
        />
        {/* Subtle highlight on box body */}
        <path d="M42 86 L42 152" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.65" />

        {/* Vertical Pink Ribbon on Box Body */}
        <rect
          x="76"
          y="74"
          width="28"
          height="92"
          fill="#F8C8D8"
          stroke="#5A2A2A"
          strokeWidth="3.5"
        />
        {/* Horizontal Pink Ribbon on Box Body */}
        <rect
          x="30"
          y="108"
          width="120"
          height="24"
          fill="#F8C8D8"
          stroke="#5A2A2A"
          strokeWidth="3.5"
        />
        {/* Ribbon intersection square */}
        <rect
          x="76"
          y="108"
          width="28"
          height="24"
          fill="#F4A5C2"
          stroke="#5A2A2A"
          strokeWidth="3.5"
        />

        {/* Box Lid (Soft Blue #A9D6F0) */}
        <rect
          x="22"
          y="52"
          width="136"
          height="28"
          rx="9"
          fill="#A9D6F0"
          stroke="#5A2A2A"
          strokeWidth="3.5"
        />
        {/* Lid highlight */}
        <path d="M34 60 L66 60" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" opacity="0.75" />

        {/* Lid Vertical Ribbon */}
        <rect
          x="74"
          y="52"
          width="32"
          height="28"
          fill="#F8C8D8"
          stroke="#5A2A2A"
          strokeWidth="3.5"
        />

        {/* Big Pink Top Bow */}
        <path
          d="M84 50 C52 14, 26 26, 38 52 C44 64, 70 56, 84 52 Z"
          fill="#F8C8D8"
          stroke="#5A2A2A"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path
          d="M96 50 C128 14, 154 26, 142 52 C136 64, 110 56, 96 52 Z"
          fill="#F8C8D8"
          stroke="#5A2A2A"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path d="M72 44 C60 36, 50 39, 48 45" stroke="#D6336C" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M108 44 C120 36, 130 39, 132 45" stroke="#D6336C" strokeWidth="2.5" strokeLinecap="round" />
        {/* Bow tails on lid */}
        <path
          d="M82 54 L62 72 L73 73 L86 58 Z"
          fill="#D6336C"
          stroke="#5A2A2A"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        <path
          d="M98 54 L118 72 L107 73 L94 58 Z"
          fill="#D6336C"
          stroke="#5A2A2A"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        {/* Bow center knot */}
        <ellipse
          cx="90"
          cy="50"
          rx="11"
          ry="10"
          fill="#D6336C"
          stroke="#5A2A2A"
          strokeWidth="3.5"
        />

        {/* Gift Tag with Number */}
        {badgeNumber !== undefined && (
          <g>
            <circle
              cx="132"
              cy="142"
              r="14"
              fill="#FFF3DC"
              stroke="#5A2A2A"
              strokeWidth="3"
            />
            <text
              x="132"
              y="147"
              textAnchor="middle"
              fill="#D6336C"
              fontSize="15"
              fontWeight="700"
              fontFamily="Fredoka, sans-serif"
            >
              {badgeNumber}
            </text>
          </g>
        )}
      </svg>
    </ReplaceableSticker>
  );
}

/**
 * 5. Lace Trim Corner (Top-left corner of Gift 1 - Tulips)
 */
export function LaceCornerIllustration({ className = 'w-40 h-40' }: IllustrationProps) {
  const { appConfig } = useAppConfig();
  return (
    <ReplaceableSticker src={appConfig.illustrations.laceBorder} alt="Lace trim corner" className={className}>
      <svg
        viewBox="0 0 180 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`select-none ${className}`}
        aria-hidden="true"
      >
        {/* Soft cream lace quadrant */}
        <path
          d="M0 0 L160 0 C150 45, 130 85, 95 115 C65 142, 35 155, 0 160 Z"
          fill="#FFF3DC"
          stroke="#F8C8D8"
          strokeWidth="3"
        />
        {/* Scalloped lace edge loops along the arc */}
        {[
          [154, 18], [146, 44], [133, 69], [116, 92],
          [95, 113], [71, 131], [45, 145], [18, 154],
        ].map(([cx, cy], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r="16" fill="#FFF3DC" stroke="#D6336C" strokeWidth="2" />
            <circle cx={cx} cy={cy} r="9" fill="none" stroke="#D6336C" strokeWidth="1.2" strokeDasharray="3 3" />
            <circle cx={cx} cy={cy} r="3" fill="#F8C8D8" />
          </g>
        ))}
        {/* Inner eyelet lace pattern */}
        <path
          d="M0 128 C55 122, 112 72, 128 0"
          stroke="#D6336C"
          strokeWidth="2"
          strokeDasharray="5 5"
          opacity="0.7"
        />
        <path
          d="M0 92 C40 88, 82 52, 92 0"
          stroke="#F8C8D8"
          strokeWidth="2.5"
        />
        {/* Little ribbon bow pinned on the lace */}
        <circle cx="52" cy="52" r="7" fill="#D6336C" />
        <path d="M46 50 C34 40, 28 52, 40 58 Z" fill="#F8C8D8" stroke="#D6336C" strokeWidth="2" />
        <path d="M58 50 C70 40, 76 52, 64 58 Z" fill="#F8C8D8" stroke="#D6336C" strokeWidth="2" />
      </svg>
    </ReplaceableSticker>
  );
}

/**
 * 6. Pink Tulip Bouquet wrapped in Kraft Paper with Pink Ribbon inside a Wavy Scalloped Frame
 */
export function TulipBouquetIllustration({ className = 'w-64 h-72' }: IllustrationProps) {
  const { appConfig } = useAppConfig();
  // 16 scallops around the oval perimeter
  const frameScallops = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2;
    const cx = 140 + Math.cos(angle) * 104;
    const cy = 155 + Math.sin(angle) * 120;
    return [cx, cy];
  });

  return (
    <ReplaceableSticker src={appConfig.illustrations.tulipBouquet} alt="Pink tulip bouquet in scalloped frame" className={className}>
      <svg
        viewBox="0 0 280 310"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`select-none drop-shadow-[0_10px_20px_rgba(214,51,108,0.16)] ${className}`}
        aria-hidden="true"
      >
        {/* Wavy Scalloped Outer Frame */}
        <g>
          {frameScallops.map(([cx, cy], idx) => (
            <circle
              key={idx}
              cx={cx}
              cy={cy}
              r="24"
              fill="#FFF3DC"
              stroke="#F8C8D8"
              strokeWidth="3"
            />
          ))}
          <ellipse
            cx="140"
            cy="155"
            rx="104"
            ry="120"
            fill="#FFF3DC"
            stroke="#D6336C"
            strokeWidth="2.5"
            strokeDasharray="6 5"
          />
          <ellipse
            cx="140"
            cy="155"
            rx="94"
            ry="110"
            fill="#FDEBF1"
            stroke="#F8C8D8"
            strokeWidth="2"
          />
        </g>

        {/* Back Kraft Paper Cone Wrap */}
        <path
          d="M78 138 L140 96 L202 138 L168 242 L112 242 Z"
          fill="#E6C29F"
          stroke="#5A2A2A"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Inner tissue paper frill */}
        <path
          d="M84 136 Q98 118 114 130 Q128 112 142 128 Q158 112 172 130 Q186 118 196 136 L180 165 L100 165 Z"
          fill="#FFFFFF"
          stroke="#F8C8D8"
          strokeWidth="2.5"
        />

        {/* Green Tulip Stems & Leaves */}
        <g stroke="#5A2A2A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M102 156 C88 126, 98 102, 114 138 Z" fill="#7BC47F" />
          <path d="M178 156 C192 126, 182 102, 166 138 Z" fill="#7BC47F" />
          <path d="M140 155 L140 86" stroke="#5B9E5F" strokeWidth="4.5" />
          <path d="M124 155 L106 96" stroke="#5B9E5F" strokeWidth="4.5" />
          <path d="M156 155 L174 96" stroke="#5B9E5F" strokeWidth="4.5" />
          <path d="M132 155 L122 114" stroke="#5B9E5F" strokeWidth="4" />
          <path d="M148 155 L158 114" stroke="#5B9E5F" strokeWidth="4" />
        </g>

        {/* 5 Lush Pink Tulip Blooms */}
        {/* Top Center Tulip */}
        <g>
          <path
            d="M124 78 C124 52, 140 46, 140 62 C140 46, 156 52, 156 78 C156 94, 124 94, 124 78 Z"
            fill="#D6336C"
            stroke="#5A2A2A"
            strokeWidth="3"
          />
          <path
            d="M124 74 C124 58, 135 58, 140 72 C145 58, 156 58, 156 74 C156 92, 124 92, 124 74 Z"
            fill="#F8C8D8"
            stroke="#5A2A2A"
            strokeWidth="2.8"
          />
        </g>

        {/* Left Outer Tulip */}
        <g transform="rotate(-18 102 90)">
          <path
            d="M87 90 C87 66, 102 60, 102 74 C102 60, 117 66, 117 90 C117 105, 87 105, 87 90 Z"
            fill="#D6336C"
            stroke="#5A2A2A"
            strokeWidth="3"
          />
          <path
            d="M87 86 C87 72, 97 72, 102 84 C107 72, 117 72, 117 86 C117 103, 87 103, 87 86 Z"
            fill="#F4A5C2"
            stroke="#5A2A2A"
            strokeWidth="2.8"
          />
        </g>

        {/* Right Outer Tulip */}
        <g transform="rotate(18 178 90)">
          <path
            d="M163 90 C163 66, 178 60, 178 74 C178 60, 193 66, 193 90 C193 105, 163 105, 163 90 Z"
            fill="#D6336C"
            stroke="#5A2A2A"
            strokeWidth="3"
          />
          <path
            d="M163 86 C163 72, 173 72, 178 84 C183 72, 193 72, 193 86 C193 103, 163 103, 163 86 Z"
            fill="#F4A5C2"
            stroke="#5A2A2A"
            strokeWidth="2.8"
          />
        </g>

        {/* Left Inner Tulip */}
        <g transform="rotate(-8 122 108)">
          <path
            d="M108 108 C108 86, 122 80, 122 94 C122 80, 136 86, 136 108 C136 122, 108 122, 108 108 Z"
            fill="#F8C8D8"
            stroke="#5A2A2A"
            strokeWidth="3"
          />
          <path d="M115 96 C118 104, 126 104, 129 96" stroke="#D6336C" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Right Inner Tulip */}
        <g transform="rotate(8 158 108)">
          <path
            d="M144 108 C144 86, 158 80, 158 94 C158 80, 172 86, 172 108 C172 122, 144 122, 144 108 Z"
            fill="#F8C8D8"
            stroke="#5A2A2A"
            strokeWidth="3"
          />
          <path d="M151 96 C154 104, 162 104, 165 96" stroke="#D6336C" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Front Overlapping Kraft Paper Wrap */}
        <path
          d="M78 138 L140 176 L168 242 L112 242 Z"
          fill="#F0D2B2"
          stroke="#5A2A2A"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M202 138 L140 176 L112 242 L168 242 Z"
          fill="#E3BC96"
          stroke="#5A2A2A"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Bottom kraft paper cuff */}
        <path
          d="M118 242 L162 242 L154 264 L126 264 Z"
          fill="#E6C29F"
          stroke="#5A2A2A"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Pink Ribbon Bow Tied Around Bouquet Waist */}
        <rect
          x="109"
          y="204"
          width="62"
          height="14"
          rx="5"
          fill="#F8C8D8"
          stroke="#5A2A2A"
          strokeWidth="3"
        />
        <path
          d="M135 208 C112 186, 94 198, 104 216 C110 226, 126 218, 135 212 Z"
          fill="#D6336C"
          stroke="#5A2A2A"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M145 208 C168 186, 186 198, 176 216 C170 226, 154 218, 145 212 Z"
          fill="#D6336C"
          stroke="#5A2A2A"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M136 214 L120 248 L131 246 L140 218 Z"
          fill="#F8C8D8"
          stroke="#5A2A2A"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        <path
          d="M144 214 L160 248 L149 246 L140 218 Z"
          fill="#F8C8D8"
          stroke="#5A2A2A"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        <circle cx="140" cy="211" r="7.5" fill="#FFF3DC" stroke="#5A2A2A" strokeWidth="3" />
      </svg>
    </ReplaceableSticker>
  );
}

/**
 * 7. Large Black Vinyl Record with Grooves and Pink Center Label
 */
export function VinylIllustration({
  isPlaying,
  className = 'w-64 h-64',
}: IllustrationProps & { isPlaying: boolean }) {
  const { appConfig } = useAppConfig();
  return (
    <div
      className={`vinyl-record-spin select-none ${className}`}
      style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
    >
      <ReplaceableSticker src={appConfig.illustrations.vinyl} alt="Spinning vinyl record" className="w-full h-full">
        <svg
          viewBox="0 0 300 300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_14px_28px_rgba(17,17,17,0.32)]"
          aria-hidden="true"
        >
          {/* Outer Sticker Rim */}
          <circle cx="150" cy="150" r="144" fill="#111111" stroke="#FFF3DC" strokeWidth="6" />
          <circle cx="150" cy="150" r="141" fill="#111111" stroke="#5A2A2A" strokeWidth="2" />

          {/* Vinyl Shiny Sheen Sectors */}
          <path
            d="M150 150 L55 45 A140 140 0 0 1 115 14 Z"
            fill="#FFFFFF"
            opacity="0.08"
          />
          <path
            d="M150 150 L245 255 A140 140 0 0 1 185 286 Z"
            fill="#FFFFFF"
            opacity="0.08"
          />

          {/* Concentric Vinyl Grooves */}
          <circle cx="150" cy="150" r="128" stroke="#2B2B2B" strokeWidth="1.5" />
          <circle cx="150" cy="150" r="116" stroke="#242424" strokeWidth="1.5" strokeDasharray="40 12" />
          <circle cx="150" cy="150" r="104" stroke="#2E2E2E" strokeWidth="1.5" />
          <circle cx="150" cy="150" r="92" stroke="#242424" strokeWidth="1.5" strokeDasharray="65 18" />
          <circle cx="150" cy="150" r="80" stroke="#2B2B2B" strokeWidth="1.5" />
          <circle cx="150" cy="150" r="68" stroke="#333333" strokeWidth="1.5" />

          {/* Pink Center Label */}
          <circle
            cx="150"
            cy="150"
            r="52"
            fill="#F8C8D8"
            stroke="#FFF3DC"
            strokeWidth="3"
          />
          <circle
            cx="150"
            cy="150"
            r="43"
            fill="none"
            stroke="#D6336C"
            strokeWidth="1.8"
            strokeDasharray="5 4"
          />

          {/* Little Heart & Curved Text Details on Label */}
          <path
            d="M150 116 C150 110, 141 107, 141 114 C141 120, 150 124, 150 127 C150 124, 159 120, 159 114 C159 107, 150 110, 150 116 Z"
            fill="#D6336C"
          />
          <path
            d="M126 174 Q150 184 174 174"
            stroke="#D6336C"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Center Spindle Hole */}
          <circle cx="150" cy="150" r="10" fill="#FFF3DC" stroke="#111111" strokeWidth="3" />
        </svg>
      </ReplaceableSticker>
    </div>
  );
}

/**
 * 8. Hand-drawn Black Music-Note Swirl Lines (Gift 2 - Top-Right & Bottom-Left)
 */
export function MusicSwirlIllustration({
  variant = 'top-right',
  className = 'w-48 h-28',
}: IllustrationProps & { variant?: 'top-right' | 'bottom-left' }) {
  return (
    <svg
      viewBox="0 0 240 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none pointer-events-none ${
        variant === 'bottom-left' ? 'rotate-180' : ''
      } ${className}`}
      aria-hidden="true"
    >
      {/* Hand-drawn swirl staff lines */}
      <path
        d="M12 98 C58 112, 82 32, 134 52 C178 68, 192 22, 232 14"
        stroke="#111111"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M26 112 C72 122, 96 46, 146 66 C188 82, 202 38, 236 28"
        stroke="#111111"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="6 5"
      />
      {/* Beamed eighth notes */}
      <g fill="#111111" stroke="#111111" strokeWidth="2">
        <ellipse cx="68" cy="76" rx="6" ry="4.5" transform="rotate(-20 68 76)" />
        <ellipse cx="90" cy="70" rx="6" ry="4.5" transform="rotate(-20 90 70)" />
        <path d="M73 74 L73 46 L95 40 L95 68" fill="none" strokeWidth="2.4" strokeLinejoin="round" />
      </g>
      {/* Single eighth note */}
      <g fill="#111111" stroke="#111111" strokeWidth="2">
        <ellipse cx="164" cy="48" rx="6" ry="4.5" transform="rotate(-20 164 48)" />
        <path d="M169 46 L169 18 C177 21, 182 28, 180 35" fill="none" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      {/* Small Treble Heart Accent */}
      <path
        d="M124 28 C124 22, 115 19, 115 26 C115 31, 124 35, 124 38 C124 35, 133 31, 133 26 C133 19, 124 22, 124 28 Z"
        fill="#D6336C"
      />
    </svg>
  );
}

/**
 * 9. Cute Calico Cat Hugging a Red Heart (Gift 3 - Bottom-Left)
 */
export function CalicoCatIllustration({ className = 'w-36 h-36' }: IllustrationProps) {
  const { appConfig } = useAppConfig();
  return (
    <ReplaceableSticker src={appConfig.illustrations.cat} alt="Calico cat hugging a heart" className={className}>
      <svg
        viewBox="0 0 180 185"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`select-none drop-shadow-[0_6px_0_rgba(255,255,255,0.95)] ${className}`}
        aria-hidden="true"
      >
        {/* Tail curling on the right */}
        <path
          d="M128 148 C156 146, 164 114, 146 106 C134 102, 132 118, 142 124"
          stroke="#5A2A2A"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M128 148 C156 146, 164 114, 146 106 C134 102, 132 118, 142 124"
          stroke="#F2A65A"
          strokeWidth="7"
          strokeLinecap="round"
        />

        {/* Cat Body (Cream #FFF3DC) */}
        <ellipse
          cx="90"
          cy="126"
          rx="44"
          ry="40"
          fill="#FFF3DC"
          stroke="#5A2A2A"
          strokeWidth="3.5"
        />
        {/* Calico Patch on Body */}
        <path
          d="M118 98 C132 108, 136 128, 124 144 C112 134, 108 114, 118 98 Z"
          fill="#F2A65A"
        />

        {/* Cat Head */}
        <circle
          cx="90"
          cy="72"
          r="38"
          fill="#FFF3DC"
          stroke="#5A2A2A"
          strokeWidth="3.5"
        />

        {/* Left Ear (Dark Brown Calico Patch) */}
        <path
          d="M56 54 L48 22 L78 38 Z"
          fill="#6E473B"
          stroke="#5A2A2A"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path d="M58 48 L53 30 L72 40 Z" fill="#F8C8D8" />

        {/* Right Ear (Orange Calico Patch) */}
        <path
          d="M124 54 L132 22 L102 38 Z"
          fill="#F2A65A"
          stroke="#5A2A2A"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path d="M122 48 L127 30 L108 40 Z" fill="#F8C8D8" />

        {/* Forehead Calico Spots */}
        <path
          d="M55 56 C64 40, 82 40, 76 58 C70 68, 54 66, 55 56 Z"
          fill="#6E473B"
        />
        <path
          d="M104 42 C116 42, 126 52, 122 64 C112 64, 102 54, 104 42 Z"
          fill="#F2A65A"
        />

        {/* Happy Closed Arc Eyes */}
        <path d="M68 72 Q75 64 82 72" stroke="#5A2A2A" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M98 72 Q105 64 112 72" stroke="#5A2A2A" strokeWidth="3.2" strokeLinecap="round" />

        {/* Rosy Cheeks */}
        <ellipse cx="63" cy="80" rx="6.5" ry="4" fill="#F8C8D8" />
        <ellipse cx="117" cy="80" rx="6.5" ry="4" fill="#F8C8D8" />

        {/* Cute Pink Nose & Mouth */}
        <polygon points="87,77 93,77 90,81" fill="#D6336C" />
        <path d="M84 84 Q90 89 90 82 Q90 89 96 84" stroke="#5A2A2A" strokeWidth="2.5" strokeLinecap="round" />

        {/* Whiskers */}
        <path d="M42 74 L54 76 M40 82 L54 82" stroke="#5A2A2A" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M138 74 L126 76 M140 82 L126 82" stroke="#5A2A2A" strokeWidth="2.2" strokeLinecap="round" />

        {/* Big Red/Raspberry Heart Hugged in Center */}
        <path
          d="M90 112 C90 94, 58 86, 58 110 C58 130, 90 146, 90 156 C90 146, 122 130, 122 110 C122 86, 90 94, 90 112 Z"
          fill="#D6336C"
          stroke="#5A2A2A"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <ellipse cx="74" cy="108" rx="4" ry="7" transform="rotate(-25 74 108)" fill="#FFF3DC" opacity="0.65" />

        {/* Paws Hugging the Heart */}
        <ellipse
          cx="64"
          cy="118"
          rx="13"
          ry="9"
          transform="rotate(20 64 118)"
          fill="#FFF3DC"
          stroke="#5A2A2A"
          strokeWidth="3.2"
        />
        <ellipse
          cx="116"
          cy="118"
          rx="13"
          ry="9"
          transform="rotate(-20 116 118)"
          fill="#FFF3DC"
          stroke="#5A2A2A"
          strokeWidth="3.2"
        />

        {/* Little Bottom Feet */}
        <ellipse cx="70" cy="164" rx="12" ry="7" fill="#FFF3DC" stroke="#5A2A2A" strokeWidth="3.2" />
        <ellipse cx="110" cy="164" rx="12" ry="7" fill="#FFF3DC" stroke="#5A2A2A" strokeWidth="3.2" />
      </svg>
    </ReplaceableSticker>
  );
}

/**
 * 10. Vertical Branch of Pink Cherry Blossoms (Gift 3 - Right Edge)
 */
export function CherryBlossomsIllustration({ className = 'w-32 h-96' }: IllustrationProps) {
  const { appConfig } = useAppConfig();
  // Helper for a 5-petal cherry blossom flower at (cx, cy)
  const renderBlossom = (cx: number, cy: number, scale = 1, key: number) => (
    <g key={key} transform={`translate(${cx}, ${cy}) scale(${scale})`}>
      {[0, 72, 144, 216, 288].map((deg) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <path
            d="M0 0 C-10 -12, -12 -26, -3 -28 C0 -25, 0 -25, 3 -28 C12 -26, 10 -12, 0 0 Z"
            fill="#F8C8D8"
            stroke="#5A2A2A"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </g>
      ))}
      <circle cx="0" cy="0" r="5" fill="#D6336C" />
      <circle cx="-2" cy="-2" r="1.5" fill="#FFF3DC" />
      <circle cx="2" cy="-2" r="1.5" fill="#FFF3DC" />
      <circle cx="0" cy="2" r="1.5" fill="#FFF3DC" />
    </g>
  );

  return (
    <ReplaceableSticker src={appConfig.illustrations.blossoms} alt="Pink cherry blossom branch" className={className}>
      <svg
        viewBox="0 0 150 420"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`select-none drop-shadow-[0_4px_8px_rgba(214,51,108,0.14)] ${className}`}
        aria-hidden="true"
      >
        {/* Main Woody Branch Entering from Right Edge */}
        <path
          d="M148 16 C112 58, 92 118, 106 184 C118 242, 84 310, 114 388"
          stroke="#5A2A2A"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Sub-twigs */}
        <path
          d="M104 86 C76 96, 56 82, 42 66"
          stroke="#5A2A2A"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M104 176 C72 192, 54 218, 44 242"
          stroke="#5A2A2A"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M98 292 C72 288, 54 304, 42 324"
          stroke="#5A2A2A"
          strokeWidth="4.5"
          strokeLinecap="round"
        />

        {/* Small Green Leaf Buds */}
        <path d="M78 88 C68 74, 82 64, 90 80 Z" fill="#88C98C" stroke="#5A2A2A" strokeWidth="2" />
        <path d="M74 196 C62 184, 74 172, 84 188 Z" fill="#88C98C" stroke="#5A2A2A" strokeWidth="2" />
        <path d="M78 292 C66 280, 78 268, 88 284 Z" fill="#88C98C" stroke="#5A2A2A" strokeWidth="2" />

        {/* Cherry Blossom Clusters */}
        {renderBlossom(48, 66, 0.95, 1)}
        {renderBlossom(112, 92, 0.8, 2)}
        {renderBlossom(96, 152, 1.05, 3)}
        {renderBlossom(48, 236, 0.9, 4)}
        {renderBlossom(108, 256, 0.85, 5)}
        {renderBlossom(48, 322, 0.95, 6)}
        {renderBlossom(108, 358, 0.8, 7)}

        {/* Drifting Petals */}
        <path
          d="M28 142 C18 136, 22 124, 34 130 C40 134, 34 144, 28 142 Z"
          fill="#F8C8D8"
          stroke="#D6336C"
          strokeWidth="1.5"
        />
        <path
          d="M68 382 C58 376, 62 364, 74 370 C80 374, 74 384, 68 382 Z"
          fill="#F8C8D8"
          stroke="#D6336C"
          strokeWidth="1.5"
        />
      </svg>
    </ReplaceableSticker>
  );
}
