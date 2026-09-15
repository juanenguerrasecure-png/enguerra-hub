/**
 * Enguerra of NY — Canonical Family Asset Registry & Expression Resolver
 *
 * Canonical family members:
 * 1. Papa (Juan) - Father / Family Head / Owner (Navy / Rust tone, defining glasses/neat short dark hair)
 * 2. Mabu (Maria) - Mother / Administrator (Oceanic Blue, warm dark brown hair, elegant earrings)
 * 3. Amber - Oldest Daughter (~10 yrs) (Emerald Green, long wavy dark hair, ponytail/hairband)
 * 4. Alexa - Middle Daughter (~7 yrs) (Purple, playful twin pigtails/braids)
 * 5. Adine - Toddler Daughter (~2 yrs) (Sunny Orange/Amber, cute baby bun, rosy cheeks)
 *
 * Distinct Systems:
 * 1. FamilyAvatar: Compact avatar (profile indicator, messenger, participant stack, small member chip).
 * 2. FamilyCharacter: Rich expressive hero, Kids Mode, Hub, Person Focus, rewards, empty states, celebration scenes.
 *
 * Composition Modes:
 * - 'face': Tight close-up for tokens, indicators, small chips
 * - 'portrait': Head and shoulders framed elegantly (cards, lists)
 * - 'upper-body': Torso & hands for interactive dialogues, speech bubbles, task focus
 * - 'full-character': Complete figure for hero panels, person focus, rewards
 * - 'scene': Character integrated with environmental props / backdrop
 *
 * Expression States:
 * - neutral
 * - welcoming
 * - focused
 * - encouraging
 * - loving
 * - gentle
 * - proud
 * - excited
 * - sleepy
 * - celebrate
 */

export type CanonicalMemberKey = 'papa' | 'mabu' | 'amber' | 'alexa' | 'adine';

export type CharacterComposition = 'face' | 'portrait' | 'upper-body' | 'full-character' | 'scene';

export type CharacterExpression =
  | 'neutral'
  | 'welcoming'
  | 'focused'
  | 'encouraging'
  | 'loving'
  | 'gentle'
  | 'proud'
  | 'excited'
  | 'sleepy'
  | 'celebrate';

export interface CharacterIdentity {
  key: CanonicalMemberKey;
  canonicalName: string;
  roleTitle: string;
  defaultColor: string;
  skinTone: string;
  hairColor: string;
  hairStyle: string;
  eyeColor: string;
  definingAccessories: string[];
  ageGroup: 'adult' | 'older-child' | 'young-child' | 'toddler';
  /**
   * Safe contextual expressions that this canonical identity naturally supports.
   * If an unapproved or unsupported expression is requested, the resolver
   * deterministically falls back to the safe contextual expression or omits the figure.
   */
  approvedExpressions: Record<CharacterExpression, boolean>;
}

