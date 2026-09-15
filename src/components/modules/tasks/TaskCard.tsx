import React, { useState } from 'react';
import { TaskItem, FamilyMember } from '../../../types';
import {
  CanonicalTaskStatus,
  normalizeTaskStatus,
  STATUS_CONFIG,
  CATEGORY_CONFIG
} from './taskConstants';
import { FamilyAvatar } from '../../ui/FamilyAvatar';
import {
  Award,
  Calendar,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Clock,
  MessageSquare,
  Repeat,
  Trash2,
  Edit2,
  ChevronDown,
  XCircle,
  Play
} from 'lucide-react';

export interface TaskCardProps {
  task: TaskItem;
  assignedMember?: FamilyMember;
  currentUserRole: 'OWNER' | 'ADMIN' | 'CHILD';
  currentUserId: string;
  onStatusUpdate: (taskId: string, status: CanonicalTaskStatus, note?: string) => Promise<void>;
  onEdit?: (task: TaskItem) => void;
  onDelete?: (taskId: string) => void;
  compact?: boolean;
  className?: string;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  assignedMember,
  currentUserRole,
  currentUserId,
  onStatusUpdate,
  onEdit,
  onDelete,
  compact = false,
  className = '',
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [reopenNote, setReopenNote] = useState('');
  const [showOptions, setShowOptions] = useState(false);

  const status = normalizeTaskStatus(task.Status);
  const statusMeta = STATUS_CONFIG[status];
  const StatusIcon = statusMeta.icon;

  const categoryMeta = CATEGORY_CONFIG[task.Category] || CATEGORY_CONFIG.CHORE;
  const CategoryIcon = categoryMeta.icon;

  const isParent = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';
  const isAssignedToCurrentUser = task.Assigned_To === currentUserId;

  const isPendingApproval = status === 'PENDING_APPROVAL';
  const isVerified = status === 'VERIFIED';
  const isReopened = status === 'REOPENED';
  const isOpen = status === 'OPEN';
  const isInProgress = status === 'IN_PROGRESS';
  const isCancelled = status === 'CANCELLED';

