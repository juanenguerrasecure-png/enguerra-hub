import React, { useState, useMemo } from 'react';
import { TaskItem, TaskResponsibility, TaskHistoryEntry, FamilyMember } from '../../../types';
import { CanonicalTaskStatus, normalizeTaskStatus, CATEGORY_CONFIG } from './taskConstants';
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
  Filter,
  History,
  TrendingUp,
  Layers,
  Search
} from 'lucide-react';

export interface AdultDesktopTasksViewProps {
  tasks: TaskItem[];
  responsibilities: TaskResponsibility[];
  history: TaskHistoryEntry[];
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

type DesktopTab = 'TODO' | 'REVIEW' | 'ALL' | 'ROUTINES' | 'HISTORY';

export const AdultDesktopTasksView: React.FC<AdultDesktopTasksViewProps> = ({
  tasks,
  responsibilities,
  history,
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
  const [activeTab, setActiveTab] = useState<DesktopTab>('TODO');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
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

  // Points earned by each member from verified tasks
  const pointsByMember = useMemo(() => {
    const pts: Record<string, number> = {};
    tasks.forEach(t => {
      if (normalizeTaskStatus(t.Status) === 'VERIFIED') {
        pts[t.Assigned_To] = (pts[t.Assigned_To] || 0) + (Number(t.Points) || 0);
      }
    });
    return pts;
  }, [tasks]);

  // Review queue (pending approval)
  const pendingApprovalTasks = useMemo(() => {
    return tasks.filter(t => normalizeTaskStatus(t.Status) === 'PENDING_APPROVAL');
  }, [tasks]);

  // Filter tasks for main workspace
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      // Member filter
      if (selectedMemberId !== 'ALL' && t.Assigned_To !== selectedMemberId) return false;

      // Category filter
      if (selectedCategory !== 'ALL' && t.Category !== selectedCategory) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.Title.toLowerCase().includes(q);
        const matchDesc = t.Description?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }

      // Tab filter
      const s = normalizeTaskStatus(t.Status);
      if (activeTab === 'TODO') return s === 'OPEN' || s === 'IN_PROGRESS' || s === 'REOPENED';
      if (activeTab === 'REVIEW') return s === 'PENDING_APPROVAL';
      if (activeTab === 'ALL') return true;

      return true;
    });
  }, [tasks, selectedMemberId, selectedCategory, searchQuery, activeTab]);

  const activeResponsibilities = useMemo(() => {
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
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-[#E5E4E1] shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2.5">
            <CheckSquare className="w-5 h-5 text-amber-700" />
            <span>Chores & Family Responsibilities</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Full desktop workspace with child approvals, recurring responsibilities, and audit log
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenNewResponsibility}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 hover:border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-bold transition-colors"
          >
            <Repeat className="w-3.5 h-3.5 text-emerald-600" />
            <span>New Routine</span>
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

      {/* 3-Column Desktop Grid */}
      <div className="grid grid-cols-12 gap-5 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN (3 cols): Filters, Metrics & Scoreboard                       */}
        {/* ========================================================================= */}
        <div className="col-span-3 space-y-4">
          {/* Family Member Filter Sidebar */}
          <div className="bg-white rounded-2xl p-4 border border-[#E5E4E1] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Family Members
              </span>
              <button
                type="button"
                onClick={() => onSelectMember('ALL')}
                className={`text-[11px] font-semibold hover:underline ${
                  selectedMemberId === 'ALL' ? 'text-stone-900 font-bold' : 'text-stone-400'
                }`}
              >
                Clear Filter
              </button>
            </div>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => onSelectMember('ALL')}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                  selectedMemberId === 'ALL'
                    ? 'bg-stone-900 text-white font-semibold'
                    : 'hover:bg-stone-100 text-stone-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      selectedMemberId === 'ALL' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    FM
                  </div>
                  <span className="text-xs">All Family</span>
                </div>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    selectedMemberId === 'ALL' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {tasks.length}
                </span>
              </button>

              {members.map(member => {
                const isSelected = selectedMemberId === member.Member_ID;
                const activeCount = taskCountsByMember[member.Member_ID] || 0;
                const memberPts = pointsByMember[member.Member_ID] || 0;
                const memberColor = member.Color || '#164E35';

                return (
                  <button
                    key={member.Member_ID}
                    type="button"
                    onClick={() => onSelectMember(member.Member_ID)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-stone-50 border-2 font-semibold shadow-xs'
                        : 'hover:bg-stone-50 text-stone-700 border border-transparent'
                    }`}
                    style={{
                      borderColor: isSelected ? memberColor : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FamilyAvatar member={member} size="xs" shape="circle" showBorder={false} />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-900 truncate">
                          {member.Display_Name}
                        </div>
                        <div className="text-[10px] text-amber-700 font-semibold">
                          {memberPts} pts earned
                        </div>
                      </div>
                    </div>

                    {activeCount > 0 && (
                      <span className="text-[11px] px-1.5 py-0.2 rounded-full font-bold bg-stone-100 text-stone-700">
                        {activeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="bg-white rounded-2xl p-4 border border-[#E5E4E1] shadow-xs space-y-2">
            <span className="text-xs font-bold text-stone-800 uppercase tracking-wider block">
              Categories
            </span>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`w-full px-3 py-1.5 rounded-xl text-left text-xs font-semibold transition-colors flex items-center justify-between ${
                  selectedCategory === 'ALL'
                    ? 'bg-stone-100 text-stone-900'
                    : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                <span>All Categories</span>
              </button>

              {Object.entries(CATEGORY_CONFIG).map(([key, meta]) => {
                const Icon = meta.icon;
                const isCatSelected = selectedCategory === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedCategory(key)}
                    className={`w-full px-3 py-1.5 rounded-xl text-left text-xs font-semibold transition-colors flex items-center gap-2 ${
                      isCatSelected
                        ? 'bg-stone-100 text-stone-900'
                        : 'text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CENTER COLUMN (6 cols): Main Workspace & Task Board                       */}
        {/* ========================================================================= */}
        <div className="col-span-6 space-y-4">
          {/* Subnavigation Bar */}
          <div className="flex items-center justify-between bg-white rounded-2xl p-2 border border-[#E5E4E1] shadow-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('TODO')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'TODO'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                To Do
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('REVIEW')}
                className={`relative px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'REVIEW'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <span>In Review</span>
                {pendingApprovalTasks.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-white text-amber-900 font-extrabold">
                    {pendingApprovalTasks.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'ALL'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                All Chores
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ROUTINES')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'ROUTINES'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                Routines ({activeResponsibilities.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('HISTORY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'HISTORY'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                Audit Log
              </button>
            </div>

            {/* Quick search */}
            <div className="relative w-44">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search chores..."
                className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-stone-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-stone-400/20"
              />
            </div>
          </div>

          {/* TAB: TASKS (TODO / REVIEW / ALL) */}
          {(activeTab === 'TODO' || activeTab === 'REVIEW' || activeTab === 'ALL') && (
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-stone-200">
                  <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-stone-800">No matching chores</p>
                  <p className="text-xs text-stone-400 mt-1">
                    Try adjusting your filters or search terms.
                  </p>
                </div>
              ) : (
                filteredTasks.map(task => (
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
          )}

          {/* TAB: ROUTINES */}
          {activeTab === 'ROUTINES' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-stone-700">Recurring Responsibilities</span>
                <button
                  type="button"
                  onClick={onOpenNewResponsibility}
                  className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Routine</span>
                </button>
              </div>

              {activeResponsibilities.map(resp => {
                const assigned = memberMap.get(resp.Assigned_To);
                return (
                  <div
                    key={resp.Responsibility_ID}
                    className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      {assigned && (
                        <FamilyAvatar member={assigned} size="sm" shape="circle" showBorder={true} />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-stone-900">{resp.Title}</span>
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            +{resp.Points} pts
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          Assigned to {assigned?.Display_Name} • Repeats {resp.Recurrence}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onCompleteResponsibility(resp.Responsibility_ID, todayStr)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
                        title="Mark verified for today without completing future occurrences"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Verify Today</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB: AUDIT LOG */}
          {activeTab === 'HISTORY' && (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs divide-y divide-stone-100 overflow-hidden">
              <div className="p-4 bg-stone-50/50 flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-stone-500" />
                  <span>Real-Time Audit History</span>
                </span>
                <span className="text-[11px] text-stone-400">Synced from Google Sheets</span>
              </div>

              {history.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-400">No audit logs recorded yet.</div>
              ) : (
                history.slice(0, 30).map(entry => {
                  const member = memberMap.get(entry.Member_ID);
                  return (
                    <div key={entry.History_ID} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        {member && <FamilyAvatar member={member} size="xs" shape="circle" showBorder={false} />}
                        <div>
                          <span className="font-bold text-stone-900">{member?.First_Name || 'System'}</span>{' '}
                          <span className="text-stone-600 font-medium">marked task {entry.Action}</span>
                          {entry.Note && (
                            <p className="text-[11px] text-stone-500 italic mt-0.5">"{entry.Note}"</p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {entry.Points_Awarded > 0 && (
                          <div className="text-emerald-600 font-bold text-xs">
                            +{entry.Points_Awarded} pts
                          </div>
                        )}
                        <div className="text-[10px] text-stone-400">
                          {new Date(entry.Timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN (3 cols): Parent Review Station Rail                         */}
        {/* ========================================================================= */}
        <div className="col-span-3 space-y-4">
          {/* Parent Approval Station */}
          <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs overflow-hidden">
            <div className="bg-amber-50/80 p-4 border-b border-amber-200/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Review Station
                </h3>
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

            <div className="p-3.5 space-y-2.5 max-h-[480px] overflow-y-auto">
              {pendingApprovalTasks.length === 0 ? (
                <div className="text-center py-8 text-stone-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="text-xs font-bold text-stone-800">All Caught Up!</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    No tasks waiting for parent verification.
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

          {/* Points Leaderboard Box */}
          <div className="bg-white rounded-2xl border border-[#E5E4E1] shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Points Scoreboard
                </h4>
              </div>
              <span className="text-[11px] text-stone-400">Verified</span>
            </div>

            <div className="space-y-2">
              {members.map(m => {
                const pts = pointsByMember[m.Member_ID] || 0;
                return (
                  <div key={m.Member_ID} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2">
                      <FamilyAvatar member={m} size="xs" shape="circle" showBorder={false} />
                      <span className="font-semibold text-stone-800">{m.Display_Name}</span>
                    </div>
                    <span className="font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {pts} pts
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
