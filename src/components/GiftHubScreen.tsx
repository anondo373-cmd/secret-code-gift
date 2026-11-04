import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { GiftBoxIllustration, SparkleSticker } from './Illustrations';

interface GiftHubScreenProps {
  unlockedUpTo: number; // 1 = Gift 1 ready, 2 = Gift 2 ready, 3 = Gift 3 ready, 4 = Gift 4 ready, 5 = all 4 finished
  onOpenGift: (giftIndex: 1 | 2 | 3 | 4) => void;
  onReplay: () => void;
}

const GIFTS: Array<{ id: 1 | 2 | 3 | 4; label: string }> = [
  { id: 1, label: 'Surprise #1' },
  { id: 2, label: 'Surprise #2' },
  { id: 3, label: 'Surprise #3' },
  { id: 4, label: 'Surprise #4' },
];

export function GiftHubScreen({ unlockedUpTo, onOpenGift, onReplay }: GiftHubScreenProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="relative w-full min-h-dvh lg:h-dvh bg-watercolor-clouds overflow-y-auto lg:overflow-hidden flex flex-col items-center justify-center px-4 py-8 sm:px-8">
      {/* Subtle scattered sparkles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <SparkleSticker className="w-6 h-6 absolute top-10 left-12 opacity-75" />
        <SparkleSticker className="w-5 h-5 absolute top-16 right-16 opacity-75" />
        <SparkleSticker className="w-6 h-6 absolute bottom-12 left-20 opacity-75" />
        <SparkleSticker className="w-5 h-5 absolute bottom-14 right-24 opacity-75" />
      </div>

      {/* Centered Heading & Subtitle */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="text-center mb-8 sm:mb-12 z-10"
      >
        <h1 className="font-fredoka text-4xl sm:text-5xl lg:text-6xl font-bold text-[#D6336C] tracking-tight drop-shadow-[0_3px_0_rgba(255,255,255,0.9)] mb-2">
          You unlocked it
        </h1>
        <p className="font-fredoka text-lg sm:text-xl text-[#5A2A2A]/85 font-medium">
          Your surprises are waiting for you
        </p>
      </motion.div>

      {/* Four Illustrated Gift Boxes in a Row */}
      <div className="z-10 grid grid-cols-2 sm:flex sm:flex-row items-center justify-center gap-4 sm:gap-6 lg:gap-10 my-2">
        {GIFTS.map((gift, index) => {
          const isUnlocked = gift.id <= unlockedUpTo;
          const isOpened = gift.id < unlockedUpTo;

          return (
            <motion.div
              key={gift.id}
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.65 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.45,
                delay: index * 0.16,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {/* Staggered floating loop */}
              <motion.button
                type="button"
                disabled={!isUnlocked}
                onClick={() => isUnlocked && onOpenGift(gift.id)}
                aria-label={`${gift.label} ${isUnlocked ? 'Available to open' : 'Locked until previous gift is opened'}`}
                animate={
                  !prefersReducedMotion && isUnlocked
                    ? { y: [0, -10, 0] }
                    : { y: 0 }
                }
                transition={
                  !prefersReducedMotion && isUnlocked
                    ? {
                        duration: 2.6,
                        repeat: Infinity,
                        delay: index * 0.35,
                        ease: 'easeInOut',
                      }
                    : undefined
                }
                whileHover={
                  isUnlocked && !prefersReducedMotion
                    ? {
                        scale: 1.09,
                        rotate: [0, -4, 4, -3, 3, 0],
                        transition: { duration: 0.4 },
                      }
                    : undefined
                }
                whileTap={isUnlocked ? { scale: 0.95 } : undefined}
                className={`group relative flex flex-col items-center p-2.5 sm:p-3 rounded-3xl transition-opacity focus:outline-none focus-visible:ring-4 focus-visible:ring-[#D6336C]/40 ${
                  isUnlocked
                    ? 'cursor-pointer opacity-100'
                    : 'cursor-not-allowed opacity-40 grayscale-[25%]'
                }`}
              >
                <GiftBoxIllustration
                  badgeNumber={gift.id}
                  className="w-32 h-32 sm:w-36 sm:h-36 lg:w-44 lg:h-44"
                />
                <span className="mt-2 font-fredoka text-sm sm:text-base font-semibold text-[#5A2A2A] whitespace-nowrap">
                  {gift.label} {isOpened ? '✓' : ''}
                </span>
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {/* Tiny "The End 💗 Replay" link after the fourth gift is completed */}
      <div className="min-h-[48px] mt-6 flex items-center justify-center z-10">
        {unlockedUpTo > 4 && (
          <motion.button
            type="button"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onReplay}
            className="font-fredoka text-sm sm:text-base font-semibold text-[#D6336C] hover:underline px-4 py-2 rounded-full cursor-pointer transition-all"
          >
            The End 💗 Replay
          </motion.button>
        )}
      </div>
    </div>
  );
}
