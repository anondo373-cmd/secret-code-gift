import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useAppConfig } from '../context/ConfigContext';
import {
  CalicoCatIllustration,
  CherryBlossomsIllustration,
} from './Illustrations';

interface LetterGiftScreenProps {
  onNext: () => void;
}

export function LetterGiftScreen({ onNext }: LetterGiftScreenProps) {
  const { appConfig: config } = useAppConfig();
  const fullText = config.letterText;
  const prefersReducedMotion = useReducedMotion();
  const [charCount, setCharCount] = useState<number>(prefersReducedMotion ? fullText.length : 0);

  const isFinishedTyping = charCount >= fullText.length;

  useEffect(() => {
    if (prefersReducedMotion || isFinishedTyping) return;

    const timer = setInterval(() => {
      setCharCount((prev) => {
        if (prev >= fullText.length) {
          clearInterval(timer);
          return fullText.length;
        }
        return prev + 2;
      });
    }, 28);

    return () => clearInterval(timer);
  }, [fullText.length, isFinishedTyping, prefersReducedMotion]);

  const handleSkipTypewriter = () => {
    if (!isFinishedTyping) {
      setCharCount(fullText.length);
    }
  };

  return (
    <div className="relative w-full min-h-dvh lg:h-dvh bg-watercolor-clouds overflow-y-auto lg:overflow-hidden flex flex-col justify-between px-4 py-6 sm:px-10 lg:px-14">

      {/* Right Edge: Vertical Branch of Pink Cherry Blossoms Swaying Lightly */}
      <motion.div
        animate={
          prefersReducedMotion
            ? undefined
            : { rotate: [-1.5, 2, -1.5] }
        }
        transition={{
          duration: 4.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{ transformOrigin: 'top right' }}
        className="pointer-events-none absolute top-4 right-0 z-0 opacity-70 hidden sm:block"
      >
        <CherryBlossomsIllustration className="w-24 h-72 sm:w-28 sm:h-88 lg:w-36 lg:h-[430px]" />
      </motion.div>

      {/* Top-Left Heading: "A Letter From My Heart" (Fredoka, raspberry) */}
      <div className="relative z-20 w-full max-w-6xl mx-auto pt-1 sm:pr-24">
        <h1 className="font-fredoka text-2xl sm:text-4xl lg:text-5xl font-bold text-[#D6336C] drop-shadow-[0_3px_0_rgba(255,255,255,0.9)]">
          A Letter From My Heart
        </h1>
      </div>

      {/* Center: Lined Notebook Paper with Torn Top Edge & Typewriter Effect */}
      <div className="relative z-20 flex-1 w-full max-w-3xl mx-auto flex items-center justify-center my-4">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          onClick={handleSkipTypewriter}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleSkipTypewriter();
            }
          }}
          aria-label="Letter paper. Tap to reveal full letter immediately."
          className="relative w-full rounded-b-2xl shadow-[0_14px_32px_rgba(90,42,42,0.14)] cursor-pointer select-none overflow-hidden border-x border-b border-[#F8C8D8]"
        >
          {/* Torn Top Edge SVG Strip */}
          <div className="w-full h-4 bg-transparent overflow-hidden">
            <svg
              viewBox="0 0 600 18"
              preserveAspectRatio="none"
              className="w-full h-full block"
              aria-hidden="true"
            >
              <path
                d="M0 18 L0 8 L15 2 L30 10 L45 3 L60 11 L75 2 L90 9 L105 3 L120 11 L135 4 L150 10 L165 2 L180 11 L195 3 L210 9 L225 2 L240 10 L255 4 L270 11 L285 2 L300 9 L315 3 L330 11 L345 2 L360 10 L375 3 L390 11 L405 4 L420 10 L435 2 L450 9 L465 3 L480 11 L495 2 L510 10 L525 4 L540 11 L555 3 L570 9 L585 2 L600 10 L600 18 Z"
                fill="#FFF3DC"
              />
            </svg>
          </div>

          {/* Lined Paper Body */}
          <div className="bg-notebook-paper pl-12 pr-6 sm:pl-16 sm:pr-12 pt-4 pb-7 min-h-[290px] sm:min-h-[340px] flex flex-col justify-between">
            <div className="font-patrick text-lg sm:text-xl lg:text-[22px] text-[#5A2A2A] leading-[32px] whitespace-pre-wrap break-words">
              {fullText.slice(0, charCount)}
              {!isFinishedTyping && (
                <span className="inline-block w-2 h-5 ml-0.5 bg-[#D6336C] animate-pulse align-middle" />
              )}
            </div>

            <div className="mt-6 flex items-center justify-between gap-2">
              <span className="font-fredoka text-xs text-[#5A2A2A]/50">
                {!isFinishedTyping ? 'Tap paper to skip typing' : ''}
              </span>
              {isFinishedTyping && (
                <motion.p
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-patrick text-xl sm:text-2xl text-[#D6336C] text-right font-bold break-words"
                >
                  {config.signOffText}
                </motion.p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Row: Calico Cat Hugging Heart (Bottom-Left) + "Next →" Pill Button (Bottom-Right) */}
      <div className="relative z-20 flex items-end justify-between w-full max-w-6xl mx-auto pt-1">
        <motion.div
          animate={
            prefersReducedMotion
              ? undefined
              : { y: [0, -7, 0] }
          }
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="mt-0 lg:-mt-8"
        >
          <CalicoCatIllustration className="w-24 h-24 sm:w-32 sm:h-32 lg:w-38 lg:h-38" />
        </motion.div>

        <button
          type="button"
          onClick={onNext}
          className="min-h-[44px] px-6 py-2 rounded-full bg-[#D6336C] text-[#FFF3DC] font-fredoka font-semibold text-sm sm:text-base shadow-[0_4px_0_#5A2A2A] hover:brightness-105 active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