  const handleAction = async (newStatus: CanonicalTaskStatus, note?: string) => {
    try {
      setIsUpdating(true);
      await onStatusUpdate(task.Task_ID, newStatus, note);
      setShowReopenDialog(false);
      setReopenNote('');
      setShowOptions(false);
    } catch (err) {
      console.error('Failed to update task status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReopenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenNote.trim()) return;
    handleAction('REOPENED', reopenNote.trim());
  };

  return (
    <div
      className={`group relative rounded-2xl border transition-all bg-white ${
        isPendingApproval
          ? 'border-amber-300 bg-amber-50/20 shadow-xs'
          : isVerified
          ? 'border-emerald-200/80 bg-emerald-50/10'
          : isReopened
          ? 'border-rose-300 bg-rose-50/20'
          : 'border-[#E5E4E1] hover:border-stone-300 hover:shadow-xs'
      } ${compact ? 'p-3 sm:p-3.5' : 'p-4 sm:p-5'} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left Side: Avatar & Details */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 mt-0.5">
            {assignedMember ? (
              <FamilyAvatar
                member={assignedMember}
                size={compact ? 'sm' : 'md'}
                shape="circle"
                showBorder={true}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-600">
                FM
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            {/* Badges Bar */}
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              {/* Category Pill */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${categoryMeta.bg} ${categoryMeta.color} border-transparent`}
              >
                <CategoryIcon className="w-3 h-3" />
                <span>{categoryMeta.label}</span>
              </span>

              {/* Status Pill */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusMeta.badgeBg} ${statusMeta.badgeText} ${statusMeta.badgeBorder}`}
              >
                <StatusIcon className={`w-3 h-3 ${statusMeta.iconColor}`} />
                <span>{statusMeta.shortLabel}</span>
              </span>

              {/* Points Badge */}
              {task.Points > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                  <Award className="w-3 h-3 text-amber-500" />
                  <span>+{task.Points} pts</span>
                </span>
              )}

              {/* Recurrence Indicator */}
              {task.Recurrence && task.Recurrence !== 'NONE' && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-stone-100 text-stone-600"
                  title={`Repeats: ${task.Recurrence}`}
                >
                  <Repeat className="w-2.5 h-2.5 text-stone-500" />
                  <span>{task.Recurrence}</span>
                </span>
              )}
            </div>

            {/* Title */}
            <h4
              className={`text-sm sm:text-base font-bold text-stone-900 leading-snug break-words ${
                isVerified ? 'line-through text-stone-400 font-medium' : ''
              }`}
            >
              {task.Title}
            </h4>

            {/* Description if present */}
            {task.Description && (
              <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                {task.Description}
              </p>
            )}

            {/* Meta row: Due Date & Assignee Name */}
            <div className="flex items-center gap-3 mt-2 text-xs text-stone-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>Due {task.Due_Date}</span>
              </span>
              <span>•</span>
              <span className="font-medium text-stone-700">
                {assignedMember ? assignedMember.Display_Name : 'Unassigned'}
              </span>
            </div>

            {/* Reopened Alert / Feedback banner */}
            {isReopened && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <RotateCcw className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Reopened for revision:</span>{' '}
                  <span>Please review requirements and mark done when complete.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Quick Action & Option Menu */}
        <div className="flex items-center gap-1.5 shrink-0 self-start">
          {/* PARENT ACTIONS */}
          {isParent && (
            <>
              {/* Approval button for pending tasks */}
              {isPendingApproval && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleAction('VERIFIED')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  title="Approve and award points"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>Verify & Award</span>
                </button>
              )}

              {/* Reopen button for pending tasks */}
              {isPendingApproval && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => setShowReopenDialog(!showReopenDialog)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100 text-xs font-semibold transition-colors cursor-pointer"
                  title="Request revision"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reopen</span>
                </button>
              )}

              {/* Parent options button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowOptions(!showOptions)}
                  className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                  title="More actions"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showOptions && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-stone-200 py-1 z-20 text-xs">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowOptions(false);
                          onEdit(task);
                        }}
                        className="w-full px-3 py-2 text-left text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-stone-400" />
                        <span>Edit Task</span>
                      </button>
                    )}

                    {!isOpen && (
                      <button
                        type="button"
                        onClick={() => handleAction('OPEN')}
                        className="w-full px-3 py-2 text-left text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-sky-500" />
                        <span>Reset to Open</span>
                      </button>
                    )}

                    {!isCancelled && (
                      <button
                        type="button"
                        onClick={() => handleAction('CANCELLED')}
                        className="w-full px-3 py-2 text-left text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                      >
                        <XCircle className="w-3.5 h-3.5 text-stone-400" />
                        <span>Cancel Task</span>
                      </button>
                    )}

                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowOptions(false);
                          onDelete(task.Task_ID);
                        }}
                        className="w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-stone-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Task</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* CHILD ACTIONS */}
          {!isParent && isAssignedToCurrentUser && (
            <div className="flex items-center gap-1.5">
              {isOpen && (
                <>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleAction('IN_PROGRESS')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                    <span>Start</span>
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleAction('PENDING_APPROVAL')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1C1E21] hover:bg-stone-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mark Finished</span>
                  </button>
                </>
              )}

              {isInProgress && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleAction('PENDING_APPROVAL')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Done! Submit</span>
                </button>
              )}

              {isReopened && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleAction('PENDING_APPROVAL')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Mark Done Again</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Parent Reopen Inline Note Dialog */}
      {showReopenDialog && (
        <form onSubmit={handleReopenSubmit} className="mt-3 pt-3 border-t border-stone-200">
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Reason or feedback for reopening:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={reopenNote}
              onChange={e => setReopenNote(e.target.value)}
              placeholder="e.g. Please put both shoes neatly on the rack"
              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={isUpdating || !reopenNote.trim()}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50"
            >
              Reopen
            </button>
            <button
              type="button"
              onClick={() => setShowReopenDialog(false)}
              className="px-2.5 py-1.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-medium hover:bg-stone-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
