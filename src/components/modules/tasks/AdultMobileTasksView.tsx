import React, { useState, useMemo } from 'react';
import { TaskItem, TaskResponsibility, FamilyMember } from '../../../types';
import { CanonicalTaskStatus, normalizeTaskStatus } from './taskConstants';
import { TaskCard } from './TaskCard';
import { ContextualMemberChips } from '../calendar/ContextualMemberChips';
import { FamilyAvatar } from '../../ui/FamilyAvatar';
import {
  CheckSquare,
  Plus,
  Sparkles,
  Repeat,
  CheckCircle2,
  Clock,
  RotateCcw,
  Check,
  ChevronRight,
  Filter
} from 'lucide-react';

export interface AdultMobileTasksViewProps {
  tasks: TaskItem[];
  responsibilities: TaskResponsibility[];
  members: FamilyMember[];
  currentMember: FamilyMember;
  onStatusUpdate: (taskId: string, status: CanonicalTaskStatus, note?: string) => Promise<void>;
  onCompleteResponsibility: (respId: string, dateStr: string) => Promise<void>;
  onOpenNewTask: () => void;
  onOpenNewResponsibility: () => void;
  onEditTask?: (task: TaskItem) => void;
  onDeleteTask?: (taskId: string) => void;
  selectedMemberId: string;
  onSelectMember: (memberId: string) => void;
}

type MobileTab = 'TODO' | 'REVIEW' | 'ROUTINES' | 'COMPLETED';

