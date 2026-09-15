import React from 'react';
import { FamilyMember } from '../../../types';
import { FamilyAvatar } from '../../ui/FamilyAvatar';
import { Users, Check } from 'lucide-react';

export interface ContextualMemberChipsProps {
  members: FamilyMember[];
  selectedMemberId: string; // 'ALL' or Member_ID
  onSelectMember: (memberId: string) => void;
  eventCounts?: Record<string, number>;
  compact?: boolean;
  className?: string;
}

export const ContextualMemberChips: React.FC<ContextualMemberChipsProps> = ({
  members,
  selectedMemberId,
  onSelectMember,
  eventCounts = {},
  compact = false,
  className = '',
}) => {
  const allCount: number = Object.values(eventCounts).reduce<number>((a: number, b: number) => a + (b || 0), 0);

  return (
    <div
      className={`flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-0.5 ${className}`}
      role="tablist"
      aria-label="Filter by family member"
    >
      {/* Universal 'All Family' chip */}
      <button
        type="button"
        role="tab"
        aria-selected={selectedMemberId === 'ALL'}
        onClick={() => onSelectMember('ALL')}
        className={`group relative shrink-0 inline-flex items-center gap-2 rounded-full font-medium transition-all select-none min-h-[44px] ${
          compact ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-xs sm:text-sm'
        } ${
          selectedMemberId === 'ALL'
            ? 'bg-[#1C1E21] text-white shadow-xs ring-2 ring-[#1C1E21]/20 font-semibold'
            : 'bg-white text-[#5B6169] border border-[#E5E4E1] hover:text-[#1C1E21] hover:border-[#8A8F98]/50 hover:bg-[#F7F6F4]'
        }`}
      >
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 transition-colors ${
            selectedMemberId === 'ALL' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
        </div>
        <span className="whitespace-nowrap">All Family</span>
        {allCount > 0 && (
          <span
            className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
              selectedMemberId === 'ALL' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
            }`}
          >
            {allCount}
          </span>
        )}
      </button>

      {/* Contextual Family Member Character Chips */}
      {members.map(member => {
        const isSelected = selectedMemberId === member.Member_ID;
        const count = eventCounts[member.Member_ID] || 0;
        const memberColor = member.Color || '#7A5AF8';

        return (
          <button
            key={member.Member_ID}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelectMember(member.Member_ID)}
            className={`group relative shrink-0 inline-flex items-center gap-2 rounded-full transition-all select-none min-h-[44px] ${
              compact ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-xs sm:text-sm'
            } ${
              isSelected
                ? 'bg-white text-[#1C1E21] font-semibold border-2 shadow-xs'
                : 'bg-white text-[#5B6169] border border-[#E5E4E1] hover:text-[#1C1E21] hover:border-[#8A8F98]/50 hover:bg-[#F7F6F4]'
            }`}
            style={{
              borderColor: isSelected ? memberColor : undefined,
              boxShadow: isSelected ? `0 0 0 3px ${memberColor}22` : undefined,
            }}
          >
            <div className="relative shrink-0">
              <FamilyAvatar
                member={member}
                size="xs"
                shape="circle"
                showBorder={false}
              />
              {isSelected && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: memberColor }}
                >
                  <Check className="w-2 h-2 stroke-[3]" />
                </span>
              )}
            </div>

            <span className="whitespace-nowrap">
              {member.First_Name || member.Display_Name}
            </span>

            {count > 0 && (
              <span
                className="text-[11px] px-1.5 py-0.2 rounded-full font-bold text-white shrink-0"
                style={{
                  backgroundColor: isSelected ? memberColor : `${memberColor}CC`,
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
