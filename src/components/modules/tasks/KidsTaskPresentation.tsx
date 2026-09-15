import React, { useState, useMemo } from 'react';
import { TaskItem, TaskResponsibility, FamilyMember } from '../../../types';
import { CanonicalTaskStatus, normalizeTaskStatus } from './taskConstants';
import { FamilyAvatar } from '../../ui/FamilyAvatar';
import {
  Star,
  Sparkles,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sun,
  Award,
  Check,
  Flame,
  ThumbsUp,
  Heart
} from 'lucide-react';

export interface KidsTaskPresentationProps {
  tasks: TaskItem[];
  responsibilities: TaskResponsibility[];
  currentMember: FamilyMember;
  onStatusUpdate: (taskId: string, status: CanonicalTaskStatus, note?: string) => Promise<void>;
  onCompleteResponsibility: (respId: string, dateStr: string) => Promise<void>;
}

export const KidsTaskPresentation: React.FC<KidsTaskPresentationProps> = ({
  tasks,
  responsibilities,
  currentMember,
  onStatusUpdate,
  onCompleteResponsibility,
}) => {
  const [activeTab, setActiveTab] = useState<'CHORES' | 'ROUTINES'>('CHORES');
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  // STRICT REQUIREMENT: Child only sees own assigned work!
  const myTasks = useMemo(() => {
    return tasks.filter(t => t.Assigned_To === currentMember.Member_ID);
  }, [tasks, currentMember.Member_ID]);

  // Child's recurring responsibilities
  const myResponsibilities = useMemo(() => {
    return responsibilities.filter(r => r.Active && r.Assigned_To === currentMember.Member_ID);
  }, [responsibilities, currentMember.Member_ID]);

  // Points earned by this child
  const totalPointsEarned = useMemo(() => {
    return myTasks
      .filter(t => normalizeTaskStatus(t.Status) === 'VERIFIED')
      .reduce((sum, t) => sum + (Number(t.Points) || 0), 0);
  }, [myTasks]);

  const triggerCelebration = (msg: string) => {
    setCelebrationMessage(msg);
    setTimeout(() => {
      setCelebrationMessage(null);
    }, 3500);
  };

  const handleMarkFinished = async (task: TaskItem) => {
    try {
      setUpdatingTaskId(task.Task_ID);
      await onStatusUpdate(task.Task_ID, 'PENDING_APPROVAL');
      triggerCelebration(`Awesome job ${currentMember.First_Name}! Submitted to Mom & Dad for +${task.Points} points! ⭐`);
    } catch (err) {
      console.error('Failed to submit chore:', err);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const handleRoutineCheck = async (resp: TaskResponsibility) => {
    try {
      await onCompleteResponsibility(resp.Responsibility_ID, todayStr);
      triggerCelebration(`Great habit! Finished ${resp.Title} for today! 🌟`);
    } catch (err) {
      console.error('Failed to complete routine:', err);
    }
  };

  return (
    <div className="space-y-4 pb-12 max-w-2xl mx-auto">
      {/* Friendly Kid Banner */}
      <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 rounded-3xl p-5 text-stone-950 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FamilyAvatar
              member={currentMember}
              size="lg"
              shape="circle"
              showBorder={true}
              className="ring-4 ring-white/40"
            />
            <div>
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-950/80">
                <Sparkles className="w-3.5 h-3.5" />
                <span>My Missions & Chores</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-stone-950">
                Hi, {currentMember.First_Name}!
              </h2>
              <p className="text-xs font-semibold text-amber-950/90 mt-0.5">
                Complete your missions to earn family points!
              </p>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xs rounded-2xl px-3.5 py-2.5 text-center shadow-xs shrink-0">
            <div className="flex items-center justify-center gap-1 text-amber-600">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span className="text-base font-black">{totalPointsEarned}</span>
            </div>
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              Earned Points
            </div>
          </div>
        </div>
      </div>

      {/* Celebration Toast */}
      {celebrationMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500 text-white font-bold text-center shadow-lg animate-bounce flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-200 shrink-0" />
          <span>{celebrationMessage}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-stone-100 rounded-2xl border border-stone-200 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('CHORES')}
          className={`py-2.5 rounded-xl transition-all text-center flex items-center justify-center gap-2 ${
            activeTab === 'CHORES'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span>My Tasks</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-100 text-amber-800 font-black">
            {myTasks.filter(t => normalizeTaskStatus(t.Status) !== 'VERIFIED').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ROUTINES')}
          className={`py-2.5 rounded-xl transition-all text-center flex items-center justify-center gap-2 ${
            activeTab === 'ROUTINES'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Sun className="w-4 h-4 text-amber-500" />
          <span>Daily Routines ({myResponsibilities.length})</span>
        </button>
      </div>

      {/* TAB: CHORES */}
      {activeTab === 'CHORES' && (
        <div className="space-y-3">
          {myTasks.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border-2 border-dashed border-stone-200">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-base font-black text-stone-900">All Done! No Chores Open</h3>
              <p className="text-xs text-stone-500 mt-1">
                You're completely caught up! Have fun playing or check your daily routines!
              </p>
            </div>
          ) : (
            myTasks.map(task => {
              const status = normalizeTaskStatus(task.Status);
              const isOpen = status === 'OPEN' || status === 'IN_PROGRESS';
              const isPending = status === 'PENDING_APPROVAL';
              const isVerified = status === 'VERIFIED';
              const isReopened = status === 'REOPENED';
              const isUpdating = updatingTaskId === task.Task_ID;

              return (
                <div
                  key={task.Task_ID}
                  className={`rounded-3xl border-2 p-4 sm:p-5 transition-all bg-white shadow-xs ${
                    isPending
                      ? 'border-amber-300 bg-amber-50/20'
                      : isVerified
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : isReopened
                      ? 'border-rose-300 bg-rose-50/20'
                      : 'border-stone-200 hover:border-amber-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      {/* Reward Pill */}
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>+{task.Points} Stars</span>
                        </span>

                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3" />
                            <span>Waiting for Mom & Dad Review</span>
                          </span>
                        )}

                        {isVerified && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approved! +{task.Points} pts</span>
                          </span>
                        )}

                        {isReopened && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                            <RotateCcw className="w-3 h-3" />
                            <span>Needs a quick fix</span>
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3
                        className={`text-base font-black text-stone-900 mt-1 ${
                          isVerified ? 'line-through text-stone-400' : ''
                        }`}
                      >
                        {task.Title}
                      </h3>

                      {task.Description && (
                        <p className="text-xs text-stone-600 leading-relaxed">{task.Description}</p>
                      )}

                      <p className="text-[11px] text-stone-400 pt-1">Due {task.Due_Date}</p>

                      {/* Reopened Note banner */}
                      {isReopened && (
                        <div className="mt-2 p-3 rounded-2xl bg-rose-100/70 border border-rose-300 text-xs text-rose-900 font-medium flex items-start gap-2">
                          <span className="text-lg">✏️</span>
                          <div>
                            <span className="font-bold">Mom & Dad wrote:</span> Please check your work and mark finished again when done!
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Big Touch-Friendly Completion Button for Kids */}
                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-end">
                    {isOpen && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleMarkFinished(task)}
                        className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-5 h-5 text-amber-200" />
                        <span>I Did This! Submit to Mom & Dad 🎉</span>
                      </button>
                    )}

                    {isReopened && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleMarkFinished(task)}
                        className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-5 h-5 text-white" />
                        <span>I Fixed It! Submit Again ✨</span>
                      </button>
                    )}

                    {isPending && (
                      <div className="w-full py-2.5 px-4 rounded-2xl bg-amber-50 text-amber-800 text-xs font-bold text-center border border-amber-200 flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
                        <span>Submitted! Mom or Dad will review and award points soon.</span>
                      </div>
                    )}

                    {isVerified && (
                      <div className="w-full py-2 px-4 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-bold text-center border border-emerald-200 flex items-center justify-center gap-1.5">
                        <Award className="w-4 h-4 text-emerald-600" />
                        <span>Verified! Points added to your balance! ⭐</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB: ROUTINES */}
      {activeTab === 'ROUTINES' && (
        <div className="space-y-3">
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-xs text-amber-900 font-medium">
            Tap daily routines when finished today. Tomorrow they reset automatically!
          </div>

          {myResponsibilities.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border-2 border-dashed border-stone-200">
              <Sun className="w-10 h-10 text-amber-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-stone-700">No daily routines set up yet.</p>
              <p className="text-[11px] text-stone-400 mt-0.5">Ask Mom or Dad to set daily routines for you!</p>
            </div>
          ) : (
            myResponsibilities.map(resp => (
              <div
                key={resp.Responsibility_ID}
                className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-stone-200 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-stone-900">{resp.Title}</span>
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      +{resp.Points} pts
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">Repeats {resp.Recurrence.toLowerCase()}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRoutineCheck(resp)}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Done Today</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
