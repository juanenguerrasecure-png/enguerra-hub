import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { TaskItem, CalendarEvent } from '../../types';
import { FamilyAvatar } from '../ui/FamilyAvatar';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  Star,
  Sun,
  Moon,
  Backpack,
  Calendar,
  Clock,
  Heart,
  ChevronRight,
  Smile,
  LogOut,
  Palette,
  Home,
  Award,
  Flame,
  Check,
  RotateCcw
} from 'lucide-react';

export type KidsTab = 'TODAY' | 'ROUTINES' | 'REWARDS' | 'NEXT' | 'ME';

export const KidsAppShell: React.FC = () => {
  const { session, members, logout } = useAuth();
  const currentMember = session?.member;
  const [activeTab, setActiveTab] = useState<KidsTab>('TODAY');

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [celebration, setCelebration] = useState(false);
  const [nightMode, setNightMode] = useState(false);

  // Dynamic state for daily routines
  const [routineChecks, setRoutineChecks] = useState<{ [key: string]: boolean }>({
    'make-bed': true,
    'brush-teeth': true,
    'breakfast': true,
    'pack-school-bag': false,
    'homework': false
  });

  const memberId = currentMember?.Member_ID;

  const loadKidData = async () => {
    if (!memberId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [tList, eList] = await Promise.all([
        api.getTasks(memberId),
        api.getEvents()
      ]);
      setTasks(tList);
      setEvents(eList);
    } catch (err) {
      console.error('Failed to load kid data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKidData();
  }, [memberId]);

  const handleToggleRoutine = (id: string) => {
    setRoutineChecks(prev => {
      const next = { ...prev, [id]: !prev[id] };
      if (!prev[id]) {
        triggerCelebration();
      }
      return next;
    });
  };

  const handleCompleteChore = async (task: TaskItem) => {
    const s = task.Status.toUpperCase();
    if (s === 'VERIFIED' || s === 'APPROVED' || s === 'PENDING_APPROVAL') return;
    try {
      await api.updateTaskStatus(task.Task_ID, 'PENDING_APPROVAL');
      setTasks(prev =>
        prev.map(t => (t.Task_ID === task.Task_ID ? { ...t, Status: 'PENDING_APPROVAL' } : t))
      );
      triggerCelebration();
    } catch (err) {
      console.error('Failed to complete chore:', err);
    }
  };

  const triggerCelebration = () => {
    setCelebration(true);
    setTimeout(() => setCelebration(false), 2400);
  };

  const completedCount = tasks.filter(t => t.Status === 'VERIFIED' || t.Status === 'APPROVED').length;
  const pendingReviewCount = tasks.filter(t => t.Status === 'PENDING_APPROVAL').length;
  const pendingCount = tasks.filter(t => t.Status !== 'VERIFIED' && t.Status !== 'APPROVED').length;
  const kidStars = tasks
    .filter(t => t.Status === 'VERIFIED' || t.Status === 'APPROVED')
    .reduce((sum, t) => sum + (Number(t.Points) || 0), 15);

  const kidTabs: { id: KidsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'TODAY', label: 'Today', icon: <Home className="w-5 h-5" /> },
    { id: 'ROUTINES', label: 'Routines', icon: <Sun className="w-5 h-5" /> },
    { id: 'REWARDS', label: 'Rewards', icon: <Star className="w-5 h-5" /> },
    { id: 'NEXT', label: 'Next', icon: <Calendar className="w-5 h-5" /> },
    { id: 'ME', label: 'Me', icon: <Smile className="w-5 h-5" /> },
  ];

  return (
    <div
      className={`min-h-[85vh] rounded-3xl transition-colors duration-300 pb-20 ${
        nightMode ? 'bg-indigo-950 text-indigo-100' : 'bg-amber-50/70 text-stone-900'
      }`}
    >
      {/* Celebration Popup Banner */}
      {celebration && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-400 to-yellow-500 text-stone-950 font-black px-6 py-3 rounded-full shadow-2xl flex items-center space-x-2 animate-bounce border-2 border-white">
          <Sparkles className="w-5 h-5 text-stone-900" />
          <span>AWESOME JOB! +5 STARS EARNED! 🌟</span>
        </div>
      )}

      {/* Kids Header Banner */}
      <div className="p-4 sm:p-6 border-b border-amber-200/60 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FamilyAvatar
            member={currentMember}
            size="touchKids"
            shape="squircle"
            className="shadow-sm"
          />
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black tracking-tight">
                Hey {currentMember?.First_Name || 'Kiddo'}!
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-pink-100 text-pink-700 border border-pink-200">
                Kids Mode
              </span>
            </div>
            <p className="text-xs opacity-75">Let&apos;s have a fun and productive day!</p>
          </div>
        </div>

        {/* Star Counter Pill */}
        <div className="flex items-center space-x-2 bg-gradient-to-r from-amber-400 to-yellow-400 text-stone-950 px-4 py-2 rounded-2xl font-black shadow-sm border border-yellow-300">
          <Star className="w-5 h-5 fill-stone-950 text-stone-950" />
          <span className="text-base">{kidStars}</span>
          <span className="text-[11px] uppercase tracking-wider font-extrabold">Stars</span>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        {/* ========================================================================= */}
        {/* TAB 1: TODAY (Day Plan, Chores to Do, Highlights)                         */}
        {/* ========================================================================= */}
        {activeTab === 'TODAY' && (
          <div className="space-y-6">
            {/* Quick Status Card */}
            <div className="bg-white rounded-3xl p-5 border-2 border-amber-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Today&apos;s Missions</span>
                <h3 className="text-lg font-black text-stone-900 mt-0.5">
                  {completedCount} Completed • {pendingCount} To Go
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                <Flame className="w-6 h-6" />
              </div>
            </div>

            {/* Chores & Missions List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">My Tasks Today</h3>
                <span className="text-xs text-stone-500">Tap circle when finished!</span>
              </div>

              {tasks.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 text-center border border-amber-100">
                  <Smile className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-stone-800">All caught up!</p>
                  <p className="text-xs text-stone-500 mt-1">No pending chores assigned to you right now.</p>
                </div>
              ) : (
                tasks.map(task => {
                  const s = task.Status.toUpperCase();
                  const isVerified = s === 'VERIFIED' || s === 'APPROVED';
                  const isPending = s === 'PENDING_APPROVAL' || s === 'COMPLETED';
                  const isReopened = s === 'REOPENED';
                  return (
                    <div
                      key={task.Task_ID}
                      onClick={() => !isVerified && !isPending && handleCompleteChore(task)}
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                        isVerified
                          ? 'bg-emerald-50/80 border-emerald-300 opacity-90'
                          : isPending
                          ? 'bg-amber-50/80 border-amber-300'
                          : isReopened
                          ? 'bg-rose-50/80 border-rose-300 cursor-pointer'
                          : 'bg-white border-amber-200 hover:border-amber-400 shadow-xs cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <button className="shrink-0">
                          {isVerified ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-100" />
                          ) : isPending ? (
                            <Clock className="w-6 h-6 text-amber-500" />
                          ) : isReopened ? (
                            <RotateCcw className="w-6 h-6 text-rose-500" />
                          ) : (
                            <Circle className="w-6 h-6 text-stone-300 hover:text-amber-500" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <h4 className={`text-sm font-bold truncate ${isVerified ? 'line-through text-stone-500' : 'text-stone-900'}`}>
                            {task.Title}
                          </h4>
                          <div className="text-xs mt-0.5">
                            {isVerified && (
                              <span className="text-emerald-700 font-semibold">Approved by Mom & Dad!</span>
                            )}
                            {isPending && (
                              <span className="text-amber-700 font-semibold">Submitted! Waiting for approval</span>
                            )}
                            {isReopened && (
                              <span className="text-rose-700 font-semibold">Mom & Dad asked for a fix. Tap when done!</span>
                            )}
                            {!isVerified && !isPending && !isReopened && task.Description && (
                              <p className="text-stone-500 truncate">{task.Description}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 ml-2">
                        <span className="text-xs font-black px-2 py-1 rounded-xl bg-amber-100 text-amber-800 flex items-center space-x-1">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>+{task.Points || 5}</span>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ROUTINES (Morning & Evening Habit Checklist)                       */}
        {/* ========================================================================= */}
        {activeTab === 'ROUTINES' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-3xl p-5 text-stone-950 font-black shadow-md">
              <div className="flex items-center space-x-2 text-xs uppercase tracking-wider opacity-80">
                <Sun className="w-4 h-4" />
                <span>Daily Habit Builder</span>
              </div>
              <h2 className="text-xl font-black mt-1">Morning & Evening Checkpoints</h2>
              <p className="text-xs font-medium opacity-90 mt-1">
                Complete your routines every day to earn streak bonuses!
              </p>
            </div>

            <div className="space-y-3">
              {[
                { id: 'make-bed', title: 'Make My Bed', time: 'Morning', icon: '🛏️' },
                { id: 'brush-teeth', title: 'Brush Teeth (2 minutes)', time: 'Morning & Night', icon: '🪥' },
                { id: 'breakfast', title: 'Eat Healthy Breakfast', time: 'Morning', icon: '🥣' },
                { id: 'pack-school-bag', title: 'Pack School Bag & Water', time: 'Afternoon', icon: '🎒' },
                { id: 'homework', title: 'Homework or 20 Mins Reading', time: 'Evening', icon: '📚' },
              ].map(item => {
                const checked = routineChecks[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleRoutine(item.id)}
                    className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                      checked
                        ? 'bg-emerald-50 border-emerald-300'
                        : 'bg-white border-amber-200 hover:border-amber-400'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <div className={`text-sm font-bold ${checked ? 'text-stone-500 line-through' : 'text-stone-900'}`}>
                          {item.title}
                        </div>
                        <div className="text-[11px] text-stone-500">{item.time}</div>
                      </div>
                    </div>
                    <div>
                      {checked ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Circle className="w-6 h-6 text-stone-300" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: REWARDS (Stars Bank & Wishlist)                                    */}
        {/* ========================================================================= */}
        {activeTab === 'REWARDS' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-3xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider opacity-90">My Star Bank</span>
                  <div className="text-4xl font-black mt-1 flex items-center space-x-2">
                    <Star className="w-8 h-8 fill-yellow-300 text-yellow-300" />
                    <span>{kidStars}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">Level 3 Explorer</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">Reward Catalog</h3>
              {[
                { title: 'Extra 30 Mins iPad Time', stars: 25, icon: '📱' },
                { title: 'Choose Friday Movie', stars: 40, icon: '🎬' },
                { title: 'Special Ice Cream Trip', stars: 50, icon: '🍦' },
                { title: 'Pizza Night Choice', stars: 65, icon: '🍕' },
              ].map((reward, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border-2 border-purple-100 flex items-center justify-between shadow-xs">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{reward.icon}</span>
                    <div>
                      <div className="text-sm font-bold text-stone-900">{reward.title}</div>
                      <div className="text-xs text-purple-600 font-semibold">{reward.stars} Stars required</div>
                    </div>
                  </div>
                  <button
                    disabled={kidStars < reward.stars}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                      kidStars >= reward.stars
                        ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
                        : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                    }`}
                  >
                    {kidStars >= reward.stars ? 'Redeem!' : 'Keep Going'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: NEXT (Upcoming Events & Schedule for Me)                           */}
        {/* ========================================================================= */}
        {activeTab === 'NEXT' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">What&apos;s Coming Up</h3>
              <span className="text-xs text-stone-500">Synced with Family Calendar</span>
            </div>

            {events.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl text-center border border-amber-100">
                <Calendar className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-stone-800">No scheduled events right now</p>
                <p className="text-xs text-stone-500 mt-1">Enjoy your free playtime!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.slice(0, 5).map(event => (
                  <div key={event.Event_ID} className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs flex items-center space-x-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
                      style={{ backgroundColor: event.Color || '#F59E0B' }}
                    >
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-stone-900 truncate">{event.Title}</div>
                      <div className="text-xs text-stone-500">
                        {new Date(event.Start_Time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {event.Location ? ` • ${event.Location}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: ME (My Profile, Night Mode, Switcher)                              */}
        {/* ========================================================================= */}
        {activeTab === 'ME' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border-2 border-amber-200 shadow-sm flex flex-col items-center text-center">
              <FamilyAvatar
                member={currentMember}
                size="xl"
                shape="squircle"
                className="w-24 h-24 text-3xl mb-3 shadow-md ring-4 ring-amber-100"
              />
              <h2 className="text-xl font-black text-stone-900 mt-2">{currentMember?.Display_Name || currentMember?.First_Name}</h2>
              <p className="text-xs text-stone-500 mt-0.5">Role: {currentMember?.Role}</p>
            </div>

            {/* Night mode toggle */}
            <div className="bg-white rounded-2xl p-4 border border-amber-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Moon className="w-5 h-5 text-indigo-600" />
                <div>
                  <div className="text-sm font-bold text-stone-900">Bedtime Night Mode</div>
                  <div className="text-xs text-stone-500">Dim colors for cozy evening reading</div>
                </div>
              </div>
              <button
                onClick={() => setNightMode(!nightMode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black ${
                  nightMode ? 'bg-indigo-600 text-white' : 'bg-stone-100 text-stone-700'
                }`}
              >
                {nightMode ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Logout button */}
            <div className="pt-4">
              <button
                onClick={() => logout()}
                className="w-full py-3 rounded-2xl bg-stone-200/80 hover:bg-stone-300 text-stone-700 font-bold text-xs flex items-center justify-center space-x-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Switch to Another Family Member</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* FIXED KIDS BOTTOM NAVIGATION (5 Tabs: Today / Routines / Rewards / Next / Me) */}
      {/* Strict Touch Target: Kids >= 48px                                         */}
      {/* ========================================================================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5E4E1] px-3 py-1.5 flex items-center justify-around shadow-xs">
        {kidTabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center min-h-[48px] min-w-[56px] py-1 px-3 rounded-2xl transition-all ${
                isActive
                  ? 'text-[#245F83] font-bold'
                  : 'text-[#8A8F98] hover:text-[#1C1E21]'
              }`}
            >
              <div className={`p-1.5 rounded-xl ${isActive ? 'bg-[#245F83]/10' : ''}`}>
                {tab.icon}
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
