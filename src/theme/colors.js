
export const light = {
  background: '#FAFAFA',
  onBackground: '#181C1D',

  surface: '#FAFAFA',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F1F4F4',
  surfaceContainer: '#F0F0F0',
  surfaceContainerHigh: '#E6E9E8',
  surfaceContainerHighest: '#E0E3E3',
  surfaceVariant: '#F5F5F5',

  onSurface: '#181C1D',
  onSurfaceVariant: '#3E4949',

  outline: '#757575',
  outlineVariant: '#E0E0E0',

  primary: '#005155',
  onPrimary: '#FFFFFF',
  primaryContainer: '#006B70',
  onPrimaryContainer: '#98E9EE',

  secondary: '#B6171E',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#DA3433',
  onSecondaryContainer: '#FFFBFF',
  secondaryDark: '#930010',

  tertiary: '#F57C00',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#984B00',
  onTertiaryContainer: '#FFD2B7',

  success: '#2E7D32',
  onSuccess: '#FFFFFF',

  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#93000A',

  ink: '#000000',
  onInk: '#FFFFFF',
  white: '#FFFFFF',

  cardBorder: '#E0E0E0',
  overlay: 'rgba(0,0,0,0.05)',
  // Nested aliases (New Test design tokens) — keep in sync with Material names
  bg: {
    primary: '#FAFAFA',
    secondary: '#FFFFFF',
    tertiary: '#F1F4F4',
    input: '#FFFFFF',
    dim: '#E0E3E3',
  },
  accent: {
    primary: '#005155',
    primaryContainer: '#006B70',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#98E9EE',
    teal: '#006B70',
    tealBright: '#83D3D9',
    blue: '#3B82F6',
  },
  status: {
    critical: '#B6171E',
    criticalBright: '#DA3433',
    criticalDim: 'rgba(182,23,30,0.12)',
    warning: '#F57C00',
    warningDim: 'rgba(245,124,0,0.12)',
    success: '#2E7D32',
    successDim: 'rgba(46,125,50,0.12)',
    info: '#006B70',
    infoDim: 'rgba(0,107,112,0.12)',
  },
  text: {
    primary: '#181C1D',
    secondary: '#3E4949',
    tertiary: '#6E797A',
    inverse: '#FFFFFF',
  },
  border: {
    subtle: '#E0E3E3',
    default: '#BEC9C9',
    strong: '#6E797A',
  },
  radar: {
    bg: '#F1F4F4',
    grid: 'rgba(0,107,112,0.10)',
    sweep: 'rgba(0,107,112,0.15)',
    pinLive: '#B6171E',
    pinUnconfirmed: '#F57C00',
    pinResolved: '#2E7D32',
    pinSelf: '#005155',
    ringNear: 'rgba(0,107,112,0.25)',
    ringMid: 'rgba(0,107,112,0.15)',
  },
};

export const dark = {
  background: '#121414',
  onBackground: '#E2E2E2',

  surface: '#121414',
  surfaceContainerLowest: '#0D0F0F',
  surfaceContainerLow: '#1A1C1C',
  surfaceContainer: '#1E2020',
  surfaceContainerHigh: '#282A2A',
  surfaceContainerHighest: '#333535',
  surfaceVariant: '#333535',

  onSurface: '#E2E2E2',
  onSurfaceVariant: '#C4C7C8',

  outline: '#8E9192',
  outlineVariant: '#444748',

  primary: '#83D3D9',
  onPrimary: '#00363A',
  primaryContainer: '#004F53',
  onPrimaryContainer: '#98E9EE',

  secondary: '#FFB3AF',
  onSecondary: '#68000F',
  secondaryContainer: '#B10221',
  onSecondaryContainer: '#FFBDBA',
  secondaryDark: '#930019',

  tertiary: '#FFB786',
  onTertiary: '#4B2500',
  tertiaryContainer: '#723600',
  onTertiaryContainer: '#FFD2B7',

  success: '#8ED99A',
  onSuccess: '#0A3910',

  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',

  ink: '#FFFFFF',
  onInk: '#121414',
  white: '#1E2020',

  cardBorder: '#333535',
  overlay: 'rgba(255,255,255,0.06)',
  // Nested aliases (New Test design tokens) — dark variants
  bg: {
    primary: '#121414',
    secondary: '#1A1C1C',
    tertiary: '#1E2020',
    input: '#1A1C1C',
    dim: '#333535',
  },
  accent: {
    primary: '#83D3D9',
    primaryContainer: '#004F53',
    onPrimary: '#00363A',
    onPrimaryContainer: '#98E9EE',
    teal: '#83D3D9',
    tealBright: '#98E9EE',
    blue: '#60A5FA',
  },
  status: {
    critical: '#FF5252',
    criticalBright: '#FF8A80',
    criticalDim: 'rgba(255,82,82,0.15)',
    warning: '#FFB74D',
    warningDim: 'rgba(255,183,116,0.15)',
    success: '#8ED99A',
    successDim: 'rgba(142,217,154,0.15)',
    info: '#83D3D9',
    infoDim: 'rgba(131,211,217,0.12)',
  },
  text: {
    primary: '#E2E2E2',
    secondary: '#C4C7C8',
    tertiary: '#8E9192',
    inverse: '#121414',
  },
  border: {
    subtle: '#333535',
    default: '#444748',
    strong: '#8E9192',
  },
  radar: {
    bg: '#1E2020',
    grid: 'rgba(131,211,217,0.10)',
    sweep: 'rgba(131,211,217,0.15)',
    pinLive: '#FF5252',
    pinUnconfirmed: '#FFB74D',
    pinResolved: '#8ED99A',
    pinSelf: '#83D3D9',
    ringNear: 'rgba(131,211,217,0.25)',
    ringMid: 'rgba(131,211,217,0.15)',
  },
};

export default { light, dark };
