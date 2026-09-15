/**
 * Enguerra of NY — Authoritative Design Tokens
 * Strictly locked visual system tokens
 */

export const ENGUERRA_COLORS = {
  // Module & Functional Color Tokens
  today: '#245F83',
  calendar: '#7A5AF8',
  tasks: '#3F9D68',
  family: '#E16F7C',
  shopping: '#D9962A',
  messages: '#3A80DE',
  meals: '#F28C4B',
  documents: '#4968C6',
  more: '#74808C',

  // Background & Surfaces
  background: '#F7F6F4',
  surface: '#FFFFFF',
  border: '#E5E4E1',

  // Typography Contrast Levels
  textPrimary: '#1C1E21',
  textSecondary: '#5B6169',
  textMuted: '#8A8F98',

  // Functional Semantic Accents
  success: '#3F9D68',
  warning: '#D9962A',
  danger: '#E16F7C',
  info: '#3A80DE',
} as const;

export type EnguerraModuleColorKey =
  | 'today'
  | 'calendar'
  | 'tasks'
  | 'family'
  | 'shopping'
  | 'messages'
  | 'meals'
  | 'documents'
  | 'more';

export const TOUCH_SIZES = {
  adult: 'min-h-[44px] min-w-[44px]',
  kids: 'min-h-[48px] min-w-[48px]',
  hub: 'min-h-[56px] min-w-[56px]',
} as const;

export const RADIUS = {
  card: 'rounded-[16px]',
  hero: 'rounded-[20px] sm:rounded-[24px]',
  button: 'rounded-[12px]',
  pill: 'rounded-full',
} as const;
