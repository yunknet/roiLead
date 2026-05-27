import { useColorScheme } from 'react-native';

export interface ColorTheme {
  readonly background: string;
  readonly card: string;
  readonly cardBorder: string;
  readonly surface: string;
  readonly surfaceHover: string;
  readonly primary: string;
  readonly primaryDark: string;
  readonly primaryLight: string;
  readonly success: string;
  readonly warning: string;
  readonly danger: string;
  readonly purple: string;
  readonly info: string;
  readonly text: string;
  readonly textSecondary: string;
  readonly textMuted: string;
  readonly textDimmed: string;
  readonly timerActive: string;
  readonly timerWaiting: string;
  readonly timerExpired: string;
  readonly colNovos: string;
  readonly colContatados: string;
  readonly colNegociacao: string;
  readonly colFechados: string;
  readonly colPerdidos: string;
  readonly colCustom: string;
  readonly colNovosBg: string;
  readonly colContatadosBg: string;
  readonly colNegociacaoBg: string;
  readonly colFechadosBg: string;
  readonly colPerdidosBg: string;
  readonly colCustomBg: string;
  readonly border: string;
  readonly overlay: string;
  readonly white: string;
  readonly black: string;
  readonly brandGreen: string;
  readonly brandBlue: string;
  readonly shadowColor: string;
  readonly shadowOpacity: number;
}

export const lightColors: ColorTheme = {
  // Backgrounds
  background: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#E2E8F0',
  surface: '#F8FAFC',
  surfaceHover: '#F1F5F9',

  // Primary
  primary: '#2563EB', // Blue 600
  primaryDark: '#1D4ED8', // Blue 700
  primaryLight: '#3B82F6', // Blue 500

  // Status
  success: '#22C55E',
  warning: '#EAB308',
  danger: '#EF4444',
  purple: '#A855F7',
  info: '#06B6D4',

  // Text
  text: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  textDimmed: '#94A3B8',

  // Timer
  timerActive: '#22C55E',
  timerWaiting: '#EAB308',
  timerExpired: '#EF4444',

  // Column colors (mapped from web Tailwind classes)
  colNovos: '#3B82F6',
  colContatados: '#EAB308',
  colNegociacao: '#A855F7',
  colFechados: '#22C55E',
  colPerdidos: '#EF4444',
  colCustom: '#6366F1',

  colNovosBg: 'rgba(59, 130, 246, 0.1)',
  colContatadosBg: 'rgba(234, 179, 8, 0.1)',
  colNegociacaoBg: 'rgba(168, 85, 247, 0.1)',
  colFechadosBg: 'rgba(34, 197, 94, 0.1)',
  colPerdidosBg: 'rgba(239, 68, 68, 0.1)',
  colCustomBg: 'rgba(99, 102, 241, 0.1)',

  // Misc
  border: '#E2E8F0',
  overlay: 'rgba(0, 0, 0, 0.5)',
  white: '#FFFFFF',
  black: '#000000',
  brandGreen: '#81BB3D',
  brandBlue: '#2D3E50',
  shadowColor: '#000000',
  shadowOpacity: 0.08,
};

export const darkColors: ColorTheme = {
  // Backgrounds
  background: '#090B0D', // Matches --background in .dark (HSL 220 20% 4%)
  card: '#101216', // Matches --card in .dark (HSL 220 18% 8%)
  cardBorder: '#1A1D24', // Matches --border in .dark (HSL 220 14% 16%)
  surface: '#15181F', // Matches --muted in .dark
  surfaceHover: '#1D212B',

  // Primary
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primaryLight: '#60A5FA',

  // Status
  success: '#22C55E',
  warning: '#EAB308',
  danger: '#EF4444',
  purple: '#A855F7',
  info: '#06B6D4',

  // Text
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textDimmed: '#64748B',

  // Timer
  timerActive: '#22C55E',
  timerWaiting: '#EAB308',
  timerExpired: '#EF4444',

  // Column colors
  colNovos: '#3B82F6',
  colContatados: '#EAB308',
  colNegociacao: '#A855F7',
  colFechados: '#22C55E',
  colPerdidos: '#EF4444',
  colCustom: '#6366F1',

  colNovosBg: 'rgba(59, 130, 246, 0.15)',
  colContatadosBg: 'rgba(234, 179, 8, 0.15)',
  colNegociacaoBg: 'rgba(168, 85, 247, 0.15)',
  colFechadosBg: 'rgba(34, 197, 94, 0.15)',
  colPerdidosBg: 'rgba(239, 68, 68, 0.15)',
  colCustomBg: 'rgba(99, 102, 241, 0.15)',

  // Misc
  border: '#1E222B',
  overlay: 'rgba(0, 0, 0, 0.7)',
  white: '#FFFFFF',
  black: '#000000',
  brandGreen: '#81BB3D',
  brandBlue: '#FFFFFF',
  shadowColor: '#000000',
  shadowOpacity: 0.4,
};

// Default colors object for static/non-hook files
export const colors = darkColors;

export function useThemeColors(): ColorTheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : lightColors;
}
