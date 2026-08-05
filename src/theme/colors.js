// Background is warm off-white, teal is informational, red is reserved
// strictly for SOS/emergency actions, amber = warning, green = success.

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

  // Informational (primary) - deep teal
  primary: '#005155',
  onPrimary: '#FFFFFF',
  primaryContainer: '#006B70',
  onPrimaryContainer: '#98E9EE',

  // Emergency (secondary) - reserved for SOS only
  secondary: '#B6171E',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#DA3433',
  onSecondaryContainer: '#FFFBFF',
  secondaryDark: '#930010',

  // Warning (tertiary) - amber
  tertiary: '#F57C00',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#984B00',
  onTertiaryContainer: '#FFD2B7',

  // Success - grounded green
  success: '#2E7D32',
  onSuccess: '#FFFFFF',

  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#93000A',

  // Neutrals used for "black/white" high-contrast UI elements in the mocks
  ink: '#000000',
  onInk: '#FFFFFF',
  white: '#FFFFFF',

  cardBorder: '#E0E0E0',
  overlay: 'rgba(0,0,0,0.05)',
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
};

export default { light, dark };
