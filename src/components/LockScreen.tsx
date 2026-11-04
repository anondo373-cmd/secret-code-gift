import React, { useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Delete } from 'lucide-react';
import { useAppConfig } from '../context/ConfigContext';
import { BowIllustration, HeartPhotoFrame, SparkleSticker } from './Illustrations';

interface LockScreenProps {
  onUnlockNext: () => void;
  onSecretAdmin?: () => void;
}

const SPARKLE_POSITIONS = [
  { top: '8%', left: '7%', size: 'w-6 h-6', delay: 0 },
  { top: '16%', left: '42%', size: 'w-5 h-5', delay: 0.4 },
  { top: '78%', left: '8%', size: 'w-7 h-7', delay: 0.8 },
  { top: '85%', left: '44%', size: 'w-5 h-5', delay: 1.2 },
  { top: '12%', left: '62%', size: 'w-4 h-4', delay: 0.6 },
  { top: '74%', left: '91%', size: 'w-6 h-6', delay: 1.0 },
  { top: '44%', left: '5%', size: 'w-4 h-4', delay: 0.3 },
];

export function LockScreen({ onUnlockNext, onSecretAdmin }: LockScreenProps) {
  const { appConfig: config } = useAppConfig();
  const [digits, setDigits] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'wrong' | 'unlocked'>('idle');
  const [shakeKey, setShakeKey] = useState<number>(0);
  const [, setBowTaps] = useState<number>(0);
  const prefersReducedMotion = useReducedMotion();

  const handleBowTap = () => {
    setBowTaps((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        onSecretAdmin?.();
        return 0;
      }
      return next;
    });
  };

  const handleDigit = useCallback(
    (digit: string) => {
      if (status === 'unlocked') return;
      if (status === 'wrong') {
        setStatus('idle');
      }
      setDigits((prev) => (prev.length < 4 ? prev + digit : prev));
    },
    [status]
  );

  const handleBackspace = useCallback(() => {
    if (status === 'unlocked') return;
    if (status === 'wrong') {
      setStatus('idle');
    }
    setDigits((prev) => prev.slice(0, -1));
  }, [status]);

  const handleSubmit = useCallback(() => {
    if (status === 'unlocked' || digits.length < 4) return;

    if (digits === config.secretCode) {
      setStatus('unlocked');
    } else {
      setStatus('wrong');
      setShakeKey((k) => k + 1);
      setTimeout(() => {
        setDigits('');
      }, 420);
    }
  }, [config.secretCode, digits, status]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (status === 'unlocked') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onUnlockNext();
        }
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter' && digits.length === 4) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [digits.length, handleBackspace, handleDigit, handleSubmit, onUnlockNext, status]);

  const isReadyToSubmit = digits.length === 4 && status !== 'unlocked';

  return (
    <div className="relative w-full min-h-dvh lg:h-dvh bg-[#FDEBF1] overflow-y-auto lg:overflow-hidden flex items-center justify-center px-4 py-6 sm:px-8 lg:px-14">
      {/* Scattered Sparkles / Stars */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {SPARKLE_POSITIONS.map((sp, i) => (
          <motion.div
            key={i}
            style={{ top: sp.top, left: sp.left }}
            className="absolute"
            animate={
              prefersReducedMotion
                ? undefined
                : { scale: [1, 1.2, 1], opacity: [0.65, 1, 0.65] }
            }
            transition={{
              duration: 2.8,
              repeat: Infinity,
              delay: sp.delay,
              ease: 'easeInOut',
            }}
          >
            <SparkleSticker className={sp.size} />
          </motion.div>
        ))}
      </div>

      {/* Top-Right Pink Ribbon Bow (tap 5 times for secret Admin access) */}
      <div
        onClick={handleBowTap}
        className=" absolute top-3 right-4 sm:top-5 sm:right-7 z-20"
      >
        <BowIllustration className="w-20 h-20 sm:w-28 sm:h-28 rotate-12" />
      </div>

      {/* Main Landscape-first 2-Column Layout (Stacks on Portrait Phones) */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 items-center gap-6 lg:gap-10">
        {/* Left: Two Overlapping Heart-Shaped Photo Frames */}
        <div className="lg:col-span-6 flex items-center justify-center">
          <div className="relative w-[290px] h-[250px] sm:w-[370px] sm:h-[320px] lg:w-[430px] lg:h-[370px]">
            {/* Top-left heart photo frame tilted slightly right toward its partner */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: -7 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute top-2 left-1 sm:left-2 w-44 h-44 sm:w-56 sm:h-56 lg:w-64 lg:h-64 z-10"
            >
              <HeartPhotoFrame
                photoUrl={config.photo1Url}
                alt="First cherished memory"
                clipId="heart-clip-left"
                className="w-full h-full"
              />
            </motion.div>

            {/* Bottom-right overlapping heart photo frame tilted slightly left toward the first */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9, rotate: 10 }}
              animate={{ opacity: 1, scale: 1, rotate: 8 }}
              transition={{ duration: 0.5, delay: 0.12, ease: 'easeOut' }}
              className="absolute bottom-1 right-1 sm:right-2 w-44 h-44 sm:w-56 sm:h-56 lg:w-64 lg:h-64 z-20"
            >
              <HeartPhotoFrame
                photoUrl={config.photo2Url}
                alt="Second cherished memory"
                clipId="heart-clip-right"
                className="w-full h-full"
              />
            </motion.div>
          </div>
        </div>

        {/* Right: Secret Code Entry */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <h1
            title={`Secret code: ${config.secretCode}`}
            className="font-script text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#D6336C] text-center mb-4 select-none drop-shadow-[0_2px_0_rgba(255,255,255,0.8)]"
          >
            Enter our secret code 💗
          </h1>

          {/* 4 Slots in a Row */}
          <motion.div
            key={shakeKey}
            animate={
              status === 'wrong' && !prefersReducedMotion
                ? { x: [0, -12, 12, -10, 10, -5, 5, 0] }
                : { x: 0 }
            }
            transition={{ duration: 0.4 }}
            className="flex items-center justify-center gap-3 sm:gap-4 mb-3"
            aria-label={`Passcode slots: ${digits.length} of 4 entered`}
          >
            {[0, 1, 2, 3].map((slotIdx) => {
              const isFilled = slotIdx < digits.length;
              return (
                <div
                  key={slotIdx}
                  className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-[#FFF3DC] border-2 border-[#F8C8D8] shadow-[0_4px_0_#F8C8D8] flex items-center justify-center transition-transform duration-150"
                >
                  {isFilled ? (
                    <motion.span
                      initial={prefersReducedMotion ? false : { scale: 0.3, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-2xl sm:text-3xl text-[#D6336C] leading-none select-none"
                      aria-hidden="true"
                    >
                      ♥
                    </motion.span>
                  ) : (
                    <span
                      className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-[#D6336C]/45"
                      aria-hidden="true"
                    />
                  )}
                </div>
              );
            })}
          </motion.div>

          {/* Feedback / Unlocked Banner */}
          <div className="min-h-[44px] flex items-center justify-center mb-3">
            {status === 'unlocked' ? (
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
              >
                <span className="font-fredoka text-sm sm:text-base font-semibold text-[#D6336C]">
                  Unlocked ✓
                </span>
                <button
                  type="button"
                  onClick={onUnlockNext}
                  className="min-h-[40px] px-5 py-1.5 rounded-full bg-[#D6336C] text-[#FFF3DC] font-fredoka font-semibold text-sm sm:text-base shadow-[0_3px_0_#5A2A2A] hover:brightness-105 active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  Next →
                </button>
              </motion.div>
            ) : status === 'wrong' ? (
              <motion.p
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-fredoka text-sm sm:text-base font-medium text-[#D6336C]"
                role="alert"
              >
                Hmm, try again 💗
              </motion.p>
            ) : (
              <span className="sr-only">Secret code is {config.secretCode}</span>
            )}
          </div>

          {/* 3x4 Number Pad */}
          <div
            className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full max-w-[260px] sm:max-w-[280px]"
            role="group"
            aria-label="Secret code keypad"
          >
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleDigit(num)}
                disabled={status === 'unlocked'}
                className="min-h-[50px] sm:min-h-[54px] rounded-2xl bg-[#FFF3DC] border-2 border-[#F8C8D8] shadow-[0_4px_0_#F8C8D8] text-[#5A2A2A] font-fredoka font-bold text-xl sm:text-2xl flex items-center justify-center hover:bg-[#FFF9EC] active:translate-y-0.5 active:shadow-[0_2px_0_#F8C8D8] transition-all cursor-pointer disabled:opacity-60 select-none"
              >
                {num}
              </button>
            ))}

            {/* Backspace Key */}
            <button
              type="button"
              onClick={handleBackspace}
              disabled={status === 'unlocked' || digits.length === 0}
              aria-label="Backspace"
              className="min-h-[50px] sm:min-h-[54px] rounded-2xl bg-[#FFF3DC] border-2 border-[#F8C8D8] shadow-[0_4px_0_#F8C8D8] text-[#5A2A2A] flex items-center justify-center hover:bg-[#FFF9EC] active:translate-y-0.5 active:shadow-[0_2px_0_#F8C8D8] transition-all cursor-pointer disabled:opacity-50 select-none"
            >
              <Delete className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* 0 Key */}
            <button
              type="button"
              onClick={() => handleDigit('0')}
              disabled={status === 'unlocked'}
              className="min-h-[50px] sm:min-h-[54px] rounded-2xl bg-[#FFF3DC] border-2 border-[#F8C8D8] shadow-[0_4px_0_#F8C8D8] text-[#5A2A2A] font-fredoka font-bold text-xl sm:text-2xl flex items-center justify-center hover:bg-[#FFF9EC] active:translate-y-0.5 active:shadow-[0_2px_0_#F8C8D8] transition-all cursor-pointer disabled:opacity-60 select-none"
            >
              0
            </button>

            {/* Heart-Shaped Submit Key */}
            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={!isReadyToSubmit}
              aria-label="Submit secret code"
              animate={
                isReadyToSubmit && !prefersReducedMotion
                  ? { scale: [1, 1.08, 1] }
                  : { scale: 1 }
              }
              transition={
                isReadyToSubmit
                  ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }
                  : undefined
              }
              className="min-h-[50px] sm:min-h-[54px] flex items-center justify-center cursor-pointer disabled:cursor-not-allowed focus:outline-none select-none"
            >
              <svg
                viewBox="0 0 80 68"
                className="w-15 h-13 sm:w-16 sm:h-14 drop-shadow-[0_4px_0_rgba(248,200,216,0.9)]"
              >
                <path
                  d="M40 16 C40 4, 16 0, 8 15 C0 30, 14 46, 40 62 C66 46, 80 30, 72 15 C64 0, 40 4, 40 16 Z"
                  fill={isReadyToSubmit || status === 'unlocked' ? '#D6336C' : '#F8C8D8'}
                  stroke={isReadyToSubmit || status === 'unlocked' ? '#5A2A2A' : '#D6336C'}
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
                <text
                  x="40"
                  y="39"
                  textAnchor="middle"
                  fill="#FFF3DC"
                  fontSize="16"
                  fontWeight="700"
                  fontFamily="Fredoka, sans-serif"
                >
                  ✓
                </text>
              </svg>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
