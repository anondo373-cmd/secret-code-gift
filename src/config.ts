import savedConfigRaw from './savedConfig.json';

// Helper to generate a dreamy, romantic music-box melody as a playable WAV data URL
// so the <audio> player works out-of-the-box with real seeking, duration, and sound.
// Swap `audioUrl` below with your own "/song.mp3" path anytime!
function createRomanticMusicBoxWavDataUrl(): string {
  const sampleRate = 22050;
  const durationSeconds = 24;
  const numSamples = sampleRate * durationSeconds;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // WAV Header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Gentle music box notes (F major / D minor pentatonic dreamy progression)
  const melody: Array<{ freq: number; start: number; dur: number }> = [
    // Bar 1 - Fmaj7
    { freq: 349.23, start: 0.0, dur: 2.8 },
    { freq: 440.0, start: 0.4, dur: 2.2 },
    { freq: 523.25, start: 0.8, dur: 2.0 },
    { freq: 659.25, start: 1.2, dur: 2.4 },
    { freq: 587.33, start: 2.0, dur: 1.8 },
    { freq: 523.25, start: 2.5, dur: 1.8 },
    // Bar 2 - Dm7
    { freq: 293.66, start: 3.0, dur: 2.8 },
    { freq: 440.0, start: 3.4, dur: 2.2 },
    { freq: 523.25, start: 3.8, dur: 2.0 },
    { freq: 587.33, start: 4.2, dur: 2.2 },
    { freq: 659.25, start: 5.0, dur: 1.6 },
    { freq: 523.25, start: 5.5, dur: 1.6 },
    // Bar 3 - Bbmaj7
    { freq: 233.08, start: 6.0, dur: 2.8 },
    { freq: 349.23, start: 6.4, dur: 2.2 },
    { freq: 440.0, start: 6.8, dur: 2.0 },
    { freq: 523.25, start: 7.2, dur: 2.4 },
    { freq: 587.33, start: 8.0, dur: 1.8 },
    { freq: 659.25, start: 8.5, dur: 1.8 },
    // Bar 4 - C7sus4 -> C
    { freq: 261.63, start: 9.0, dur: 2.8 },
    { freq: 392.0, start: 9.4, dur: 2.2 },
    { freq: 523.25, start: 9.8, dur: 2.2 },
    { freq: 587.33, start: 10.4, dur: 1.8 },
    { freq: 523.25, start: 11.2, dur: 2.0 },
  ];

  // Repeat the 12-second phrase twice for a 24-second track
  const fullNotes = [
    ...melody,
    ...melody.map((n) => ({ ...n, start: n.start + 12.0 })),
  ];

  const samples = new Float32Array(numSamples);

  for (const note of fullNotes) {
    const startSample = Math.floor(note.start * sampleRate);
    const lengthSamples = Math.floor(note.dur * sampleRate);
    for (let i = 0; i < lengthSamples; i++) {
      const idx = startSample + i;
      if (idx >= numSamples) break;
      const t = i / sampleRate;
      const attack = Math.min(1, t / 0.015);
      const decay = Math.exp(-t * 2.1);
      const env = attack * decay;
      // Music box chime: fundamental + soft 2nd & 3rd harmonics
      const signal =
        Math.sin(2 * Math.PI * note.freq * t) * 0.65 +
        Math.sin(2 * Math.PI * note.freq * 2 * t) * 0.25 * Math.exp(-t * 3.5) +
        Math.sin(2 * Math.PI * note.freq * 3 * t) * 0.1 * Math.exp(-t * 5.0);
      samples[idx] += signal * env * 0.28;
    }
  }

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, clamped * 32767, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

const defaultPhoto1Svg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="sky1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FDEBF1"/>
      <stop offset="55%" stop-color="#F8C8D8"/>
      <stop offset="100%" stop-color="#FFF3DC"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#sky1)"/>
  <circle cx="300" cy="95" r="46" fill="#FFF3DC" opacity="0.9"/>
  <ellipse cx="120" cy="110" rx="55" ry="24" fill="#FFF3DC" opacity="0.8"/>
  <ellipse cx="155" cy="115" rx="45" ry="20" fill="#FFF3DC" opacity="0.8"/>
  <path d="M0 270 Q200 235 400 275 L400 400 L0 400 Z" fill="#F4B8CE"/>
  <path d="M40 315 L210 280 L360 325 L200 375 Z" fill="#FFF3DC" stroke="#D6336C" stroke-width="3"/>
  <!-- Two cute teacups & strawberries on picnic blanket -->
  <ellipse cx="165" cy="315" rx="22" ry="8" fill="#F8C8D8" stroke="#5A2A2A" stroke-width="2.5"/>
  <path d="M148 298 C148 320 182 320 182 298 Z" fill="#FFFFFF" stroke="#5A2A2A" stroke-width="2.5"/>
  <ellipse cx="235" cy="322" rx="22" ry="8" fill="#F8C8D8" stroke="#5A2A2A" stroke-width="2.5"/>
  <path d="M218 305 C218 327 252 327 252 305 Z" fill="#FFFFFF" stroke="#5A2A2A" stroke-width="2.5"/>
  <!-- Floating little hearts -->
  <path d="M200 225 C200 212 180 205 180 220 C180 233 200 242 200 248 C200 242 220 233 220 220 C220 205 200 212 200 225 Z" fill="#D6336C"/>
  <path d="M145 185 C145 177 133 172 133 182 C133 190 145 196 145 200 C145 196 157 190 157 182 C157 172 145 177 145 185 Z" fill="#D6336C" opacity="0.75"/>
  <path d="M255 180 C255 172 243 167 243 177 C243 185 255 191 255 195 C255 191 267 185 267 177 C267 167 255 172 255 180 Z" fill="#D6336C" opacity="0.75"/>
</svg>
`)}`;

const defaultPhoto2Svg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F8C8D8"/>
      <stop offset="60%" stop-color="#FDEBF1"/>
      <stop offset="100%" stop-color="#FFF3DC"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#sky2)"/>
  <!-- Soft pastel hills & cherry blossom petals -->
  <circle cx="95" cy="95" r="10" fill="#FFF3DC"/>
  <circle cx="310" cy="120" r="8" fill="#FFF3DC"/>
  <circle cx="260" cy="75" r="12" fill="#FFF3DC"/>
  <path d="M0 290 Q180 250 400 285 L400 400 L0 400 Z" fill="#E8B4C8"/>
  <!-- Two cute cats sitting side by side watching sunset -->
  <!-- Left Cat -->
  <ellipse cx="172" cy="265" rx="28" ry="34" fill="#FFF3DC" stroke="#5A2A2A" stroke-width="3"/>
  <circle cx="172" cy="220" r="22" fill="#FFF3DC" stroke="#5A2A2A" stroke-width="3"/>
  <polygon points="154,208 158,188 170,202" fill="#F8C8D8" stroke="#5A2A2A" stroke-width="2.5"/>
  <polygon points="190,208 186,188 174,202" fill="#F8C8D8" stroke="#5A2A2A" stroke-width="2.5"/>
  <!-- Right Cat -->
  <ellipse cx="226" cy="268" rx="26" ry="32" fill="#F8C8D8" stroke="#5A2A2A" stroke-width="3"/>
  <circle cx="226" cy="226" r="20" fill="#F8C8D8" stroke="#5A2A2A" stroke-width="3"/>
  <polygon points="210,214 214,195 224,208" fill="#FFF3DC" stroke="#5A2A2A" stroke-width="2.5"/>
  <polygon points="242,214 238,195 228,208" fill="#FFF3DC" stroke="#5A2A2A" stroke-width="2.5"/>
  <!-- Intertwined tails -->
  <path d="M150 290 Q130 265 145 250" fill="none" stroke="#5A2A2A" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M248 290 Q270 265 255 250" fill="none" stroke="#5A2A2A" stroke-width="3.5" stroke-linecap="round"/>
  <!-- Heart above them -->
  <path d="M200 165 C200 150 176 142 176 160 C176 175 200 186 200 194 C200 186 224 175 224 160 C224 142 200 150 200 165 Z" fill="#D6336C"/>
</svg>
`)}`;

const defaultAlbumArtSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="albumGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F8C8D8"/>
      <stop offset="50%" stop-color="#FDEBF1"/>
      <stop offset="100%" stop-color="#FFF3DC"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#albumGrad)"/>
  <!-- Soft clouds -->
  <ellipse cx="110" cy="295" rx="95" ry="45" fill="#FFF3DC" opacity="0.9"/>
  <ellipse cx="220" cy="310" rx="110" ry="50" fill="#FDEBF1" opacity="0.95"/>
  <ellipse cx="320" cy="290" rx="90" ry="42" fill="#FFF3DC" opacity="0.9"/>
  <!-- Big romantic heart & sparkles in center -->
  <circle cx="200" cy="185" r="78" fill="#FFF3DC" opacity="0.7" stroke="#D6336C" stroke-width="2" stroke-dasharray="6 6"/>
  <path d="M200 165 C200 135 150 120 150 156 C150 186 200 212 200 228 C200 212 250 186 250 156 C250 120 200 135 200 165 Z" fill="#D6336C" stroke="#5A2A2A" stroke-width="3"/>
  <path d="M110 110 L115 125 L130 130 L115 135 L110 150 L105 135 L90 130 L105 125 Z" fill="#D6336C"/>
  <path d="M295 100 L299 112 L311 116 L299 120 L295 132 L291 120 L279 116 L291 112 Z" fill="#D6336C"/>
  <path d="M95 225 L98 234 L107 237 L98 240 L95 249 L92 240 L83 237 L92 234 Z" fill="#D6336C" opacity="0.7"/>
</svg>
`)}`;

export interface AlbumPhoto {
  url: string;
  publicId?: string;
  caption: string;
  date: string;
}

export interface AppConfig {
  secretCode: string;
  photo1Url: string;
  photo1PublicId?: string;
  photo2Url: string;
  photo2PublicId?: string;
  tulipNotes: [string, string, string, string, string, string];
  songTitle: string;
  artist: string;
  albumArtUrl: string;
  albumArtPublicId?: string;
  audioUrl: string;
  audioPublicId?: string;
  letterText: string;
  signOffText: string;
  albumPhotos: AlbumPhoto[];
  /**
   * Optional custom image paths to replace any of the built-in sticker SVG illustrations.
   * Leave empty/undefined to use the default hand-crafted inline SVG components.
   */
  illustrations: {
    bow?: string;
    giftBox?: string;
    tulipBouquet?: string;
    vinyl?: string;
    cat?: string;
    blossoms?: string;
    laceBorder?: string;
    sparkles?: string;
  };
  illustrationsPublicIds?: {
    bow?: string;
    giftBox?: string;
    tulipBouquet?: string;
    vinyl?: string;
    cat?: string;
    blossoms?: string;
    laceBorder?: string;
    sparkles?: string;
  };
}

const createMemorySvg = (
  bg1: string,
  bg2: string,
  iconType: 'coffee' | 'stars' | 'rain' | 'ferris'
) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="320" fill="url(#g)"/>
  <circle cx="320" cy="70" r="36" fill="#FFF3DC" opacity="0.85"/>
  <ellipse cx="95" cy="80" rx="48" ry="20" fill="#FFF3DC" opacity="0.75"/>
  <path d="M0 235 Q200 200 400 240 L400 320 L0 320 Z" fill="#F4B8CE" opacity="0.75"/>
  ${
    iconType === 'coffee'
      ? `<rect x="135" y="145" width="50" height="62" rx="10" fill="#FFF3DC" stroke="#5A2A2A" stroke-width="3"/>
         <path d="M185 158 C202 158 202 186 185 186" fill="none" stroke="#5A2A2A" stroke-width="3"/>
         <rect x="215" y="152" width="48" height="55" rx="10" fill="#F8C8D8" stroke="#5A2A2A" stroke-width="3"/>
         <path d="M263 164 C278 164 278 190 263 190" fill="none" stroke="#5A2A2A" stroke-width="3"/>
         <path d="M200 112 C200 100 182 94 182 108 C182 120 200 128 200 135 C200 128 218 120 218 108 C218 94 200 100 200 112 Z" fill="#D6336C"/>`
      : iconType === 'stars'
      ? `<circle cx="150" cy="110" r="5" fill="#FFF3DC"/>
         <circle cx="250" cy="90" r="6" fill="#FFF3DC"/>
         <circle cx="200" cy="70" r="4" fill="#FFF3DC"/>
         <path d="M120 150 L280 95" stroke="#FFF3DC" stroke-width="3" stroke-linecap="round" stroke-dasharray="8 6"/>
         <path d="M200 165 C200 145 170 135 170 158 C170 176 200 192 200 202 C200 192 230 176 230 158 C230 135 200 145 200 165 Z" fill="#D6336C" stroke="#5A2A2A" stroke-width="3"/>`
      : iconType === 'rain'
      ? `<path d="M120 165 C120 110 280 110 280 165 Z" fill="#D6336C" stroke="#5A2A2A" stroke-width="3.5"/>
         <path d="M200 165 L200 230 C200 244 182 244 182 232" fill="none" stroke="#5A2A2A" stroke-width="4" stroke-linecap="round"/>
         <line x1="140" y1="75" x2="132" y2="95" stroke="#A9D6F0" stroke-width="3" stroke-linecap="round"/>
         <line x1="200" y1="65" x2="192" y2="85" stroke="#A9D6F0" stroke-width="3" stroke-linecap="round"/>
         <line x1="260" y1="78" x2="252" y2="98" stroke="#A9D6F0" stroke-width="3" stroke-linecap="round"/>`
      : `<circle cx="200" cy="145" r="58" fill="none" stroke="#5A2A2A" stroke-width="3.5"/>
         <circle cx="200" cy="145" r="8" fill="#D6336C" stroke="#5A2A2A" stroke-width="2.5"/>
         <line x1="200" y1="145" x2="165" y2="235" stroke="#5A2A2A" stroke-width="3.5"/>
         <line x1="200" y1="145" x2="235" y2="235" stroke="#5A2A2A" stroke-width="3.5"/>
         <circle cx="200" cy="87" r="9" fill="#FFF3DC" stroke="#D6336C" stroke-width="2.5"/>
         <circle cx="258" cy="145" r="9" fill="#FFF3DC" stroke="#D6336C" stroke-width="2.5"/>
         <circle cx="142" cy="145" r="9" fill="#FFF3DC" stroke="#D6336C" stroke-width="2.5"/>`
  }
</svg>
`)}`;

const baseDefaultConfig: AppConfig = {
  // 4-digit passcode for Screen 1 (Lock Screen)
  secretCode: '0214',

  // Two photo URLs for the overlapping heart frames on Screen 1
  photo1Url: defaultPhoto1Svg,
  photo2Url: defaultPhoto2Svg,

  // Six handwritten speech-bubble notes for Gift 1 (Tulips)
  tulipNotes: [
    'Your laugh is my favorite sound in the world',
    'Thank you for making ordinary days feel magical',
    'Every little moment with you is a treasure',
    'You bring the warmest sunshine wherever you go',
    'Forever grateful for your kindness and sweet heart',
    'Just like these tulips, my love for you blooms brighter every day',
  ],

  // Music player config for Gift 2 (Playlist)
  songTitle: 'Strawberry Cloud Lullaby',
  artist: 'Dreamy Pastels',
  albumArtUrl: defaultAlbumArtSvg,
  audioUrl: createRomanticMusicBoxWavDataUrl(),

  // Letter text & sign-off for Gift 3 (Letter)
  letterText: `My Dearest,\n\nI wanted to make this little corner of the internet just for you—a tiny keepsake filled with your favorite things. Every time I think about us, I find myself smiling at the smallest memories: our late-night talks, our shared jokes, and the gentle way you make everything feel safe and bright.\n\nNo matter how busy life gets, please always remember how deeply cherished you are. Thank you for being my favorite person, my comfort, and my happiest adventure.`,
  signOffText: 'With all my love, always ♥',

  // Photo Album memories for Gift 4 (Our Moments)
  albumPhotos: [
    {
      url: defaultPhoto1Svg,
      caption: 'Our sunlit afternoon picnic & endless laughter',
      date: 'Moment 01 · Sweet Beginnings',
    },
    {
      url: createMemorySvg('#FDEBF1', '#FFF3DC', 'coffee'),
      caption: 'Cozy coffee dates where hours felt like minutes',
      date: 'Moment 02 · Little Traditions',
    },
    {
      url: createMemorySvg('#F8C8D8', '#A9D6F0', 'rain'),
      caption: 'Sharing one umbrella on a sudden rainy evening',
      date: 'Moment 03 · Rainy Day Magic',
    },
    {
      url: defaultPhoto2Svg,
      caption: 'Walking side by side watching the pink sky fade',
      date: 'Moment 04 · Golden Hour',
    },
    {
      url: createMemorySvg('#FDEBF1', '#F8C8D8', 'ferris'),
      caption: 'City lights and holding hands at the fair',
      date: 'Moment 05 · Bright Lights',
    },
    {
      url: createMemorySvg('#F8C8D8', '#FFF3DC', 'stars'),
      caption: 'Late-night stargazing and talking about our dreams',
      date: 'Moment 06 · Forever To Go',
    },
  ],

  // Optional custom artwork overrides (swap any illustration with a URL/path)
  illustrations: {
    bow: undefined,
    giftBox: undefined,
    tulipBouquet: undefined,
    vinyl: undefined,
    cat: undefined,
    blossoms: undefined,
    laceBorder: undefined,
    sparkles: undefined,
  },
};

const savedOverride = (savedConfigRaw || {}) as Partial<AppConfig>;

export const config: AppConfig = {
  ...baseDefaultConfig,
  ...savedOverride,
  tulipNotes:
    Array.isArray(savedOverride.tulipNotes) && savedOverride.tulipNotes.length === 6
      ? (savedOverride.tulipNotes as [string, string, string, string, string, string])
      : baseDefaultConfig.tulipNotes,
  albumPhotos:
    Array.isArray(savedOverride.albumPhotos) && savedOverride.albumPhotos.length > 0
      ? savedOverride.albumPhotos
      : baseDefaultConfig.albumPhotos,
  illustrations: {
    ...baseDefaultConfig.illustrations,
    ...(savedOverride.illustrations || {}),
  },
  illustrationsPublicIds: {
    ...(baseDefaultConfig.illustrationsPublicIds || {}),
    ...(savedOverride.illustrationsPublicIds || {}),
  },
};