export const CANONICAL_FAMILY_MEMBERS: Record<CanonicalMemberKey, CharacterIdentity> = {
  papa: {
    key: 'papa',
    canonicalName: 'Papa',
    roleTitle: 'Dad / Family Owner (RN)',
    defaultColor: '#164E35', // Deep Spruce Green (RN Scrubs)
    skinTone: '#E2AC84', // Warm golden Filipino skin tone
    hairColor: '#181615',
    hairStyle: 'Thick wavy layered black anime hair with soft side bangs',
    eyeColor: '#382416', // Warm dark brown anime eyes
    definingAccessories: [
      'Registered Nurse (RN) pocket badge',
      'Dark spruce green medical scrubs with white V-neck undershirt',
      'Pocket pen',
      'Subtle stylish chin stubble (5 o\'clock shadow)',
    ],
    ageGroup: 'adult',
    approvedExpressions: {
      neutral: true, // "MY MODE ON" (Arms crossed, confident smile)
      welcoming: true, // Welcoming warm smile
      focused: true, // "LET ME CHECK" (Notepad & pen under chin)
      encouraging: true,
      loving: true,
      gentle: true, // "MY MODE OFF" (Gentle relaxed rest)
      proud: true,
      excited: true, // "SELFIE TIME!" (Wink, peace sign, smartphone)
      sleepy: true, // "I NEED MY COFFEE..." (Coffee mug with EKG line, cute yawn)
      celebrate: true, // "PERFECT" (OK hand sign, winking, gold sparkle stars)
    },
  },
  mabu: {
    key: 'mabu',
    canonicalName: 'Mabu',
    roleTitle: 'Mom / Family Admin',
    defaultColor: '#0284C7', // Oceanic Blue
    skinTone: '#E8B68E',
    hairColor: '#221C19',
    hairStyle: 'Shoulder-length lustrous dark waves',
    eyeColor: '#2C211A',
    definingAccessories: ['Minimalist gold droplet earrings', 'Warm cardigan'],
    ageGroup: 'adult',
    approvedExpressions: {
      neutral: true,
      welcoming: true,
      focused: true,
      encouraging: true,
      loving: true,
      gentle: true,
      proud: true,
      excited: false, // Contextual fallback -> welcoming
      sleepy: false,  // Contextual fallback -> gentle
      celebrate: true,
    },
  },
  amber: {
    key: 'amber',
    canonicalName: 'Amber',
    roleTitle: 'Oldest Daughter',
    defaultColor: '#16A34A', // Emerald
    skinTone: '#E4AB80',
    hairColor: '#1C1917',
    hairStyle: 'Long dark brown ponytail with emerald hair tie',
    eyeColor: '#291E18',
    definingAccessories: ['Emerald hair ribbon', 'Student canvas satchel'],
    ageGroup: 'older-child',
    approvedExpressions: {
      neutral: true,
      welcoming: true,
      focused: true,
      encouraging: true,
      loving: true,
      gentle: true,
      proud: true,
      excited: true,
      sleepy: true,
      celebrate: true,
    },
  },
  alexa: {
    key: 'alexa',
    canonicalName: 'Alexa',
    roleTitle: 'Middle Daughter',
    defaultColor: '#9333EA', // Purple
    skinTone: '#E9B387',
    hairColor: '#1C1917',
    hairStyle: 'Playful twin braided pigtails with purple clips',
    eyeColor: '#2D201A',
    definingAccessories: ['Purple flower hair clips', 'Artistic smock / badges'],
    ageGroup: 'young-child',
    approvedExpressions: {
      neutral: true,
      welcoming: true,
      focused: true,
      encouraging: true,
      loving: true,
      gentle: true,
      proud: true,
      excited: true,
      sleepy: true,
      celebrate: true,
    },
  },
  adine: {
    key: 'adine',
    canonicalName: 'Adine',
    roleTitle: 'Youngest Daughter',
    defaultColor: '#F59E0B', // Sunny Orange / Amber
    skinTone: '#ECC097',
    hairColor: '#201A17',
    hairStyle: 'Adorable top-knot baby bun',
    eyeColor: '#2C211B',
    definingAccessories: ['Sunny yellow hair bow', 'Star pacifier clip'],
    ageGroup: 'toddler',
    approvedExpressions: {
      neutral: true,
      welcoming: true,
      focused: false, // Contextual fallback -> gentle
      encouraging: false, // Contextual fallback -> excited
      loving: true,
      gentle: true,
      proud: false, // Contextual fallback -> excited
      excited: true,
      sleepy: true,
      celebrate: true,
    },
  },
};

/**
 * Expression Fallback Matrix
 * Strictly adheres to rule: "Do not randomly select expressions.
 * If an approved expression does not exist: use the canonical master only where
 * its existing expression is contextually appropriate; otherwise omit the large character."
 */
export const EXPRESSION_FALLBACK_MATRIX: Record<CharacterExpression, CharacterExpression> = {
  neutral: 'neutral',
  welcoming: 'neutral',
  focused: 'neutral',
  encouraging: 'welcoming',
  loving: 'gentle',
  gentle: 'neutral',
  proud: 'welcoming',
  excited: 'welcoming',
  sleepy: 'gentle',
  celebrate: 'welcoming',
};

/**
 * Member key normalizer for resolving incoming strings from API/Sheets (e.g. 'juan', 'maria', 'mem-amber-child')
 */
