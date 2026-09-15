import React, { useState, useEffect } from 'react';
import { TaskItem, FamilyMember, EntityVisibility } from '../../../types';
import { FamilyAvatar } from '../../ui/FamilyAvatar';
import {
  X,
  Plus,
  Calendar,
  Award,
  CheckSquare,
  Shield,
  Repeat,
  AlertCircle
} from 'lucide-react';

export interface TaskEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  onSave: (taskData: Partial<TaskItem>) => Promise<void>;
  initialTask?: TaskItem | null;
  currentUserId: string;
}

export const TaskEditorModal: React.FC<TaskEditorModalProps> = ({
  isOpen,
  onClose,
  members,
  onSave,
  initialTask,
  currentUserId,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignedTo, setAssignedTo] = useState('');
  const [category, setCategory] = useState<'CHORE' | 'ROUTINE' | 'HOMEWORK' | 'PROJECT' | 'SELF_CARE'>('CHORE');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [points, setPoints] = useState(15);
  const [visibility, setVisibility] = useState<EntityVisibility>('FAMILY');
  const [recurrence, setRecurrence] = useState<'NONE' | 'DAILY' | 'SCHOOL_DAYS' | 'WEEKENDS' | 'WEEKLY'>('NONE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.Title || '');
      setDescription(initialTask.Description || '');
      setDueDate(initialTask.Due_Date || new Date().toISOString().split('T')[0]);
      setAssignedTo(initialTask.Assigned_To || '');
      setCategory(initialTask.Category || 'CHORE');
      setPriority(initialTask.Priority || 'MEDIUM');
      setPoints(Number(initialTask.Points) || 0);
      setVisibility(initialTask.Visibility || 'FAMILY');
      setRecurrence((initialTask.Recurrence as any) || 'NONE');
    } else {
      setTitle('');
      setDescription('');
      setDueDate(new Date().toISOString().split('T')[0]);
      // Default to first child or first member
      const defaultChild = members.find(m => m.Role === 'CHILD') || members[0];
      setAssignedTo(defaultChild ? defaultChild.Member_ID : '');
      setCategory('CHORE');
      setPriority('MEDIUM');
      setPoints(15);
      setVisibility('FAMILY');
      setRecurrence('NONE');
    }
    setError(null);
  }, [initialTask, isOpen, members]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title for the task');
      return;
    }
    if (!assignedTo) {
      setError('Please select a family member to assign');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        Title: title.trim(),
        Description: description.trim() || undefined,
        Due_Date: dueDate,
        Assigned_To: assignedTo,
        Category: category,
        Priority: priority,
        Points: points,
        Visibility: visibility,
        Recurrence: recurrence !== 'NONE' ? recurrence : null,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setDueDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50/50">
          <div>
            <h3 className="text-base font-bold text-stone-900">
              {initialTask ? 'Edit Chore / Task' : 'Assign Family Chore'}
            </h3>
            <p className="text-xs text-stone-500">
              Real-time Google Sheets sync & parent point approval
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Unload dishwasher, Math worksheet, Clean room..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              required
              autoFocus
            />
          </div>

          {/* Assignee Contextual Character Selection */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2">
              Assign To Family Member <span className="text-rose-500">*</span>
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
                    className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all text-left ${
                      isSelected
                        ? 'border-2 bg-stone-50 font-bold shadow-xs'
                        : 'border-stone-200 hover:border-stone-300 text-stone-600 bg-white'
                    }`}
                    style={{
                      borderColor: isSelected ? memberColor : undefined,
                    }}
                  >
                    <FamilyAvatar
                      member={member}
                      size="xs"
                      shape="circle"
                      showBorder={false}
                    />
                    <div>
                      <div className="text-xs font-bold leading-tight text-stone-900">
                        {member.First_Name}
                      </div>
                      <div className="text-[10px] text-stone-400 capitalize">
                        {member.Role.toLowerCase()}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due Date & Quick Buttons */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-stone-700">Due Date</label>
              <div className="flex gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleQuickDate(0)}
                  className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200 font-medium"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDate(1)}
                  className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200 font-medium"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDate(7)}
                  className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200 font-medium"
                >
                  +1 Week
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              />
            </div>
          </div>

          {/* Points & Category Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Points Award */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                <span>Reward Points</span>
                <span className="text-amber-700 font-bold">+{points} pts</span>
              </label>
              <div className="flex gap-1.5 mb-1.5">
                {[5, 10, 15, 20, 50].map(pt => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => setPoints(pt)}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      points === pt
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    +{pt}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={0}
                max={500}
                value={points}
                onChange={e => setPoints(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-xl border border-stone-300 text-xs"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-medium bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="CHORE">Household Chore</option>
                <option value="ROUTINE">Daily Routine</option>
                <option value="HOMEWORK">School & Homework</option>
                <option value="PROJECT">Family Project</option>
                <option value="SELF_CARE">Self Care & Health</option>
              </select>
            </div>
          </div>

          {/* Recurrence & Visibility */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                <Repeat className="w-3.5 h-3.5 text-stone-400" />
                <span>Repeat Occurrence</span>
              </label>
              <select
                value={recurrence}
                onChange={e => setRecurrence(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-medium bg-white"
              >
                <option value="NONE">One-time task</option>
                <option value="DAILY">Every Day</option>
                <option value="SCHOOL_DAYS">School Days (Mon - Fri)</option>
                <option value="WEEKENDS">Weekends Only</option>
                <option value="WEEKLY">Weekly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-stone-400" />
                <span>Visibility</span>
              </label>
              <select
                value={visibility}
                onChange={e => setVisibility(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-medium bg-white"
              >
                <option value="FAMILY">Visible to All Family</option>
                <option value="PARENTS_ONLY">Parents Only (Confidential)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Instructions or Details (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Any details, e.g. remember to fold towels and stack by color"
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          {/* Actions */}
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
              className="px-5 py-2 rounded-xl bg-[#1C1E21] hover:bg-stone-800 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>{initialTask ? 'Save Changes' : 'Assign Chore'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
