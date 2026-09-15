import React, { useState } from 'react';
import {
  CanonicalMemberKey,
  CharacterComposition,
  CharacterExpression,
  resolveCanonicalMemberKey,
  CANONICAL_FAMILY_MEMBERS,
} from '../../lib/familyAssets';
import { Camera, User } from 'lucide-react';

export interface FamilyCharacterProps {
  /** Member key, identifier, or full member object */
  member?: string | { First_Name?: string; Last_Name?: string; Display_Name?: string; Avatar_Key?: string; Avatar_URL?: string; Color?: string } | null;
  composition?: CharacterComposition;
  expression?: CharacterExpression;
  speechBubble?: string;
  badge?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showPedestal?: boolean;
}

function getInitials(name?: string, firstName?: string, lastName?: string): string {
  if (firstName && lastName) {
    return (firstName[0] + lastName[0]).toUpperCase();
  }
  if (firstName) {
    return firstName.slice(0, 2).toUpperCase();
  }
  if (!name || !name.trim()) return '?';
  const clean = name.replace(/\(.*?\)/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 1).toUpperCase();
}

/**
 * FamilyCharacter
 * Photo Profile display component:
 * - If user uploaded a profile photo, displays the photo with high-fidelity framing.
 * - If no photo uploaded, displays a clean monogram avatar card.
 * - Cartoon / illustrated avatars are removed per design direction.
 */
export const FamilyCharacter: React.FC<FamilyCharacterProps> = ({
  member,
  speechBubble,
  badge,
  className = '',
  size = 'md',
}) => {
  const [imgError, setImgError] = useState(false);

  let memberKeyInput: string | undefined;
  let customUrl: string | undefined;
  let customColor: string | undefined;
  let firstName: string | undefined;
  let lastName: string | undefined;
  let displayName: string | undefined;

  if (typeof member === 'string') {
    memberKeyInput = member;
    displayName = member;
  } else if (member && typeof member === 'object') {
    memberKeyInput = member.Avatar_Key || member.First_Name || member.Display_Name;
    customUrl = member.Avatar_URL;
    customColor = member.Color;
    firstName = member.First_Name;
    lastName = member.Last_Name;
    displayName = member.Display_Name || member.First_Name;
  }

  const canonicalKey = resolveCanonicalMemberKey(memberKeyInput);
  const identity = CANONICAL_FAMILY_MEMBERS[canonicalKey];
  const accentColor = customColor || identity?.defaultColor || '#164E35';
  const fullName = displayName || identity?.canonicalName || 'Family Member';
  const initials = getInitials(fullName, firstName, lastName);

  // Size specifications
  let containerDimensions = 'w-32 h-36';
  let avatarSize = 'w-20 h-20 text-2xl';
  if (size === 'sm') {
    containerDimensions = 'w-24 h-28';
    avatarSize = 'w-14 h-14 text-lg';
  }
  if (size === 'lg') {
    containerDimensions = 'w-40 h-44';
    avatarSize = 'w-24 h-24 text-3xl';
  }
  if (size === 'hero') {
    containerDimensions = 'w-48 h-52';
    avatarSize = 'w-28 h-28 text-4xl';
  }

  const hasValidPhoto = Boolean(customUrl && customUrl.trim() && !imgError);

  return (
    <div className={`relative inline-flex flex-col items-center select-none ${className}`}>
      {/* Optional Speech Bubble */}
      {speechBubble && (
        <div className="mb-2.5 relative animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white border border-[#E5E4E1] shadow-xs px-3.5 py-1.5 rounded-2xl text-xs font-bold text-[#1C1E21] max-w-[200px] text-center">
            {speechBubble}
          </div>
          <div className="w-2.5 h-2.5 bg-white border-b border-r border-[#E5E4E1] rotate-45 mx-auto -mt-1.5 shadow-xs" />
        </div>
      )}

      {/* Main Container */}
      <div
        className={`${containerDimensions} rounded-2xl relative flex flex-col items-center justify-center p-3 border border-stone-200 bg-white shadow-xs overflow-hidden`}
      >
        {hasValidPhoto ? (
          <img
            src={customUrl}
            alt={fullName}
            className="w-full h-full object-cover rounded-xl"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center">
            <div
              className={`${avatarSize} rounded-2xl flex items-center justify-center text-white font-bold shadow-xs mb-1.5`}
              style={{ backgroundColor: accentColor }}
            >
              {initials}
            </div>
            <span className="text-xs font-bold text-stone-800 line-clamp-1 max-w-[110px]">{fullName}</span>
          </div>
        )}

        {badge && (
          <div className="absolute top-2 right-2 z-10">
            {badge}
          </div>
        )}
      </div>
    </div>
  );
};