export function resolveCanonicalMemberKey(input?: string | null): CanonicalMemberKey {
  if (!input) return 'papa';
  const lower = input.toLowerCase().trim();

  if (lower.includes('papa') || lower.includes('juan') || lower.includes('dad') || lower.includes('owner')) {
    return 'papa';
  }
  if (lower.includes('mabu') || lower.includes('maria') || lower.includes('mom') || lower.includes('admin')) {
    return 'mabu';
  }
  if (lower.includes('amber')) {
    return 'amber';
  }
  if (lower.includes('alexa')) {
    return 'alexa';
  }
  if (lower.includes('adine')) {
    return 'adine';
  }
  return 'papa';
}

/**
 * Deterministic Expression Resolver
 */
export function resolveApprovedExpression(
  memberKey: CanonicalMemberKey,
  requestedExpression?: CharacterExpression | string
): { expression: CharacterExpression; isExact: boolean; canRenderCharacter: boolean } {
  const identity = CANONICAL_FAMILY_MEMBERS[memberKey];
  if (!identity) {
    return { expression: 'neutral', isExact: false, canRenderCharacter: true };
  }

  const safeExpression = (requestedExpression || 'welcoming') as CharacterExpression;
  if (identity.approvedExpressions[safeExpression]) {
    return { expression: safeExpression, isExact: true, canRenderCharacter: true };
  }

  // Check deterministic context fallback
  const fallback = EXPRESSION_FALLBACK_MATRIX[safeExpression];
  if (fallback && identity.approvedExpressions[fallback]) {
    return { expression: fallback, isExact: false, canRenderCharacter: true };
  }

  return { expression: 'neutral', isExact: false, canRenderCharacter: true };
}

/**
 * Papa's Canonical Sticker Collection
 * Direct representation of the 6 canonical RN nurse sticker illustrations
 */
export interface PapaStickerPose {
  id: string;
  expression: CharacterExpression;
  title: string;
  tagline: string;
  description: string;
  badgeLabel: string;
  badgeColor: string;
}

export const PAPA_CANONICAL_STICKERS: PapaStickerPose[] = [
  {
    id: 'my-mode-on',
    expression: 'neutral',
    title: 'My Mode ON',
    tagline: 'Ready for action & family leadership',
    description: 'Arms crossed, confident warm smile in dark spruce green RN scrubs.',
    badgeLabel: 'MODE ON',
    badgeColor: '#22C55E', // Bright green
  },
  {
    id: 'i-need-coffee',
    expression: 'sleepy',
    title: 'I Need My Coffee...',
    tagline: 'Morning shift energy booster',
    description: 'Holding steaming black mug with white EKG line, charming yawn.',
    badgeLabel: 'COFFEE FIRST',
    badgeColor: '#F59E0B', // Amber
  },
  {
    id: 'let-me-check',
    expression: 'focused',
    title: 'Let Me Check',
    tagline: 'Reviewing chores & daily rounds',
    description: 'Notepad & pen under chin, thoughtful gaze with question bubble.',
    badgeLabel: 'CHECKLIST',
    badgeColor: '#3B82F6', // Blue
  },
  {
    id: 'perfect',
    expression: 'celebrate',
    title: 'PERFECT!',
    tagline: 'Tasks approved & stars granted',
    description: 'Radiant wink, OK hand sign, and shimmering gold stars.',
    badgeLabel: 'APPROVED',
    badgeColor: '#EAB308', // Gold
  },
  {
    id: 'selfie-time',
    expression: 'excited',
    title: 'Selfie Time!',
    tagline: 'Family album memory maker',
    description: 'Holding iPhone, joyful wink and peace sign.',
    badgeLabel: 'SMILE!',
    badgeColor: '#06B6D4', // Cyan
  },
  {
    id: 'mode-off',
    expression: 'gentle',
    title: 'My Mode OFF',
    tagline: 'Off duty & relaxing at home',
    description: 'Sweet resting pose, eyes closed with ZZZ red power-off badge.',
    badgeLabel: 'REST MODE',
    badgeColor: '#EF4444', // Red
  },
];

