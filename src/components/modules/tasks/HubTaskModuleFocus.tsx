import React, { useState, useMemo } from 'react';
import { TaskItem, TaskResponsibility, FamilyMember } from '../../../types';
import { CanonicalTaskStatus, normalizeTaskStatus, STATUS_CONFIG } from './taskConstants';
import { ContextualMemberChips } from '../calendar/ContextualMemberChips';
import { FamilyAvatar } from '../../ui/FamilyAvatar';
import {
  CheckSquare,
  Sparkles,
  CheckCircle2,
  Clock,
  RotateCcw,
  Repeat,
  Plus,
  Star,
  Lock,
  Unlock,
  Check,
  ChevronLeft,
  Sun,
  ShieldCheck
} from 'lucide-react';

export interface HubTaskModuleFocusProps {
  tasks: TaskItem[];
  responsibilities: TaskResponsibility[];
  members: FamilyMember[];
  currentMember: FamilyMember;
  hubLocked: boolean;
  onUnlockHub: (pin: string) => boolean;
  onLockHub: () => void;
  onOpenPinModal: (actionDesc?: string, onVerified?: () => void) => void;
  onBack: () => void;
  onStatusUpdate: (taskId: string, status: CanonicalTaskStatus, note?: string) => Promise<void>;
  onCompleteResponsibility: (respId: string, dateStr: string) => Promise<void>;
  onOpenNewTask?: () => void;
  onOpenNewResponsibility?: () => void;
}

