import React, { useState, useEffect } from 'react';
import { TaskResponsibility, FamilyMember } from '../../../types';
import { FamilyAvatar } from '../../ui/FamilyAvatar';
import {
  X,
  Plus,
  Repeat,
  Award,
  Calendar,
  AlertCircle
} from 'lucide-react';

export interface ResponsibilityEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  onSave: (respData: Partial<TaskResponsibility>) => Promise<void>;
  initialResponsibility?: TaskResponsibility | null;
}

const ALL_DAYS = [
  { key: 'MON', label: 'Mon' },
  { key: 'TUE', label: 'Tue' },
  { key: 'WED', label: 'Wed' },
  { key: 'THU', label: 'Thu' },
  { key: 'FRI', label: 'Fri' },
  { key: 'SAT', label: 'Sat' },
  { key: 'SUN', label: 'Sun' },
];

export const ResponsibilityEditorModal: React.FC<ResponsibilityEditorModalProps> = ({
  isOpen,
  onClose,
  members,
  onSave,
  initialResponsibility,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('CHORE');
  const [assignedTo, setAssignedTo] = useState('');
  const [recurrence, setRecurrence] = useState<'DAILY' | 'SCHOOL_DAYS' | 'WEEKENDS' | 'WEEKLY'>('DAILY');
  const [targetDays, setTargetDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);
  const [points, setPoints] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialResponsibility) {
      setTitle(initialResponsibility.Title || '');
      setCategory(initialResponsibility.Category || 'CHORE');
      setAssignedTo(initialResponsibility.Assigned_To || '');
      setRecurrence(initialResponsibility.Recurrence || 'DAILY');
      setTargetDays(initialResponsibility.Target_Days || ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);
      setPoints(Number(initialResponsibility.Points) || 10);
    } else {
      setTitle('');
      setCategory('CHORE');
      const defaultChild = members.find(m => m.Role === 'CHILD') || members[0];
      setAssignedTo(defaultChild ? defaultChild.Member_ID : '');
      setRecurrence('DAILY');
      setTargetDays(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);
      setPoints(10);
    }
    setError(null);
  }, [initialResponsibility, isOpen, members]);

  if (!isOpen) return null;

  const toggleDay = (dayKey: string) => {
    setTargetDays(prev =>
      prev.includes(dayKey) ? prev.filter(d => d !== dayKey) : [...prev, dayKey]
    );
  };

  const handleRecurrencePreset = (preset: 'DAILY' | 'SCHOOL_DAYS' | 'WEEKENDS') => {
    setRecurrence(preset);
    if (preset === 'DAILY') {
      setTargetDays(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);
    } else if (preset === 'SCHOOL_DAYS') {
      setTargetDays(['MON', 'TUE', 'WED', 'THU', 'FRI']);
    } else if (preset === 'WEEKENDS') {
      setTargetDays(['SAT', 'SUN']);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a responsibility title');
      return;
    }
    if (!assignedTo) {
      setError('Please assign this responsibility to a member');
      return;
    }
    if (targetDays.length === 0) {
      setError('Please select at least one active day');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        Title: title.trim(),
        Category: category,
        Recurrence: recurrence,
        Assigned_To: assignedTo,
        Target_Days: targetDays,
        Points: points,
        Active: true,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save recurring responsibility');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50/50">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-1.5">
              <Repeat className="w-4 h-4 text-emerald-600" />
              <span>{initialResponsibility ? 'Edit Routine' : 'Add Recurring Duty'}</span>
            </h3>
            <p className="text-xs text-stone-500">
              Repeats automatically each day without resetting history
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Duty / Routine Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Morning Bed Making, Cat Food & Water, Feed Dogs..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              required
              autoFocus
            />
          </div>

          {/* Assignee Contextual Character Selection */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2">
              Assignee <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {members.map(member => {
                const isSelected = assignedTo === member.Member_ID;
                const memberColor = member.Color || '#164E35';
                return (
                  <button
                    key={member.Member_ID}
                    type="button"
                    onClick={() => setAssignedTo(member.Member_ID)}
                    className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-2 bg-stone-50 font-bold shadow-xs'
                        : 'border-stone-200 hover:border-stone-300 text-stone-600 bg-white'
                    }`}
                    style={{ borderColor: isSelected ? memberColor : undefined }}
                  >
                    <FamilyAvatar member={member} size="xs" shape="circle" showBorder={false} />
                    <span className="text-xs font-bold text-stone-900">{member.First_Name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Frequency Presets */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">Frequency</label>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              <button
                type="button"
                onClick={() => handleRecurrencePreset('DAILY')}
                className={`py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                  recurrence === 'DAILY'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                Every Day
              </button>
              <button
                type="button"
                onClick={() => handleRecurrencePreset('SCHOOL_DAYS')}
                className={`py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                  recurrence === 'SCHOOL_DAYS'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                School Days
              </button>
              <button
                type="button"
                onClick={() => handleRecurrencePreset('WEEKENDS')}
                className={`py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                  recurrence === 'WEEKENDS'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                Weekends
              </button>
            </div>

            {/* Target Days Toggle */}
            <div className="flex items-center justify-between gap-1 mt-2">
              {ALL_DAYS.map(day => {
                const active = targetDays.includes(day.key);
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleDay(day.key)}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                      active
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-400 hover:text-stone-700'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Points */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
              <span>Points Per Day</span>
              <span className="text-amber-700 font-bold">+{points} pts</span>
            </label>
            <div className="flex gap-2">
              {[5, 10, 15, 20].map(pt => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => setPoints(pt)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                    points === pt
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  +{pt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
            >
              {initialResponsibility ? 'Save Routine' : 'Create Routine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