export const AdultMobileTasksView: React.FC<AdultMobileTasksViewProps> = ({
  tasks,
  responsibilities,
  members,
  currentMember,
  onStatusUpdate,
  onCompleteResponsibility,
  onOpenNewTask,
  onOpenNewResponsibility,
  onEditTask,
  onDeleteTask,
  selectedMemberId,
  onSelectMember,
}) => {
  const [activeTab, setActiveTab] = useState<MobileTab>('TODO');
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  const memberMap = useMemo(() => {
    const map = new Map<string, FamilyMember>();
    members.forEach(m => map.set(m.Member_ID, m));
    return map;
  }, [members]);

  // Counts by member
  const taskCountsByMember = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => {
      const s = normalizeTaskStatus(t.Status);
      if (s !== 'VERIFIED' && s !== 'CANCELLED') {
        counts[t.Assigned_To] = (counts[t.Assigned_To] || 0) + 1;
      }
    });
    return counts;
  }, [tasks]);

  // Filter tasks by selected member
  const memberTasks = useMemo(() => {
    return tasks.filter(t => {
      if (selectedMemberId === 'ALL') return true;
      return t.Assigned_To === selectedMemberId;
    });
  }, [tasks, selectedMemberId]);

  // Pending approval tasks (critical for parent review queue!)
  const pendingApprovalTasks = useMemo(() => {
    return memberTasks.filter(t => normalizeTaskStatus(t.Status) === 'PENDING_APPROVAL');
  }, [memberTasks]);

  // To Do tasks (Open, In Progress, Reopened)
  const todoTasks = useMemo(() => {
    return memberTasks.filter(t => {
      const s = normalizeTaskStatus(t.Status);
      return s === 'OPEN' || s === 'IN_PROGRESS' || s === 'REOPENED';
    });
  }, [memberTasks]);

  // Completed / Verified tasks
  const completedTasks = useMemo(() => {
    return memberTasks.filter(t => normalizeTaskStatus(t.Status) === 'VERIFIED');
  }, [memberTasks]);

  // Filtered responsibilities
  const filteredResponsibilities = useMemo(() => {
    return responsibilities.filter(r => {
      if (!r.Active) return false;
      if (selectedMemberId === 'ALL') return true;
      return r.Assigned_To === selectedMemberId;
    });
  }, [responsibilities, selectedMemberId]);

  const handleApproveAllPending = async () => {
    if (pendingApprovalTasks.length === 0) return;
    try {
      setIsApprovingAll(true);
      for (const t of pendingApprovalTasks) {
        await onStatusUpdate(t.Task_ID, 'VERIFIED');
      }
    } finally {
      setIsApprovingAll(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="flex flex-col space-y-3 pb-8">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-4 border border-[#E5E4E1] shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-amber-700" />
            <span>Chores & Tasks</span>
          </h2>
          <p className="text-[11px] text-stone-500">
            {pendingApprovalTasks.length > 0 ? (
              <span className="text-amber-700 font-semibold">
                {pendingApprovalTasks.length} chore{pendingApprovalTasks.length > 1 ? 's' : ''} awaiting review
              </span>
            ) : (
              'All chores up to date'
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewTask}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1C1E21] active:bg-stone-800 text-white text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>New Chore</span>
        </button>
      </div>

      {/* Contextual Family Member Chips */}
      <div className="bg-white rounded-2xl p-2 border border-[#E5E4E1] shadow-xs">
        <ContextualMemberChips
          members={members}
          selectedMemberId={selectedMemberId}
          onSelectMember={onSelectMember}
          eventCounts={taskCountsByMember}
          compact={true}
        />
      </div>

      {/* Segmented Filter Bar */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('TODO')}
          className={`py-2 px-1 rounded-lg text-center transition-all ${
            activeTab === 'TODO'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span>To Do</span>
          {todoTasks.length > 0 && (
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-700">
              {todoTasks.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('REVIEW')}
          className={`relative py-2 px-1 rounded-lg text-center transition-all ${
            activeTab === 'REVIEW'
              ? 'bg-white text-amber-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span>Review</span>
          {pendingApprovalTasks.length > 0 && (
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-bold animate-pulse">
              {pendingApprovalTasks.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ROUTINES')}
          className={`py-2 px-1 rounded-lg text-center transition-all ${
            activeTab === 'ROUTINES'
              ? 'bg-white text-emerald-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span>Routines</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-700">
            {filteredResponsibilities.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('COMPLETED')}
          className={`py-2 px-1 rounded-lg text-center transition-all ${
            activeTab === 'COMPLETED'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span>Done</span>
          {completedTasks.length > 0 && (
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-700">
              {completedTasks.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB CONTENT: REVIEW QUEUE */}
      {activeTab === 'REVIEW' && (
        <div className="space-y-3">
          {pendingApprovalTasks.length > 0 ? (
            <>
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-xs font-bold text-amber-900">
                    {pendingApprovalTasks.length} chore{pendingApprovalTasks.length > 1 ? 's' : ''} submitted for verification
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isApprovingAll}
                  onClick={handleApproveAllPending}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs whitespace-nowrap"
                >
                  Approve All
                </button>
              </div>

              {pendingApprovalTasks.map(task => (
                <TaskCard
                  key={task.Task_ID}
                  task={task}
                  assignedMember={memberMap.get(task.Assigned_To)}
                  currentUserRole={currentMember.Role}
                  currentUserId={currentMember.Member_ID}
                  onStatusUpdate={onStatusUpdate}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  compact={true}
                />
              ))}
            </>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-stone-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-stone-800">No Chores Awaiting Review</p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                When children mark their chores finished, they will appear here for 1-tap approval.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: TO DO */}
      {activeTab === 'TODO' && (
        <div className="space-y-2.5">
          {todoTasks.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-stone-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-stone-800">All caught up!</p>
              <p className="text-[11px] text-stone-400 mt-0.5">No open tasks for this filter.</p>
            </div>
          ) : (
            todoTasks.map(task => (
              <TaskCard
                key={task.Task_ID}
                task={task}
                assignedMember={memberMap.get(task.Assigned_To)}
                currentUserRole={currentMember.Role}
                currentUserId={currentMember.Member_ID}
                onStatusUpdate={onStatusUpdate}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                compact={true}
              />
            ))
          )}
        </div>
      )}

      {/* TAB CONTENT: ROUTINES & RESPONSIBILITIES */}
      {activeTab === 'ROUTINES' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-stone-700">Daily Responsibilities</span>
            <button
              type="button"
              onClick={onOpenNewResponsibility}
              className="text-xs font-bold text-emerald-700 flex items-center gap-1 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Duty</span>
            </button>
          </div>

          {filteredResponsibilities.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-stone-200">
              <Repeat className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-stone-800">No Recurring Routines</p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Set up daily habits like bed making, reading, and pet feeding.
              </p>
            </div>
          ) : (
            filteredResponsibilities.map(resp => {
              const assigned = memberMap.get(resp.Assigned_To);
              return (
                <div
                  key={resp.Responsibility_ID}
                  className="bg-white rounded-2xl p-3.5 border border-stone-200 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {assigned && (
                      <FamilyAvatar member={assigned} size="xs" shape="circle" showBorder={true} />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-stone-900 truncate">
                          {resp.Title}
                        </span>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-md border border-amber-200">
                          +{resp.Points} pts
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5 truncate">
                        {assigned?.Display_Name} • {resp.Recurrence}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onCompleteResponsibility(resp.Responsibility_ID, todayStr)}
                    className="shrink-0 p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs flex items-center gap-1 transition-colors"
                    title="Mark completed for today without completing future days"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Today</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB CONTENT: COMPLETED */}
      {activeTab === 'COMPLETED' && (
        <div className="space-y-2.5">
          {completedTasks.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-stone-200">
              <p className="text-xs text-stone-400">No verified tasks yet.</p>
            </div>
          ) : (
            completedTasks.map(task => (
              <TaskCard
                key={task.Task_ID}
                task={task}
                assignedMember={memberMap.get(task.Assigned_To)}
                currentUserRole={currentMember.Role}
                currentUserId={currentMember.Member_ID}
                onStatusUpdate={onStatusUpdate}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                compact={true}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};
