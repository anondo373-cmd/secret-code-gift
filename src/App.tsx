/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ConfigProvider } from './context/ConfigContext';
import { LockScreen } from './components/LockScreen';
import { GiftHubScreen } from './components/GiftHubScreen';
import { TulipsGiftScreen } from './components/TulipsGiftScreen';
import { PlaylistGiftScreen } from './components/PlaylistGiftScreen';
import { LetterGiftScreen } from './components/LetterGiftScreen';
import { PhotoAlbumGiftScreen } from './components/PhotoAlbumGiftScreen';
import { AdminPanel } from './components/AdminPanel';

type ScreenId = 'lock' | 'hub' | 'gift1' | 'gift2' | 'gift3' | 'gift4' | 'admin';

export default function App() {
  const [screen, setScreen] = useState<ScreenId>(() => {
    if (
      window.location.pathname.startsWith('/admin') ||
      window.location.hash === '#admin'
    ) {
      return 'admin';
    }
    return 'lock';
  });
  const [previousScreen, setPreviousScreen] = useState<Exclude<ScreenId, 'admin'>>('lock');
  const [unlockedUpTo, setUnlockedUpTo] = useState<number>(1);
  const [whiteFlash, setWhiteFlash] = useState<boolean>(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash === '#admin') {
        setScreen((cur) => {
          if (cur !== 'admin') setPreviousScreen(cur);
          return 'admin';
        });
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') || (e.altKey && e.key.toLowerCase() === 'a')) {
        e.preventDefault();
        setScreen((cur) => {
          if (cur !== 'admin') setPreviousScreen(cur);
          return 'admin';
        });
      }
    };
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const transitionWithWhiteFade = useCallback(
    (targetScreen: ScreenId, afterSwitch?: () => void) => {
      if (prefersReducedMotion) {
        afterSwitch?.();
        setScreen(targetScreen);
        return;
      }
      setWhiteFlash(true);
      setTimeout(() => {
        afterSwitch?.();
        setScreen(targetScreen);
        setTimeout(() => {
          setWhiteFlash(false);
        }, 120);
      }, 240);
    },
    [prefersReducedMotion]
  );

  const handleUnlockNext = useCallback(() => {
    transitionWithWhiteFade('hub');
  }, [transitionWithWhiteFade]);

  const handleOpenGift = useCallback(
    (giftIndex: 1 | 2 | 3 | 4) => {
      const target: ScreenId =
        giftIndex === 1
          ? 'gift1'
          : giftIndex === 2
          ? 'gift2'
          : giftIndex === 3
          ? 'gift3'
          : 'gift4';
      transitionWithWhiteFade(target);
    },
    [transitionWithWhiteFade]
  );

  const handleCompleteGift = useCallback(
    (completedGiftIndex: 1 | 2 | 3 | 4) => {
      transitionWithWhiteFade('hub', () => {
        setUnlockedUpTo((prev) => Math.max(prev, completedGiftIndex + 1));
      });
    },
    [transitionWithWhiteFade]
  );

  const handleReplay = useCallback(() => {
    transitionWithWhiteFade('lock', () => {
      setUnlockedUpTo(1);
    });
  }, [transitionWithWhiteFade]);

  const openAdmin = () => {
    if (screen !== 'admin') {
      setPreviousScreen(screen);
    }
    setScreen('admin');
  };

  const closeAdmin = () => {
    if (window.location.hash === '#admin') {
      history.replaceState(null, '', window.location.pathname);
    }
    setScreen(previousScreen);
  };

  const handlePreviewScreenFromAdmin = (target: Exclude<ScreenId, 'admin'>) => {
    setUnlockedUpTo(5);
    setPreviousScreen(target);
    setScreen(target);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [screen]);

  return (
    <ConfigProvider>
      {screen === 'admin' ? (
        <AdminPanel
          onClose={closeAdmin}
          onPreviewScreen={handlePreviewScreenFromAdmin}
        />
      ) : (
        <main className="relative w-full min-h-dvh overflow-x-hidden bg-[#FDEBF1] select-none">
          <AnimatePresence mode="wait">
            {screen === 'lock' && (
              <motion.div
                key="lock"
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                <LockScreen onUnlockNext={handleUnlockNext} onSecretAdmin={openAdmin} />
              </motion.div>
            )}

            {screen === 'hub' && (
              <motion.div
                key="hub"
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <GiftHubScreen
                  unlockedUpTo={unlockedUpTo}
                  onOpenGift={handleOpenGift}
                  onReplay={handleReplay}
                />
              </motion.div>
            )}

            {screen === 'gift1' && (
              <motion.div
                key="gift1"
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <TulipsGiftScreen onNext={() => handleCompleteGift(1)} />
              </motion.div>
            )}

            {screen === 'gift2' && (
              <motion.div
                key="gift2"
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <PlaylistGiftScreen onNext={() => handleCompleteGift(2)} />
              </motion.div>
            )}

            {screen === 'gift3' && (
              <motion.div
                key="gift3"
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <PhotoAlbumGiftScreen onNext={() => handleCompleteGift(3)} />
              </motion.div>
            )}

            {screen === 'gift4' && (
              <motion.div
                key="gift4"
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <LetterGiftScreen onNext={() => handleCompleteGift(4)} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* White Flash / White Fade Overlay Transition */}
          <AnimatePresence>
            {whiteFlash && (
              <motion.div
                key="white-flash-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="pointer-events-none fixed inset-0 z-50 bg-white"
                aria-hidden="true"
              />
            )}
          </AnimatePresence>
        </main>
      )}
    </ConfigProvider>
  );
}
