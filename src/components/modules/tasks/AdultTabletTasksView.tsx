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
  Award,
  Filter
} from 'lucide-react';

export interface AdultTabletTasksViewProps {
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

export const AdultTabletTasksView: React.FC<AdultTabletTasksViewProps> = ({
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
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'TODO' | 'VERIFIED'>('TODO');
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  const memberMap = useMemo(() => {
    const map = new Map<string, FamilyMember>();
    members.forEach(m => map.set(m.Member_ID, m));
    return map;
  }, [members]);

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

  const memberTasks = useMemo(() => {
    return tasks.filter(t => {
      if (selectedMemberId === 'ALL') return true;
      return t.Assigned_To === selectedMemberId;
    });
  }, [tasks, selectedMemberId]);

  // Review station tasks (pending approval)
  const pendingApprovalTasks = useMemo(() => {
    return tasks.filter(t => normalizeTaskStatus(t.Status) === 'PENDING_APPROVAL');
  }, [tasks]);

  // Filtered tasks for left pane
  const displayTasks = useMemo(() => {
    return memberTasks.filter(t => {
      const s = normalizeTaskStatus(t.Status);
      if (filterStatus === 'TODO') return s === 'OPEN' || s === 'IN_PROGRESS' || s === 'REOPENED';
      if (filterStatus === 'VERIFIED') return s === 'VERIFIED';
      return true;
    });
  }, [memberTasks, filterStatus]);

  const activeResponsibilities = useMemo(() => {
    return responsibilities.filter(r => r.Active);
  }, [responsibilities]);

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
    <div className="space-y-4">
      {/* Header bar */}
      <div className="bg-white rounded-2xl p-5 border border-[#E5E4E1] shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-amber-700" />
            <span>Chores & Responsibilities Workspace</span>
          </h2>
          <p className="text-xs text-stone-500">
            Real-time verification • 2-column tablet workflow
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenNewResponsibility}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-semibold transition-colors"
          >
            <Repeat className="w-3.5 h-3.5 text-emerald-600" />
            <span>Add Routine</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewTask}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1C1E21] hover:bg-stone-800 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Assign Chore</span>
          </button>
        </div>
      </div>

      {/* 2-Column Split */}
      <div className="grid grid-cols-12 gap-5 items-start">
        {/* Left Column (7 cols): Main Task Workspace */}
        <div className="col-span-7 space-y-3.5">
          {/* Contextual Member Filter Chips */}
          <div className="bg-white rounded-2xl p-2.5 border border-[#E5E4E1] shadow-xs">
            <ContextualMemberChips
              members={members}
              selectedMemberId={selectedMemberId}
              onSelectMember={onSelectMember}
              eventCounts={taskCountsByMember}
              compact={false}
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-2 border border-[#E5E4E1] shadow-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFilterStatus('TODO')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  filterStatus === 'TODO'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                To Do
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  filterStatus === 'ALL'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                All Tasks
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('VERIFIED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  filterStatus === 'VERIFIED'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                Verified
              </button>
            </div>

            <span className="text-xs text-stone-400 font-medium">
              Showing {displayTasks.length} tasks
            </span>
          </div>

          {/* Task List */}
          <div className="space-y-3">
            {displayTasks.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-stone-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-stone-800">No tasks in this view</p>
                <p className="text-xs text-stone-400 mt-1">
                  Change your filter or tap "Assign Chore" above.
                </p>
              </div>
            ) : (
              displayTasks.map(task => (
                <TaskCard
                  key={task.Task_ID}
                  task={task}
                  assignedMember={memberMap.get(task.Assigned_To)}
                  currentUserRole={currentMember.Role}
                  currentUserId={currentMember.Member_ID}
                  onStatusUpdate={onStatusUpdate}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  compact={false}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Review Station & Routines Rail */}
        <div className="col-span-5 space-y-4">
          {/* Review Station Box */}
          <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs overflow-hidden">
            <div className="bg-amber-50/70 p-4 border-b border-amber-200/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-amber-950">Awaiting Parent Review</h3>
              </div>
              {pendingApprovalTasks.length > 0 && (
                <button
                  type="button"
                  disabled={isApprovingAll}
                  onClick={handleApproveAllPending}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-colors"
                >
                  Approve All ({pendingApprovalTasks.length})
                </button>
              )}
            </div>

            <div className="p-3.5 space-y-2.5 max-h-[380px] overflow-y-auto">
              {pendingApprovalTasks.length === 0 ? (
                <div className="text-center py-6 text-stone-400">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                  <p className="text-xs font-semibold text-stone-700">Review Queue Clear</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    No children currently waiting for chore sign-offs.
                  </p>
                </div>
              ) : (
                pendingApprovalTasks.map(task => (
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
          </div>

          {/* Daily Recurring Responsibilities */}
          <div className="bg-white rounded-2xl border border-[#E5E4E1] shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-stone-900">Recurring Responsibilities</h3>
              </div>
              <button
                type="button"
                onClick={onOpenNewResponsibility}
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                + Add
              </button>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {activeResponsibilities.length === 0 ? (
                <p className="text-xs text-stone-400 py-4 text-center">
                  No recurring routines configured.
                </p>
              ) : (
                activeResponsibilities.map(resp => {
                  const assigned = memberMap.get(resp.Assigned_To);
                  return (
                    <div
                      key={resp.Responsibility_ID}
                      className="p-3 rounded-xl border border-stone-150 hover:border-stone-300 bg-stone-50/50 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {assigned && (
                          <FamilyAvatar member={assigned} size="xs" shape="circle" showBorder={true} />
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-stone-900 truncate">
                            {resp.Title}
                          </div>
                          <div className="text-[10px] text-stone-500 truncate">
                            {assigned?.First_Name} • {resp.Recurrence}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                          +{resp.Points} pts
                        </span>
                        <button
                          type="button"
                          onClick={() => onCompleteResponsibility(resp.Responsibility_ID, todayStr)}
                          className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors"
                          title="Verify today's occurrence"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
