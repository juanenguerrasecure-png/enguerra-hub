import React, { useState, useEffect } from 'react';
import { TaskItem, TaskResponsibility, TaskHistoryEntry } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  CheckSquare,
  Award,
  Clock,
  CheckCircle,
  Plus,
  RotateCcw,
  Sparkles,
  History,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

export const TasksView: React.FC = () => {
  const { session, members, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [responsibilities, setResponsibilities] = useState<TaskResponsibility[]>([]);
  const [history, setHistory] = useState<TaskHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'TASKS' | 'RESPONSIBILITIES' | 'HISTORY'>('TASKS');
  const [selectedMember, setSelectedMember] = useState<string>('ALL');
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  // New Task Form
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newPoints, setNewPoints] = useState(15);
  const [newCategory, setNewCategory] = useState<'CHORE' | 'HOMEWORK' | 'ROUTINE'>('CHORE');

  const fetchTasksData = async () => {
    try {
      setLoading(true);
      const [t, r, h] = await Promise.all([
        api.getTasks(),
        api.getResponsibilities(),
        api.getTaskHistory(),
      ]);
      setTasks(t);
      setResponsibilities(r);
      setHistory(h);
    } catch (err) {
      console.error('Failed to load tasks data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && session) {
      fetchTasksData();
    }
  }, [authLoading, session]);

  const handleStatusUpdate = async (taskId: string, status: string, note?: string) => {
    try {
      await api.updateTaskStatus(taskId, status, note);
      fetchTasksData();
    } catch (err: any) {
      alert(err.message || 'Failed to update task');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newAssignedTo) return;

    try {
      await api.createTask({
        Title: newTitle,
        Due_Date: newDueDate,
        Assigned_To: newAssignedTo,
        Points: newPoints,
        Category: newCategory,
        Visibility: 'FAMILY',
      });
      setIsNewTaskModalOpen(false);
      setNewTitle('');
      fetchTasksData();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const getMember = (id: string) => members.find(m => m.Member_ID === id);

  const filteredTasks = tasks.filter(t => {
    if (selectedMember === 'ALL') return true;
    return t.Assigned_To === selectedMember;
  });

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center space-x-2">
            <CheckSquare className="w-5 h-5 text-orange-700" />
            <span>Chores & Family Responsibilities</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time Sheets persistence • Child completions & Parent point approvals
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Sub Navigation */}
          <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs">
            <button
              onClick={() => setActiveTab('TASKS')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'TASKS' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Chores ({tasks.filter(t => t.Status !== 'APPROVED').length})
            </button>
            <button
              onClick={() => setActiveTab('RESPONSIBILITIES')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'RESPONSIBILITIES' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Routines
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'HISTORY' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Audit Log
            </button>
          </div>

          {session?.isParent && (
            <button
              onClick={() => setIsNewTaskModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-orange-700 hover:bg-orange-800 text-white font-medium text-xs shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Chore</span>
            </button>
          )}
        </div>
      </div>

      {/* Member Filter Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedMember('ALL')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            selectedMember === 'ALL'
              ? 'bg-stone-900 text-white border-stone-900'
              : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
          }`}
        >
          All Family
        </button>
        {members.map(m => (
          <button
            key={m.Member_ID}
            onClick={() => setSelectedMember(m.Member_ID)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              selectedMember === m.Member_ID
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.Color }} />
            <span>{m.Display_Name}</span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="text-center py-12 text-stone-400 text-xs">Loading chores...</div>
      ) : activeTab === 'TASKS' ? (
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-stone-200">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-stone-800">All chores caught up!</p>
              <p className="text-xs text-stone-400 mt-1">Great job family! No open tasks.</p>
            </div>
          ) : (
            filteredTasks.map(task => {
              const assignedMember = getMember(task.Assigned_To);
              const isApproved = task.Status === 'APPROVED';
              const isCompleted = task.Status === 'COMPLETED';
              const isPending = task.Status === 'PENDING';
              const isAssignedToUser = session?.member.Member_ID === task.Assigned_To;

              return (
                <div
                  key={task.Task_ID}
                  className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isApproved
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : isCompleted
                      ? 'border-amber-200 bg-amber-50/20'
                      : 'border-stone-200'
                  }`}
                >
                  <div className="flex items-start space-x-3.5">
                    {assignedMember && (
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs mt-0.5"
                        style={{ backgroundColor: assignedMember.Color }}
                        title={assignedMember.Display_Name}
                      >
                        {assignedMember.First_Name.charAt(0)}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                          {task.Category}
                        </span>
                        <span className="flex items-center space-x-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Award className="w-3.5 h-3.5" />
                          <span>+{task.Points} pts</span>
                        </span>
                        {isCompleted && (
                          <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-full">
                            Pending Parent Approval
                          </span>
                        )}
                        {isApproved && (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                            Approved
                          </span>
                        )}
                      </div>

                      <h3
                        className={`text-base font-bold text-stone-900 mt-1 ${
                          isApproved ? 'line-through text-stone-400' : ''
                        }`}
                      >
                        {task.Title}
                      </h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Due {task.Due_Date} • Assigned to {assignedMember?.Display_Name || 'Family'}
                      </p>
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center space-x-2 shrink-0">
                    {/* Child or Parent can complete task */}
                    {isPending && (
                      <button
                        onClick={() => handleStatusUpdate(task.Task_ID, 'COMPLETED')}
                        className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs shadow-xs transition-colors"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>Mark Done</span>
                      </button>
                    )}

                    {/* Parent Approval Button */}
                    {session?.isParent && isCompleted && (
                      <button
                        onClick={() => handleStatusUpdate(task.Task_ID, 'APPROVED')}
                        className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs transition-colors"
                      >
                        <Sparkles className="w-4 h-4 text-amber-200" />
                        <span>Approve & Award Points</span>
                      </button>
                    )}

                    {/* Parent Reopen Button */}
                    {session?.isParent && (isCompleted || isApproved) && (
                      <button
                        onClick={() => handleStatusUpdate(task.Task_ID, 'PENDING', 'Reopened by parent')}
                        className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                        title="Reopen Task"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : activeTab === 'RESPONSIBILITIES' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {responsibilities.map(resp => {
            const member = getMember(resp.Assigned_To);
            return (
              <div
                key={resp.Responsibility_ID}
                className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                    {resp.Recurrence}
                  </span>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    +{resp.Points} pts
                  </span>
                </div>

                <h3 className="text-base font-bold text-stone-900">{resp.Title}</h3>
                <p className="text-xs text-stone-500 mt-1">
                  Responsible: <strong className="text-stone-700">{member?.Display_Name}</strong>
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                    const isActive = resp.Target_Days.includes(day);
                    return (
                      <span
                        key={day}
                        className={`text-[10px] font-semibold px-2 py-1 rounded-md ${
                          isActive ? 'bg-orange-700 text-white' : 'bg-stone-100 text-stone-400'
                        }`}
                      >
                        {day}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Task History Audit Trail */
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center space-x-2">
            <History className="w-4 h-4 text-orange-700" />
            <span>Points & Chore Audit Trail (Task_History)</span>
          </h3>
          <div className="divide-y divide-stone-100 text-xs">
            {history.length === 0 ? (
              <div className="py-6 text-center text-stone-400">No task activity logged yet.</div>
            ) : (
              history.map(entry => {
                const member = getMember(entry.Member_ID);
                return (
                  <div key={entry.History_ID} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <strong className="text-stone-900">{member?.Display_Name || 'Family Member'}</strong>
                        <span className="font-semibold text-stone-500 uppercase text-[10px] bg-stone-100 px-2 py-0.5 rounded-full">
                          {entry.Action}
                        </span>
                        {entry.Points_Awarded > 0 && (
                          <span className="font-bold text-emerald-700">+{entry.Points_Awarded} Points Awarded</span>
                        )}
                      </div>
                      {entry.Note && <p className="text-stone-500 mt-0.5">{entry.Note}</p>}
                    </div>
                    <span className="text-[11px] text-stone-400">
                      {new Date(entry.Timestamp).toLocaleDateString()} {new Date(entry.Timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 pb-3 border-b border-stone-100">
              Assign Family Chore
            </h3>
            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Chore Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Empty Dishwasher, Homework Pack, Fold Laundry"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={e => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Reward Points</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newPoints}
                    onChange={e => setNewPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Assign To</label>
                <select
                  required
                  value={newAssignedTo}
                  onChange={e => setNewAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-600"
                >
                  <option value="">Select Child / Family Member</option>
                  {members.map(m => (
                    <option key={m.Member_ID} value={m.Member_ID}>
                      {m.Display_Name} ({m.Role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-orange-700 hover:bg-orange-800 text-white text-xs font-medium shadow-xs"
                >
                  Assign to Sheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
