import React, { useState } from 'react';
import {
  CanonicalMemberKey,
  resolveCanonicalMemberKey,
  CANONICAL_FAMILY_MEMBERS,
} from '../../lib/familyAssets';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'touchAdult' | 'touchKids' | 'touchHub';

export interface FamilyAvatarProps {
  /** Member key, identifier, or full member object */
  member?: string | { First_Name?: string; Last_Name?: string; Display_Name?: string; Avatar_Key?: string; Avatar_URL?: string; Color?: string } | null;
  size?: AvatarSize;
  showBorder?: boolean;
  shape?: 'squircle' | 'circle' | 'roundedRect';
  badge?: React.ReactNode;
  className?: string;
  onClick?: () => void;
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
 * FamilyAvatar
 * High-performance, clean photo profile component:
 * - If user uploaded a profile photo (Avatar_URL), displays the real photo.
 * - If no photo uploaded, displays a clean typography monogram/initials badge with member's theme color.
 * - No cartoon or illustrated avatars forced on users.
 */
export const FamilyAvatar: React.FC<FamilyAvatarProps> = ({
  member,
  size = 'md',
  showBorder = true,
  shape = 'squircle',
  badge,
  className = '',
  onClick,
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

  // Size configurations
  let sizeClasses = 'w-10 h-10 text-xs font-bold';
  if (size === 'xs') sizeClasses = 'w-6 h-6 text-[10px] font-bold';
  if (size === 'sm') sizeClasses = 'w-8 h-8 text-[11px] font-bold';
  if (size === 'lg') sizeClasses = 'w-12 h-12 text-sm font-bold';
  if (size === 'xl') sizeClasses = 'w-16 h-16 text-lg font-bold';
  if (size === 'touchAdult') sizeClasses = 'min-w-[44px] min-h-[44px] w-11 h-11 text-sm font-bold';
  if (size === 'touchKids') sizeClasses = 'min-w-[48px] min-h-[48px] w-12 h-12 text-base font-bold';
  if (size === 'touchHub') sizeClasses = 'min-w-[56px] min-h-[56px] w-14 h-14 text-lg font-bold';

  // Shape contours
  let shapeClass = 'rounded-[12px]';
  if (shape === 'circle') shapeClass = 'rounded-full';
  if (shape === 'roundedRect') shapeClass = 'rounded-[8px]';

  const borderClass = showBorder ? 'border border-[#E5E4E1] shadow-xs' : '';
  const hasValidPhoto = Boolean(customUrl && customUrl.trim() && !imgError);

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${
        onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
      } ${className}`}
    >
      <div
        className={`${sizeClasses} ${shapeClass} ${borderClass} overflow-hidden flex items-center justify-center relative transition-transform`}
        style={{
          backgroundColor: hasValidPhoto ? '#F3F4F6' : accentColor,
          color: '#FFFFFF',
        }}
        title={fullName}
      >
        {hasValidPhoto ? (
          <img
            src={customUrl}
            alt={fullName}
            className="w-full h-full object-cover object-center"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="tracking-tight select-none uppercase font-bold text-white drop-shadow-xs">
            {initials}
          </span>
        )}
      </div>

      {badge && (
        <div className="absolute -bottom-1 -right-1 z-10">
          {badge}
        </div>
      )}
    </div>
  );
};
