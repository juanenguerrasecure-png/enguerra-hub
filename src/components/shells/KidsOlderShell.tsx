import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TaskItem, CalendarEvent, FamilyListItem } from '../../types';
import { api } from '../../lib/api';
import {
  Award,
  CheckCircle2,
  Calendar,
  MessageSquare,
  ShoppingCart,
  Sparkles,
  Smile,
  Plus,
  Circle
} from 'lucide-react';

export const KidsOlderShell: React.FC = () => {
  const { session } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [requestText, setRequestText] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [loading, setLoading] = useState(true);

  const memberId = session?.member.Member_ID;
  const childName = session?.member.First_Name || 'Kid';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [t, e] = await Promise.all([api.getTasks(), api.getEvents()]);
      setTasks(t.filter(task => task.Assigned_To === memberId));
      setEvents(e);
    } catch (err) {
      console.error('Kids data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [memberId]);

  const handleCompleteChore = async (taskId: string) => {
    try {
      await api.updateTaskStatus(taskId, 'COMPLETED');
      fetchData();
    } catch (err) {
      console.error('Complete chore error:', err);
    }
  };

  const handleRequestGrocery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestText.trim()) return;

    try {
      const lists = await api.getLists();
      const groceryList = lists.find(l => l.Category === 'GROCERY') || lists[0];
      if (groceryList) {
        await api.addListItem(groceryList.List_ID, `${requestText} (requested by ${childName})`);
        setRequestText('');
        setRequestSent(true);
        setTimeout(() => setRequestSent(false), 3000);
      }
    } catch (err) {
      console.error('Failed to submit grocery request:', err);
    }
  };

  // Calculate points
  const totalApprovedPoints = tasks
    .filter(t => t.Status === 'APPROVED')
    .reduce((sum, t) => sum + t.Points, 0);

  const pendingChores = tasks.filter(t => t.Status === 'PENDING');
  const completedChores = tasks.filter(t => t.Status === 'COMPLETED');

  return (
    <div className="space-y-6">
      {/* Fun Hero Greeting */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-100 mb-1">
              <Smile className="w-4 h-4" />
              <span>Kids Clubhouse</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Hey {childName}! ⭐</h2>
            <p className="text-xs sm:text-sm text-amber-100 mt-1">
              You have {pendingChores.length} chores to complete today. Keep rocking!
            </p>
          </div>

          {/* Points Trophy Badge */}
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30 text-center shrink-0">
            <div className="flex items-center justify-center space-x-1 text-yellow-300">
              <Award className="w-6 h-6" />
              <span className="text-2xl font-black text-white">{totalApprovedPoints}</span>
            </div>
            <div className="text-[11px] font-bold text-amber-100 uppercase mt-0.5">Family Points</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: My Chores */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <h3 className="text-base font-bold text-stone-900 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>My Chores & Missions</span>
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700">
                {pendingChores.length} Open
              </span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-stone-400">Loading your chores...</div>
            ) : tasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400">
                No chores assigned right now! Enjoy your day!
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map(task => {
                  const isDone = task.Status === 'COMPLETED' || task.Status === 'APPROVED';
                  const isApproved = task.Status === 'APPROVED';

                  return (
                    <div
                      key={task.Task_ID}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        isApproved
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : isDone
                          ? 'bg-amber-50/40 border-amber-200'
                          : 'bg-white border-stone-200 hover:border-orange-400'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            isApproved
                              ? 'bg-emerald-600 text-white'
                              : isDone
                              ? 'bg-amber-500 text-white'
                              : 'border-2 border-stone-300'
                          }`}
                        >
                          {isApproved ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : isDone ? (
                            <Sparkles className="w-3.5 h-3.5" />
                          ) : (
                            <Circle className="w-3 h-3 text-transparent" />
                          )}
                        </div>

                        <div>
                          <h4
                            className={`text-sm font-bold ${
                              isApproved ? 'line-through text-stone-400' : 'text-stone-900'
                            }`}
                          >
                            {task.Title}
                          </h4>
                          <span className="text-xs font-semibold text-amber-700">
                            +{task.Points} pts reward
                          </span>
                        </div>
                      </div>

                      {task.Status === 'PENDING' && (
                        <button
                          onClick={() => handleCompleteChore(task.Task_ID)}
                          className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold text-xs shadow-xs transition-colors"
                        >
                          Mark Done
                        </button>
                      )}

                      {task.Status === 'COMPLETED' && (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                          Waiting for Dad/Mom
                        </span>
                      )}

                      {isApproved && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                          Points Awarded!
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Schedule & Snack Request */}
        <div className="space-y-4">
          {/* Grocery Snack Request */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-stone-900 mb-2 flex items-center space-x-2">
              <ShoppingCart className="w-4 h-4 text-orange-600" />
              <span>Request Snacks or Supplies</span>
            </h3>
            <p className="text-xs text-stone-500 mb-3">
              Add your favorite fruit, cereal, or school materials to the family grocery list.
            </p>

            <form onSubmit={handleRequestGrocery} className="space-y-2">
              <input
                type="text"
                required
                placeholder="e.g. Goldfish crackers, Blueberries"
                value={requestText}
                onChange={e => setRequestText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-600"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs shadow-xs transition-colors"
              >
                Send Request to List
              </button>
            </form>

            {requestSent && (
              <div className="mt-2 text-center text-xs font-bold text-emerald-600">
                Added to family grocery list!
              </div>
            )}
          </div>

          {/* Today's Schedule */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-orange-600" />
              <span>Today's Family Schedule</span>
            </h3>
            <div className="space-y-2.5">
              {events.slice(0, 4).map(e => (
                <div key={e.Event_ID} className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-xs">
                  <div className="font-bold text-stone-800">{e.Title}</div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    {new Date(e.Start_Time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                    {e.Location || 'Home'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