export const HubTaskModuleFocus: React.FC<HubTaskModuleFocusProps> = ({
  tasks,
  responsibilities,
  members,
  currentMember,
  hubLocked,
  onUnlockHub,
  onLockHub,
  onOpenPinModal,
  onBack,
  onStatusUpdate,
  onCompleteResponsibility,
  onOpenNewTask,
  onOpenNewResponsibility,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('ALL');
  const [celebration, setCelebration] = useState<string | null>(null);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);

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

  const triggerCelebration = (msg: string) => {
    setCelebration(msg);
    setTimeout(() => setCelebration(null), 3500);
  };

  const handleChildFinish = async (task: TaskItem) => {
    try {
      setIsUpdatingId(task.Task_ID);
      await onStatusUpdate(task.Task_ID, 'PENDING_APPROVAL');
      triggerCelebration(`Chore submitted! Mom or Dad can approve to award +${task.Points} points! ⭐`);
    } finally {
      setIsUpdatingId(null);
    }
  };

  const handleParentApprove = async (task: TaskItem) => {
    if (hubLocked) {
      onOpenPinModal('Parent PIN required to approve and award points', async () => {
        try {
          setIsUpdatingId(task.Task_ID);
          await onStatusUpdate(task.Task_ID, 'VERIFIED');
          triggerCelebration(`Verified & +${task.Points} points awarded! 🌟`);
        } finally {
          setIsUpdatingId(null);
        }
      });
      return;
    }

    try {
      setIsUpdatingId(task.Task_ID);
      await onStatusUpdate(task.Task_ID, 'VERIFIED');
      triggerCelebration(`Verified & +${task.Points} points awarded! 🌟`);
    } finally {
      setIsUpdatingId(null);
    }
  };

  const handleParentReopen = async (task: TaskItem) => {
    if (hubLocked) {
      onOpenPinModal('Parent PIN required to reopen chore', async () => {
        await onStatusUpdate(task.Task_ID, 'REOPENED', 'Checked by parent on Family Hub');
      });
      return;
    }
    await onStatusUpdate(task.Task_ID, 'REOPENED', 'Checked by parent on Family Hub');
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const handleRoutineCheck = async (resp: TaskResponsibility) => {
    await onCompleteResponsibility(resp.Responsibility_ID, todayStr);
    triggerCelebration(`Habit recorded for today! +${resp.Points} points! 🌟`);
  };

  const filteredMembers = useMemo(() => {
    if (selectedMemberId === 'ALL') return members;
    return members.filter(m => m.Member_ID === selectedMemberId);
  }, [members, selectedMemberId]);

  return (
    <div className="flex-1 flex flex-col space-y-5 text-white">
      {/* Top Hub Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Family Home</span>
          </button>

          <div className="h-4 w-px bg-slate-800" />

          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-black tracking-wide text-white uppercase">
              Family Task & Chore Board
            </h2>
          </div>
        </div>

        {/* Hub Parent Unlock / Controls */}
        <div className="flex items-center gap-2.5">
          {hubLocked ? (
            <button
              type="button"
              onClick={() => onOpenPinModal('Parent PIN to unlock admin actions')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Parent Lock (Tap PIN to Approve)</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold">
                <Unlock className="w-3.5 h-3.5" />
                <span>Parent Unlocked</span>
              </span>
              <button
                type="button"
                onClick={onLockHub}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs"
                title="Lock Hub"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {onOpenNewTask && (
            <button
              type="button"
              onClick={() => {
                if (hubLocked) {
                  onOpenPinModal('Parent PIN to create chores', onOpenNewTask);
                } else {
                  onOpenNewTask();
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-black shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Chore</span>
            </button>
          )}
        </div>
      </div>

      {/* Contextual Member Filter Chips */}
      <div className="bg-slate-800/60 rounded-2xl p-2 border border-slate-800">
        <ContextualMemberChips
          members={members}
          selectedMemberId={selectedMemberId}
          onSelectMember={setSelectedMemberId}
          eventCounts={taskCountsByMember}
          compact={false}
        />
      </div>

      {/* Celebration Notification */}
      {celebration && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-center shadow-lg animate-bounce flex items-center justify-center gap-2 text-sm">
          <Sparkles className="w-5 h-5 text-amber-200" />
          <span>{celebration}</span>
        </div>
      )}

      {/* Multi-Column Glanceable Family Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1 items-start overflow-y-auto">
        {filteredMembers.map(member => {
          const memberChoreList = tasks.filter(t => t.Assigned_To === member.Member_ID);
          const memberRoutineList = responsibilities.filter(
            r => r.Active && r.Assigned_To === member.Member_ID
          );

          const openTasks = memberChoreList.filter(t => {
            const s = normalizeTaskStatus(t.Status);
            return s === 'OPEN' || s === 'IN_PROGRESS' || s === 'REOPENED';
          });
          const reviewTasks = memberChoreList.filter(
            t => normalizeTaskStatus(t.Status) === 'PENDING_APPROVAL'
          );
          const verifiedTasks = memberChoreList.filter(
            t => normalizeTaskStatus(t.Status) === 'VERIFIED'
          );

          const totalMemberPts = verifiedTasks.reduce(
            (sum, t) => sum + (Number(t.Points) || 0),
            0
          );

          return (
            <div
              key={member.Member_ID}
              className="bg-slate-900/90 rounded-3xl p-4 sm:p-5 border border-slate-800 flex flex-col space-y-3.5 shadow-md"
            >
              {/* Member Card Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <FamilyAvatar member={member} size="sm" shape="circle" showBorder={true} />
                  <div>
                    <h3 className="text-sm font-black text-white">{member.Display_Name}</h3>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                      {member.Role}
                    </span>
                  </div>
                </div>

                <div className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{totalMemberPts} pts</span>
                </div>
              </div>

              {/* Review Queue for this Member */}
              {reviewTasks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-400">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Submitted for Review ({reviewTasks.length})</span>
                    </span>
                  </div>

                  {reviewTasks.map(task => (
                    <div
                      key={task.Task_ID}
                      className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-amber-100">{task.Title}</span>
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded-md">
                          +{task.Points} pts
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleParentApprove(task)}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleParentReopen(task)}
                          className="py-1.5 px-2.5 rounded-xl border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-xs font-semibold"
                        >
                          Reopen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Open Chores for this Member */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Today's Chores ({openTasks.length})</span>
                </div>

                {openTasks.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800/80 text-center text-xs text-slate-500">
                    No open chores today!
                  </div>
                ) : (
                  openTasks.map(task => {
                    const status = normalizeTaskStatus(task.Status);
                    const isReopened = status === 'REOPENED';
                    return (
                      <div
                        key={task.Task_ID}
                        className={`p-3 rounded-2xl border transition-all ${
                          isReopened
                            ? 'bg-rose-950/20 border-rose-500/40'
                            : 'bg-slate-800/80 border-slate-700/80'
                        } flex items-center justify-between gap-2`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate">{task.Title}</div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                            <span className="text-amber-400 font-bold">+{task.Points} pts</span>
                            {isReopened && <span className="text-rose-400 font-bold">• Reopened</span>}
                          </div>
                        </div>

                        {/* Fast 1-Tap Check for Kid on Hub */}
                        <button
                          type="button"
                          onClick={() => handleChildFinish(task)}
                          disabled={isUpdatingId === task.Task_ID}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 text-xs font-black shadow-xs transition-all flex items-center gap-1 shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Done</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Recurring Routines for this Member */}
              {memberRoutineList.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-slate-800">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-400" />
                    <span>Routines</span>
                  </div>

                  {memberRoutineList.map(resp => (
                    <div
                      key={resp.Responsibility_ID}
                      className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-semibold text-slate-200 truncate">{resp.Title}</span>
                      <button
                        type="button"
                        onClick={() => handleRoutineCheck(resp)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1"
                        title="Mark verified for today"
                      >
                        <Check className="w-3 h-3" />
                        <span>Today</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
