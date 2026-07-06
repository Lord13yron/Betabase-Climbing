// Design tokens translated from the web app's @theme in app/globals.css
// (dark "concrete slate" brand: slate / chalk / plywood). Single source of
// truth for color, type, spacing, and radii in the mobile app.

export const colors = {
  // Core neutrals (cool concrete / slate)
  slate900: '#0e1216',
  slate800: '#151a20',
  slate700: '#1d242c',
  slate600: '#27303a',
  slate500: '#394452',
  slate400: '#5b6776',
  slate300: '#8593a2',

  // Chalk / paper
  chalk50: '#f6f9fb',
  chalk100: '#e7edf2',
  chalk200: '#d3dbe3',
  chalk300: '#b4bfc9',

  // Brand accent (plywood gold)
  plywood700: '#8a6a3a',
  plywood600: '#a47e48',
  plywood500: '#c79f65',
  plywood400: '#d6b47f',
  plywood300: '#e3c99d',
  plywood100: '#f1e4c9',

  // Semantic aliases (mirror :root in app/globals.css)
  bg: '#151a20', // slate800
  bgDeep: '#0e1216', // slate900
  surface: '#1d242c', // slate700
  surfaceHover: '#27303a', // slate600
  hairline: '#394452', // slate500
  hairlineSoft: 'rgba(231, 237, 242, 0.1)',
  fg: '#e7edf2', // chalk100
  fgMuted: '#8593a2', // slate300
  fgFaint: '#5b6776', // slate400
  accent: '#c79f65', // plywood500
  accentHover: '#a47e48', // plywood600
  onAccent: '#1a1206', // dark ink for text on gold
} as const;

// Font family names as registered by expo-font (one family per weight; RN
// does not synthesize weights for custom fonts). Loaded in src/app/_layout.tsx.
export const fonts = {
  // Display (Playfair Display)
  displaySemi: 'PlayfairDisplay_600SemiBold',
  display: 'PlayfairDisplay_700Bold',
  displayItalic: 'PlayfairDisplay_600SemiBold_Italic',
  // UI (Hanken Grotesk)
  ui: 'HankenGrotesk_400Regular',
  uiMedium: 'HankenGrotesk_500Medium',
  uiSemi: 'HankenGrotesk_600SemiBold',
  uiBold: 'HankenGrotesk_700Bold',
  // Mono (IBM Plex Mono)
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  monoSemi: 'IBMPlexMono_600SemiBold',
} as const;

// 4px-based spacing scale, same mental model as the web's Tailwind spacing
// utilities (space(4) === 16, like p-4).
export function space(n: number): number {
  return n * 4;
}

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 28,
} as const;
