import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { AlbumPhoto } from '../config';
import { useAppConfig } from '../context/ConfigContext';
import {
  BowIllustration,
  LaceCornerIllustration,
} from './Illustrations';
import { OptimizedImage } from './OptimizedImage';

interface PhotoAlbumGiftScreenProps {
  onNext: () => void;
}

const POLAROID_ROTATIONS = ['-2.5deg', '2deg', '-1.8deg', '2.5deg', '-2deg', '1.8deg'];
const TAPE_COLORS = ['#F8C8D8', '#A9D6F0', '#F8C8D8', '#A9D6F0', '#F8C8D8', '#A9D6F0'];

function PolaroidPhotoImage({ photo, className }: { photo: AlbumPhoto; className?: string }) {
  return (
    <OptimizedImage
      src={photo.url}
      alt={photo.caption}
      className={className}
      sizes="(max-width: 768px) 90vw, 360px"
    />
  );
}

export function PhotoAlbumGiftScreen({ onNext }: PhotoAlbumGiftScreenProps) {
  const { appConfig } = useAppConfig();
  const prefersReducedMotion = useReducedMotion();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const photos = appConfig.albumPhotos;

  const handlePrev = useCallback(() => {
    setSelectedIdx((prev) =>
      prev === null ? null : (prev - 1 + photos.length) % photos.length
    );
  }, [photos.length]);

  const handleNextPhoto = useCallback(() => {
    setSelectedIdx((prev) =>
      prev === null ? null : (prev + 1) % photos.length
    );
  }, [photos.length]);

  useEffect(() => {
    if (selectedIdx === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextPhoto();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedIdx(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleNextPhoto, handlePrev, selectedIdx]);

  return (
    <div className="relative w-full min-h-dvh bg-watercolor-clouds overflow-y-auto flex flex-col justify-between px-4 py-5 sm:px-8 lg:px-12">
      {/* Decorative Lace Corner & Bow */}
      <div className="pointer-events-none absolute top-0 left-0 z-0 opacity-75">
        <LaceCornerIllustration className="w-20 h-20 sm:w-32 sm:h-32" />
      </div>
      <div className="pointer-events-none absolute bottom-3 left-5 z-0 hidden sm:block">
        <BowIllustration className="w-16 h-16 -rotate-12 opacity-90" />
      </div>

      {/* Subtle Hearts */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden="true">
        <span className="absolute top-20 left-40 text-[#D6336C]/50 text-xl select-none hidden sm:inline">♥</span>
        <span className="absolute bottom-20 right-12 text-[#D6336C]/50 text-2xl select-none hidden sm:inline">♥</span>
      </div>

      {/* Header Row: Centered Title & Subtitle + Top-Right "Next →" Button */}
      <div className="relative z-20 flex items-center justify-between gap-3 w-full max-w-6xl mx-auto pt-1 sm:pt-2">
        <div className="hidden sm:block sm:w-28 shrink-0" aria-hidden="true" />
        <div className="text-left sm:text-center min-w-0">
          <h1 className="font-fredoka text-2xl sm:text-4xl lg:text-[44px] font-bold text-[#D6336C] leading-tight drop-shadow-[0_3px_0_rgba(255,255,255,0.9)]">
            Our Sweetest Moments
          </h1>
          <p className="font-script text-lg sm:text-2xl text-[#5A2A2A] font-semibold">
            Little snapshots of us to treasure forever 💗
          </p>
        </div>
        <div className="sm:w-28 shrink-0 flex justify-end">
          <button
            type="button"
            onClick={onNext}
            className="min-h-[40px] sm:min-h-[42px] px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-[#D6336C] text-[#FFF3DC] font-fredoka font-semibold text-sm sm:text-base shadow-[0_4px_0_#5A2A2A] hover:brightness-105 active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Polaroid Scrapbook Grid (3x2 on desktop/tablet, 1-2 cols on mobile) */}
      <div className="relative z-20 flex-1 w-full max-w-5xl mx-auto flex items-center justify-center my-3">
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-6 px-2 sm:px-4">
          {photos.map((photo, index) => {
            const rotation = POLAROID_ROTATIONS[index % POLAROID_ROTATIONS.length];
            const tapeColor = TAPE_COLORS[index % TAPE_COLORS.length];

            return (
              <motion.button
                key={index}
                type="button"
                initial={
                  prefersReducedMotion
                    ? false
                    : { opacity: 0, scale: 0.82, y: 18 }
                }
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  duration: 0.42,
                  delay: index * 0.1,
                  type: 'spring',
                  stiffness: 240,
                  damping: 20,
                }}
                whileHover={
                  prefersReducedMotion
                    ? undefined
                    : { scale: 1.04, rotate: 0, y: -4 }
                }
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedIdx(index)}
                style={{ rotate: prefersReducedMotion ? '0deg' : rotation }}
                className="group relative bg-[#FFF3DC] rounded-2xl p-3 pb-4 border-2 border-[#5A2A2A]/80 shadow-[0_8px_18px_rgba(90,42,42,0.14)] flex flex-col text-left cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-[#D6336C]/40 transition-shadow hover:shadow-[0_12px_24px_rgba(214,51,108,0.22)]"
              >
                {/* Pastel Washi Tape Strip at Top Center */}
                <div
                  style={{ backgroundColor: tapeColor }}
                  className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-5 rounded-sm border border-[#5A2A2A]/35 opacity-90 rotate-[-2deg] shadow-xs flex items-center justify-center z-20"
                  aria-hidden="true"
                >
                  <span className="text-[10px] text-[#D6336C] leading-none">♥</span>
                </div>

                {/* Photo Frame Window - Full-size uncropped display */}
                <div className="w-full h-52 sm:h-56 lg:h-48 rounded-xl overflow-hidden bg-[#FDEBF1] border border-[#F8C8D8] mb-2.5">
                  <PolaroidPhotoImage
                    photo={photo}
                    className="group-hover:scale-[1.02] transition-transform duration-300"
                  />
                </div>

                {/* Handwritten Caption & Date */}
                <p className="font-patrick text-base sm:text-lg text-[#5A2A2A] leading-snug line-clamp-2 break-words font-medium">
                  {photo.caption}
                </p>
                <span className="font-fredoka text-[11px] text-[#D6336C]/85 mt-0.5">
                  {photo.date}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Bottom Helper Caption */}
      <div className="relative z-20 text-center pb-1">
        <span className="font-fredoka text-xs sm:text-sm text-[#5A2A2A]/70">
          Tap any polaroid to view memory up close 💗
        </span>
      </div>

      {/* Lightbox Modal when a Polaroid is tapped */}
      <AnimatePresence>
        {selectedIdx !== null && photos[selectedIdx] && (
          <motion.div
            key="polaroid-lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSelectedIdx(null)}
            className="fixed inset-0 z-50 bg-[#5A2A2A]/60 backdrop-blur-xs flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Memory photo viewer"
          >
            <motion.div
              initial={prefersReducedMotion ? false : { scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={prefersReducedMotion ? undefined : { scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-[#FFF3DC] rounded-3xl p-4 sm:p-6 border-3 border-[#5A2A2A] shadow-[0_20px_50px_rgba(90,42,42,0.35)]"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedIdx(null)}
                aria-label="Close photo viewer"
                className="absolute -top-3.5 -right-3.5 w-10 h-10 rounded-full bg-[#D6336C] text-[#FFF3DC] border-2 border-[#5A2A2A] shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer z-20"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Full-Size Uncropped Photo */}
              <div className="w-full h-[52vh] sm:h-[60vh] max-h-[520px] rounded-2xl overflow-hidden bg-[#FDEBF1] border-2 border-[#F8C8D8] mb-4">
                <PolaroidPhotoImage photo={photos[selectedIdx]} />
              </div>

              {/* Caption & Metadata */}
              <div className="text-center px-2">
                <p className="font-patrick text-xl sm:text-2xl text-[#5A2A2A] leading-snug mb-1">
                  {photos[selectedIdx].caption}
                </p>
                <p className="font-fredoka text-xs sm:text-sm text-[#D6336C] font-semibold">
                  {photos[selectedIdx].date} · {selectedIdx + 1} of {photos.length}
                </p>
              </div>

              {/* Prev / Next Controls */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#F8C8D8]">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="min-h-[40px] px-4 py-1.5 rounded-full bg-[#FDEBF1] border border-[#F8C8D8] text-[#5A2A2A] font-fredoka text-sm font-semibold flex items-center gap-1 hover:bg-[#F8C8D8]/60 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>
                <button
                  type="button"
                  onClick={handleNextPhoto}
                  className="min-h-[40px] px-4 py-1.5 rounded-full bg-[#FDEBF1] border border-[#F8C8D8] text-[#5A2A2A] font-fredoka text-sm font-semibold flex items-center gap-1 hover:bg-[#F8C8D8]/60 transition-colors cursor-pointer"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
