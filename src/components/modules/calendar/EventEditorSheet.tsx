import React, { useState, useEffect } from 'react';
import { CalendarEvent, FamilyMember } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { FamilyAvatar } from '../../ui/FamilyAvatar';
import { ENGUERRA_COLORS } from '../../../lib/tokens';
import {
  X,
  Clock,
  MapPin,
  Repeat,
  Shield,
  Trash2,
  Calendar as CalendarIcon,
  Tag,
  AlignLeft,
  Check,
  AlertCircle
} from 'lucide-react';
import { CATEGORY_STYLES } from './calendarUtils';

export interface EventEditorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: Partial<CalendarEvent>) => Promise<void>;
  onDelete?: (eventId: string) => Promise<void>;
  initialEvent?: CalendarEvent | null;
  defaultDate?: string; // YYYY-MM-DD
  members: FamilyMember[];
  isMobile?: boolean;
}

export const EventEditorSheet: React.FC<EventEditorSheetProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialEvent,
  defaultDate,
  members,
  isMobile = false,
}) => {
  const { session } = useAuth();
  const isEditing = Boolean(initialEvent && initialEvent.Event_ID);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<CalendarEvent['Category']>('FAMILY');
  const [visibility, setVisibility] = useState<CalendarEvent['Visibility']>('FAMILY');
  const [recurrenceRule, setRecurrenceRule] = useState<'NONE' | 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'SCHOOL_DAYS'>('NONE');
  const [recurrenceUntil, setRecurrenceUntil] = useState('');
  const [assignedMembers, setAssignedMembers] = useState<string[]>([]);
  const [color, setColor] = useState('#7A5AF8');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form state when opened
  useEffect(() => {
    if (!isOpen) return;

    if (initialEvent) {
      setTitle(initialEvent.Title || '');
      setDescription(initialEvent.Description || '');

      const start = new Date(initialEvent.Start_Time);
      const end = new Date(initialEvent.End_Time);

      const yyyy = start.getFullYear();
      const mm = String(start.getMonth() + 1).padStart(2, '0');
      const dd = String(start.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);

      const startH = String(start.getHours()).padStart(2, '0');
      const startM = String(start.getMinutes()).padStart(2, '0');
      setStartTime(`${startH}:${startM}`);

      const endH = String(end.getHours()).padStart(2, '0');
      const endM = String(end.getMinutes()).padStart(2, '0');
      setEndTime(`${endH}:${endM}`);

      setLocation(initialEvent.Location || '');
      setCategory(initialEvent.Category || 'FAMILY');
      setVisibility(initialEvent.Visibility || 'FAMILY');
      setRecurrenceRule(initialEvent.Recurrence_Rule || 'NONE');
      setRecurrenceUntil(initialEvent.Recurrence_Until ? initialEvent.Recurrence_Until.slice(0, 10) : '');
      setAssignedMembers(initialEvent.Assigned_Members || []);
      setColor(initialEvent.Color || '#7A5AF8');
    } else {
      setTitle('');
      setDescription('');
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
      setStartTime('09:00');
      setEndTime('10:00');
      setLocation('');
      setCategory('FAMILY');
      setVisibility('FAMILY');
      setRecurrenceRule('NONE');
      setRecurrenceUntil('');
      setAssignedMembers(session?.member.Member_ID ? [session.member.Member_ID] : []);
      setColor('#7A5AF8');
    }
    setError(null);
  }, [isOpen, initialEvent, defaultDate, session?.member.Member_ID]);

  if (!isOpen) return null;

  const canDelete = isEditing && (session?.isParent || initialEvent?.Created_By === session?.member.Member_ID);

  const toggleMember = (memberId: string) => {
    setAssignedMembers(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide an event title.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Build ISO strings
      const startIso = new Date(`${date}T${startTime}:00`).toISOString();
      const endIso = new Date(`${date}T${endTime}:00`).toISOString();

      const payload: Partial<CalendarEvent> = {
        Title: title.trim(),
        Description: description.trim(),
        Start_Time: startIso,
        End_Time: endIso,
        Location: location.trim(),
        Category: category,
        Visibility: visibility,
        Color: color,
        Assigned_Members: assignedMembers.length > 0 ? assignedMembers : (session?.member.Member_ID ? [session.member.Member_ID] : []),
        Recurrence_Rule: recurrenceRule,
        Recurrence_Until: recurrenceRule !== 'NONE' && recurrenceUntil ? `${recurrenceUntil}T23:59:59.000Z` : null,
      };

      if (isEditing && initialEvent) {
        payload.Event_ID = initialEvent.Event_ID;
      }

      await onSave(payload);
      onClose();
    } catch (err: any) {
      console.error('Failed to save event:', err);
      setError(err?.message || 'Failed to save event. Please check inputs.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initialEvent || !onDelete) return;
    if (!confirm('Are you sure you want to remove this event from the family calendar?')) return;

    setDeleting(true);
    try {
      await onDelete(initialEvent.Event_ID);
      onClose();
    } catch (err: any) {
      console.error('Failed to delete event:', err);
      setError(err?.message || 'Failed to delete event.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs transition-opacity p-0 sm:p-4">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Sheet / Modal Container */}
      <div
        className={`relative z-10 w-full bg-white transition-all flex flex-col max-h-[92vh] sm:max-h-[88vh] ${
          isMobile
            ? 'rounded-t-[24px] border-t border-[#E5E4E1] shadow-2xl pb-safe animate-in slide-in-from-bottom duration-200'
            : 'sm:max-w-xl rounded-[20px] border border-[#E5E4E1] shadow-xl animate-in zoom-in-95 duration-150'
        }`}
      >
        {/* Mobile Pull Handle */}
        {isMobile && (
          <div className="w-full flex justify-center pt-3 pb-1">
            <div className="w-12 h-1.5 rounded-full bg-stone-300" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E4E1]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#7A5AF8]/10 text-[#7A5AF8] flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1C1E21] tracking-tight">
                {isEditing ? 'Edit Family Event' : 'Schedule Family Event'}
              </h2>
              <p className="text-[11px] text-[#5B6169]">
                Live synchronization with Enguerra Family Google Sheets
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#5B6169] hover:text-[#1C1E21] hover:bg-stone-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[#1C1E21] mb-1.5">
              Event Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus={!isMobile}
              placeholder="e.g. Amber Soccer Match, Alexa Swim Lesson, Family Dinner"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E4E1] text-[#1C1E21] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#7A5AF8] focus:border-transparent text-sm min-h-[44px]"
            />
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#1C1E21] mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#5B6169]" />
              <span>Category</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(['FAMILY', 'SCHOOL', 'ACTIVITY', 'WORK', 'APPOINTMENT', 'SPECIAL'] as const).map(catKey => {
                const style = CATEGORY_STYLES[catKey];
                const isSelected = category === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => {
                      setCategory(catKey);
                      setColor(style.dot);
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium border transition-all min-h-[44px] ${
                      isSelected
                        ? 'border-[#7A5AF8] bg-[#7A5AF8]/10 text-[#1C1E21] font-bold shadow-xs'
                        : 'border-[#E5E4E1] bg-white text-[#5B6169] hover:bg-stone-50'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full mb-1" style={{ backgroundColor: style.dot }} />
                    <span className="text-[11px] truncate max-w-full">{style.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date and Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1C1E21] mb-1.5 flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5 text-[#5B6169]" />
                <span>Date</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E4E1] text-[#1C1E21] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#7A5AF8] min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1E21] mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#5B6169]" />
                <span>Start Time</span>
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E4E1] text-[#1C1E21] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#7A5AF8] min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1E21] mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#5B6169]" />
                <span>End Time</span>
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E4E1] text-[#1C1E21] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#7A5AF8] min-h-[44px]"
              />
            </div>
          </div>

          {/* Recurrence Selector */}
          <div className="p-3.5 rounded-xl bg-stone-50 border border-[#E5E4E1] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-[#7A5AF8]" />
                <span className="text-xs font-bold text-[#1C1E21]">Recurrence & Repeat</span>
              </div>
              <span className="text-[11px] text-[#5B6169]">Repeats automatically</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'NONE', label: 'Does not repeat' },
                { id: 'DAILY', label: 'Every Day' },
                { id: 'SCHOOL_DAYS', label: 'School Days (Mon-Fri)' },
                { id: 'WEEKLY', label: 'Every Week' },
                { id: 'BIWEEKLY', label: 'Every 2 Weeks' },
                { id: 'MONTHLY', label: 'Every Month' },
              ].map(rec => (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() => setRecurrenceRule(rec.id as any)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all min-h-[44px] ${
                    recurrenceRule === rec.id
                      ? 'border-[#7A5AF8] bg-white text-[#7A5AF8] font-bold shadow-xs'
                      : 'border-[#E5E4E1] bg-white text-[#5B6169] hover:border-stone-300'
                  }`}
                >
                  {rec.label}
                </button>
              ))}
            </div>

            {recurrenceRule !== 'NONE' && (
              <div className="pt-2 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-xs text-[#5B6169] shrink-0 font-medium">
                  Repeat until (optional):
                </label>
                <input
                  type="date"
                  value={recurrenceUntil}
                  min={date}
                  onChange={e => setRecurrenceUntil(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-[#E5E4E1] text-xs bg-white text-[#1C1E21] focus:ring-2 focus:ring-[#7A5AF8]"
                />
              </div>
            )}
          </div>

          {/* Assigned Members (Contextual Character Chips) */}
          <div>
            <label className="block text-xs font-semibold text-[#1C1E21] mb-1.5">
              Assigned Family Members
            </label>
            <p className="text-[11px] text-[#5B6169] mb-2">
              Select who attends or participates in this event
            </p>
            <div className="flex flex-wrap gap-2">
              {members.map(m => {
                const isSelected = assignedMembers.includes(m.Member_ID);
                const memberColor = m.Color || '#7A5AF8';
                return (
                  <button
                    key={m.Member_ID}
                    type="button"
                    onClick={() => toggleMember(m.Member_ID)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium border transition-all min-h-[44px] ${
                      isSelected
                        ? 'bg-white text-[#1C1E21] font-bold border-2 shadow-xs'
                        : 'bg-white text-[#5B6169] border-[#E5E4E1] hover:bg-stone-50'
                    }`}
                    style={{
                      borderColor: isSelected ? memberColor : undefined,
                      boxShadow: isSelected ? `0 0 0 2px ${memberColor}22` : undefined,
                    }}
                  >
                    <div className="relative shrink-0">
                      <FamilyAvatar
                        member={m}
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
                    <span>{m.Display_Name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-[#1C1E21] mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#5B6169]" />
              <span>Location (Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Dining Room, Central Park Field 3, Pediatric Center"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E5E4E1] text-[#1C1E21] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#7A5AF8] text-sm min-h-[44px]"
            />
          </div>

          {/* Description / Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#1C1E21] mb-1.5 flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-[#5B6169]" />
              <span>Notes & Preparation Details</span>
            </label>
            <textarea
              rows={2}
              placeholder="Gear to pack, driving / carpool schedule, specific instructions..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E5E4E1] text-[#1C1E21] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#7A5AF8] text-sm"
            />
          </div>

          {/* Visibility / Privacy Options */}
          <div>
            <label className="block text-xs font-semibold text-[#1C1E21] mb-1.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#5B6169]" />
              <span>Visibility & Access Control</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setVisibility('FAMILY')}
                className={`p-2.5 rounded-xl border text-left transition-all min-h-[44px] ${
                  visibility === 'FAMILY'
                    ? 'border-[#7A5AF8] bg-[#7A5AF8]/10 text-[#1C1E21] font-semibold'
                    : 'border-[#E5E4E1] bg-white text-[#5B6169] hover:bg-stone-50'
                }`}
              >
                <div className="text-xs font-bold">Full Family</div>
                <div className="text-[11px] text-[#5B6169] mt-0.5">Visible on all devices & Hub</div>
              </button>

              {session?.isParent && (
                <button
                  type="button"
                  onClick={() => setVisibility('PARENTS_ONLY')}
                  className={`p-2.5 rounded-xl border text-left transition-all min-h-[44px] ${
                    visibility === 'PARENTS_ONLY'
                      ? 'border-rose-400 bg-rose-50 text-rose-900 font-semibold'
                      : 'border-[#E5E4E1] bg-white text-[#5B6169] hover:bg-stone-50'
                  }`}
                >
                  <div className="text-xs font-bold text-rose-800">Parents Only</div>
                  <div className="text-[11px] text-rose-600 mt-0.5">Hidden from kids & public Hub</div>
                </button>
              )}

              <button
                type="button"
                onClick={() => setVisibility('PRIVATE')}
                className={`p-2.5 rounded-xl border text-left transition-all min-h-[44px] ${
                  visibility === 'PRIVATE'
                    ? 'border-stone-700 bg-stone-100 text-stone-900 font-semibold'
                    : 'border-[#E5E4E1] bg-white text-[#5B6169] hover:bg-stone-50'
                }`}
              >
                <div className="text-xs font-bold">Private</div>
                <div className="text-[11px] text-[#5B6169] mt-0.5">Visible only to creator</div>
              </button>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-[#E5E4E1] flex items-center justify-between gap-3">
            {canDelete ? (
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold text-xs transition-colors min-h-[44px]"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deleting ? 'Removing...' : 'Delete Event'}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-[#5B6169] hover:text-[#1C1E21] hover:bg-stone-100 font-medium text-xs sm:text-sm transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-[#7A5AF8] hover:bg-[#6843EC] active:bg-[#5833DC] text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors min-h-[44px] flex items-center gap-1.5"
              >
                {saving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{isEditing ? 'Save Changes' : 'Schedule Event'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
