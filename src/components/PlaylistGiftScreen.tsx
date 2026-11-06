import React, { useState, useRef, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Heart,
} from 'lucide-react';
import { useAppConfig } from '../context/ConfigContext';
import { extractYouTubeId } from '../utils/youtube';
import { MusicSwirlIllustration, VinylIllustration } from './Illustrations';
import { OptimizedImage } from './OptimizedImage';

interface PlaylistGiftScreenProps {
  onNext: () => void;
}

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function loadYouTubeIframeApi(): Promise<any> {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    const existingScript = document.getElementById('youtube-iframe-api-script');
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevCallback?.();
      resolve(window.YT);
    };
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
}

export function PlaylistGiftScreen({ onNext }: PlaylistGiftScreenProps) {
  const { appConfig: config } = useAppConfig();
  const youtubeId = extractYouTubeId(config.audioUrl);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytContainerId = 'yt-hidden-audio-player';
  const isRepeatRef = useRef<boolean>(true);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(24);
  const [isLiked, setIsLiked] = useState(true);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(true);
  const [ytReady, setYtReady] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    isRepeatRef.current = isRepeat;
  }, [isRepeat]);

  // 1. Standard HTML5 <audio> setup when NOT a YouTube URL
  useEffect(() => {
    if (youtubeId) return;
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const handleLoadedMetadata = () => {
      if (audioEl.duration && Number.isFinite(audioEl.duration)) {
        setDuration(audioEl.duration);
      }
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audioEl.currentTime);
    };
    const handleEnded = () => {
      if (isRepeatRef.current) {
        audioEl.currentTime = 0;
        audioEl.play().catch(() => setIsPlaying(false));
      } else {
        setIsPlaying(false);
      }
    };

    audioEl.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioEl.addEventListener('timeupdate', handleTimeUpdate);
    audioEl.addEventListener('ended', handleEnded);

    return () => {
      audioEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioEl.removeEventListener('timeupdate', handleTimeUpdate);
      audioEl.removeEventListener('ended', handleEnded);
    };
  }, [youtubeId, config.audioUrl]);

  // 2. YouTube IFrame Player API setup when config.audioUrl IS a YouTube link
  useEffect(() => {
    if (!youtubeId) {
      setYtReady(false);
      return;
    }

    let isMounted = true;
    let progressTimer: ReturnType<typeof setInterval> | null = null;

    loadYouTubeIframeApi().then((YT) => {
      if (!isMounted || !YT) return;

      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // ignore
        }
      }

      ytPlayerRef.current = new YT.Player(ytContainerId, {
        height: '1',
        width: '1',
        videoId: youtubeId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            if (!isMounted) return;
            setYtReady(true);
            const dur = event.target?.getDuration?.();
            if (dur && Number.isFinite(dur) && dur > 0) {
              setDuration(dur);
            }
          },
          onStateChange: (event: any) => {
            if (!isMounted) return;
            const state = event.data;
            // YT.PlayerState: PLAYING = 1, PAUSED = 2, ENDED = 0
            if (state === 1) {
              setIsPlaying(true);
              const dur = event.target?.getDuration?.();
              if (dur && Number.isFinite(dur) && dur > 0) {
                setDuration(dur);
              }
            } else if (state === 2) {
              setIsPlaying(false);
            } else if (state === 0) {
              if (isRepeatRef.current) {
                event.target?.seekTo?.(0, true);
                event.target?.playVideo?.();
              } else {
                setIsPlaying(false);
              }
            }
          },
        },
      });

      progressTimer = setInterval(() => {
        const player = ytPlayerRef.current;
        if (player && typeof player.getCurrentTime === 'function') {
          try {
            const state = player.getPlayerState?.();
            if (state === 1) {
              const cur = player.getCurrentTime();
              const dur = player.getDuration?.();
              if (Number.isFinite(cur)) setCurrentTime(cur);
              if (dur && Number.isFinite(dur) && dur > 0) setDuration(dur);
            }
          } catch {
            // ignore
          }
        }
      }, 250);
    });

    return () => {
      isMounted = false;
      if (progressTimer) clearInterval(progressTimer);
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // ignore
        }
        ytPlayerRef.current = null;
      }
    };
  }, [youtubeId]);

  const togglePlay = async () => {
    if (youtubeId) {
      const player = ytPlayerRef.current;
      if (!player || !ytReady) return;
      if (isPlaying) {
        player.pauseVideo?.();
        setIsPlaying(false);
      } else {
        player.playVideo?.();
        setIsPlaying(true);
      }
      return;
    }

    const audioEl = audioRef.current;
    if (!audioEl) return;

    if (isPlaying) {
      audioEl.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioEl.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (youtubeId) {
      ytPlayerRef.current?.seekTo?.(newTime, true);
      return;
    }
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleRestart = () => {
    setCurrentTime(0);
    if (youtubeId) {
      ytPlayerRef.current?.seekTo?.(0, true);
      return;
    }
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleSkipForward = () => {
    const nextPos = Math.min(duration, currentTime + 5);
    setCurrentTime(nextPos);
    if (youtubeId) {
      ytPlayerRef.current?.seekTo?.(nextPos, true);
      return;
    }
    if (audioRef.current) {
      audioRef.current.currentTime = nextPos;
    }
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="relative w-full min-h-dvh bg-watercolor-stripes flex flex-col justify-between px-4 py-6 sm:px-10 lg:px-14">
      {/* Audio source: either YouTube IFrame Player or HTML5 <audio> */}
      {youtubeId ? (
        <div
          className="fixed -bottom-10 -left-10 w-px h-px opacity-0 pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <div id={ytContainerId} />
        </div>
      ) : (
        <audio ref={audioRef} src={config.audioUrl} preload="metadata" />
      )}

      {/* Hand-drawn Music-Note Swirl Lines in Top-Right & Bottom-Left Corners (kept behind text and hidden on tight mobile screens so they never overlap the heading) */}
      <div className="pointer-events-none absolute top-2 right-3 sm:top-4 sm:right-6 z-0 hidden md:block opacity-75">
        <MusicSwirlIllustration variant="top-right" className="w-36 h-20 lg:w-48 lg:h-26" />
      </div>
      <div className="pointer-events-none absolute bottom-2 left-3 sm:bottom-4 sm:left-6 z-0 hidden md:block opacity-75">
        <MusicSwirlIllustration variant="bottom-left" className="w-36 h-20 lg:w-48 lg:h-26" />
      </div>

      {/* Top Heading (Cormorant Garamond) + Italic Subtitle */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-20 text-center pt-1 sm:pt-2 px-2"
      >
        <h1 className="font-cormorant text-3xl sm:text-5xl lg:text-[54px] font-bold text-[#5A2A2A] leading-tight drop-shadow-[0_2px_0_rgba(255,255,255,0.85)]">
          A Playlist Made For You
        </h1>
        <p className="font-cormorant italic text-lg sm:text-2xl lg:text-[26px] text-[#D6336C] font-semibold mt-0.5">
          Songs that somehow sound like us
        </p>
      </motion.div>

      {/* Center Content: Left Vertical Music-Player Card + Center Spinning Vinyl Record */}
      <div className="relative z-20 flex-1 w-full max-w-5xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 my-4">
        {/* Left: Vertical Black Music-Player Card */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-[310px] sm:max-w-[330px] rounded-3xl bg-[#111111] text-white p-5 sm:p-6 shadow-[0_14px_30px_rgba(17,17,17,0.28)] border-2 border-[#FFF3DC]/20"
        >
          {/* Square Album Art */}
          <div className="w-full aspect-square rounded-2xl overflow-hidden bg-[#1a1a1a] mb-4 border border-white/10">
            <OptimizedImage
              src={config.albumArtUrl}
              alt={config.songTitle}
              sizes="320px"
              fit="cover"
              className="scale-[1.35]"
            />
          </div>

          {/* Song Title, Artist & Green Liked-Heart */}
          <div className="flex items-start justify-between gap-2.5 mb-3">
            <div className="min-w-0 flex-1">
              <h2 className="font-fredoka text-base sm:text-lg font-semibold text-white leading-snug break-words line-clamp-2">
                {config.songTitle}
              </h2>
              <p className="font-fredoka text-xs text-white/70 truncate mt-0.5">
                {config.artist}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsLiked((v) => !v)}
              aria-label={isLiked ? 'Unlike song' : 'Like song'}
              className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-full hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              <Heart
                className={`w-5 h-5 transition-transform active:scale-125 ${
                  isLiked ? 'fill-[#22C55E] text-[#22C55E]' : 'text-white/70'
                }`}
              />
            </button>
          </div>

          {/* Seekable Progress Bar with Times */}
          <div className="mb-4">
            <div className="relative flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 24}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                aria-label="Song progress"
                style={{
                  background: `linear-gradient(to right, #F8C8D8 ${progressPercent}%, #333333 ${progressPercent}%)`,
                }}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#D6336C]"
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono tabular-nums text-white/65 mt-1.5">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Player Controls: Shuffle, Previous, Play/Pause, Next, Repeat */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsShuffle((s) => !s)}
              aria-label="Toggle shuffle"
              className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full transition-colors cursor-pointer ${
                isShuffle ? 'text-[#22C55E]' : 'text-white/70 hover:text-white'
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleRestart}
              aria-label="Previous or restart track"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-white/85 hover:text-white transition-colors cursor-pointer"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="w-12 h-12 rounded-full bg-[#FFF3DC] text-[#111111] flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={handleSkipForward}
              aria-label="Skip forward"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-white/85 hover:text-white transition-colors cursor-pointer"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            <button
              type="button"
              onClick={() => setIsRepeat((r) => !r)}
              aria-label="Toggle repeat"
              className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full transition-colors cursor-pointer ${
                isRepeat ? 'text-[#22C55E]' : 'text-white/70 hover:text-white'
              }`}
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Center: Large Spinning Black Vinyl Record */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col items-center"
        >
          <div
            onClick={togglePlay}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                togglePlay();
              }
            }}
            aria-label={isPlaying ? 'Pause vinyl record' : 'Play vinyl record'}
            className="cursor-pointer rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-[#D6336C]/50"
          >
            <VinylIllustration
              isPlaying={isPlaying}
              className="w-56 h-56 sm:w-72 sm:h-72 lg:w-84 lg:h-84"
            />
          </div>
          <span className="mt-3 font-cormorant italic text-base sm:text-lg text-[#5A2A2A]/80 select-none">
            {isPlaying ? '♪ Spinning softly for you...' : 'Tap play to spin the record ♪'}
          </span>
        </motion.div>
      </div>

      {/* Bottom-Right "Next →" Pill Button */}
      <div className="relative z-20 flex justify-end w-full max-w-6xl mx-auto pb-1">
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
