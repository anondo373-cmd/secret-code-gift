import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useAppConfig } from '../context/ConfigContext';
import {
  BowIllustration,
  LaceCornerIllustration,
  TulipBouquetIllustration,
} from './Illustrations';

interface TulipsGiftScreenProps {
  onNext: () => void;
}

export function TulipsGiftScreen({ onNext }: TulipsGiftScreenProps) {
  const { appConfig: config } = useAppConfig();
  const prefersReducedMotion = useReducedMotion();
  const leftNotes = config.tulipNotes.slice(0, 3);
  const rightNotes = config.tulipNotes.slice(3, 6);

  return (
    <div className="relative w-full min-h-dvh lg:h-dvh bg-watercolor-clouds overflow-y-auto lg:overflow-hidden flex flex-col justify-between px-4 py-5 sm:px-8 lg:px-12">
      {/* Lace Trim in Top-Left Corner */}
      <div className="pointer-events-none absolute top-0 left-0 z-0 opacity-75">
        <LaceCornerIllustration className="w-20 h-20 sm:w-36 sm:h-36 lg:w-44 lg:h-44" />
      </div>

      {/* Small Hearts & Ribbon Accents */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden="true">
        <span className="absolute top-16 left-44 text-[#D6336C]/60 text-xl select-none hidden sm:inline">♥</span>
        <span className="absolute bottom-14 left-12 text-[#D6336C]/50 text-2xl select-none hidden sm:inline">♥</span>
        <span className="absolute bottom-20 right-14 text-[#D6336C]/60 text-xl select-none hidden sm:inline">♥</span>
        <BowIllustration className="w-16 h-16 absolute bottom-4 left-6 -rotate-12 opacity-85 hidden sm:block" />
      </div>

      {/* Top Header Row: Centered Heading + Top-Right "Next →" Pill Button */}
      <div className="relative z-20 flex items-center justify-between gap-3 w-full max-w-6xl mx-auto pt-2 sm:pt-3">
        <div className="hidden sm:block sm:w-28 shrink-0" aria-hidden="true" />
        <h1 className="font-fredoka text-2xl sm:text-4xl lg:text-5xl font-bold text-[#D6336C] text-left sm:text-center drop-shadow-[0_3px_0_rgba(255,255,255,0.9)]">
          Your Favorite Tulips
        </h1>
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

      {/* Center Content: 3 Speech-Bubble Notes Left | Tulip Bouquet Center | 3 Speech-Bubble Notes Right */}
      <div className="relative z-20 flex-1 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 items-center gap-4 sm:gap-6 my-4">
        {/* Left 3 Speech-Bubble Notes */}
        <div className="lg:col-span-4 flex flex-col gap-3 sm:gap-5 items-center lg:items-end order-2 lg:order-1">
          {leftNotes.map((note, idx) => (
            <motion.div
              key={idx}
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.7, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: 0.15 + idx * 0.14,
                type: 'spring',
                stiffness: 260,
                damping: 20,
              }}
              className={`relative w-full max-w-[310px] rounded-3xl bg-[#FFF3DC] border-2 border-[#D6336C]/65 px-5 py-3.5 shadow-[0_5px_0_#F8C8D8] ${
                idx === 1 ? 'lg:mr-4' : ''
              }`}
            >
              <p className="font-script text-xl sm:text-2xl font-semibold text-[#5A2A2A] leading-snug text-center break-words">
                {note}
              </p>
              {/* Little speech bubble tail pointing toward the bouquet on desktop */}
              <span
                className="hidden lg:block absolute top-1/2 -right-2.5 -translate-y-1/2 w-4 h-4 bg-[#FFF3DC] border-t-2 border-r-2 border-[#D6336C]/65 rotate-45"
                aria-hidden="true"
              />
            </motion.div>
          ))}
        </div>

        {/* Center Tulip Bouquet in Scalloped Frame */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-4 flex items-center justify-center order-1 lg:order-2"
        >
          <TulipBouquetIllustration className="w-56 h-64 sm:w-68 sm:h-76 lg:w-76 lg:h-84" />
        </motion.div>

        {/* Right 3 Speech-Bubble Notes */}
        <div className="lg:col-span-4 flex flex-col gap-3 sm:gap-5 items-center lg:items-start order-3">
          {rightNotes.map((note, idx) => (
            <motion.div
              key={idx}
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.7, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: 0.55 + idx * 0.14,
                type: 'spring',
                stiffness: 260,
                damping: 20,
              }}
              className={`relative w-full max-w-[310px] rounded-3xl bg-[#FFF3DC] border-2 border-[#D6336C]/65 px-5 py-3.5 shadow-[0_5px_0_#F8C8D8] ${
                idx === 1 ? 'lg:ml-4' : ''
              }`}
            >
              <p className="font-script text-xl sm:text-2xl font-semibold text-[#5A2A2A] leading-snug text-center break-words">
                {note}
              </p>
              {/* Little speech bubble tail pointing toward the bouquet on desktop */}
              <span
                className="hidden lg:block absolute top-1/2 -left-2.5 -translate-y-1/2 w-4 h-4 bg-[#FFF3DC] border-b-2 border-l-2 border-[#D6336C]/65 rotate-45"
                aria-hidden="true"
              />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="h-2 shrink-0" aria-hidden="true" />
    </div>
  );
}
