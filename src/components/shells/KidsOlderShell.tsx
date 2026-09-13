import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { TaskItem, CalendarEvent } from '../../types';
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
  Settings,
  User,
  ShoppingBag,
  Award,
  Flame,
  Volume2,
  Check,
  Smile,
  LogOut,
  Palette,
  Home
} from 'lucide-react';

type KidTab = 'TODAY' | 'ROUTINES' | 'REWARDS' | 'NEXT' | 'ME';

export const KidsOlderShell: React.FC = () => {
  const { session, members, logout } = useAuth();
  const currentMember = session?.member;
  const [activeTab, setActiveTab] = useState<KidTab>('TODAY');

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [celebration, setCelebration] = useState(false);
  const [requestText, setRequestText] = useState('');
  const [nightMode, setNightMode] = useState(false);

  // Local state for default daily routine checkboxes
  const [routineChecks, setRoutineChecks] = useState<{ [key: string]: boolean }>({
    'make-bed': true,
    'brush-teeth': true,
    'breakfast': true,
    'dance-bag': false,
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

  const toggleRoutineItem = (key: string) => {
    setRoutineChecks(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleCompleteChore = async (taskId: string) => {
    try {
      await api.updateTaskStatus(taskId, 'COMPLETED');
      setCelebration(true);
      setTimeout(() => setCelebration(false), 3000);
      loadKidData();
    } catch (err) {
      console.error('Failed to mark chore complete:', err);
    }
  };

  const handleFinishToday = () => {
    setCelebration(true);
    setTimeout(() => setCelebration(false), 4000);
  };

  const childName = currentMember?.First_Name || 'Amber';
  const points = currentMember?.Points || 12;

  const routineDoneCount = Object.values(routineChecks).filter(Boolean).length;
  const totalRoutineCount = Object.keys(routineChecks).length;

  return (
    <div className={`rounded-3xl overflow-hidden shadow-2xl border-4 border-stone-800 flex flex-col min-h-[680px] ${
      nightMode ? 'bg-slate-950 text-white' : 'bg-[#FAF8F5] text-stone-900'
    }`}>
      {/* Top Status Bar & Weather */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-stone-200/60">
        <div className="flex items-center space-x-1.5 text-xs text-stone-500 font-semibold">
          <span>Enguerra Kids</span>
          <span>•</span>
          <span className="text-blue-600 font-bold">Tue, Sep 9, 2026</span>
        </div>
        <div className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
          <Sun className="w-3.5 h-3.5 text-amber-600" />
          <span>72° Mostly Sunny</span>
        </div>
      </div>

      {/* Main Content Area based on Active Tab */}
      <div className="flex-1 p-5 overflow-y-auto">
        {/* ========================================================= */}
        {/* TAB 1: TODAY (Matching Screen 1 in reference mockup)     */}
        {/* ========================================================= */}
        {activeTab === 'TODAY' && (
          <div className="space-y-4">
            {/* Header Greeting & Speech Bubble */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black tracking-tight text-stone-900">
                  Good morning, {childName}!
                </h2>
                <p className="text-xs text-stone-500 font-medium">Ready for another fun day?</p>
              </div>

              {/* Kid Avatar + "You can do it!" Bubble */}
              <div className="relative flex items-center">
                <div className="hidden sm:block absolute right-14 bg-white border border-stone-200 px-2.5 py-1 rounded-2xl shadow-xs text-[11px] font-bold text-stone-700 whitespace-nowrap">
                  You can do it! ✨
                </div>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md border-2 border-white ring-2 ring-orange-400"
                  style={{ backgroundColor: currentMember?.Color || '#9333EA' }}
                >
                  {childName.charAt(0)}
                </div>
              </div>
            </div>

            {/* Celebration Alert */}
            {celebration && (
              <div className="p-3 bg-gradient-to-r from-amber-400 to-orange-400 text-stone-900 rounded-2xl shadow-lg text-center font-bold text-sm animate-bounce">
                🎉 Awesome job, {childName}! Stars added to your bank! ⭐
              </div>
            )}

            {/* Today's Plan Card */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Today's Plan</span>
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700">
                  {routineDoneCount} of {totalRoutineCount} done
                </span>
              </div>

              {/* Routine checklist items matching the reference design */}
              <div className="space-y-2">
                <button
                  onClick={() => toggleRoutineItem('make-bed')}
                  className="w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all bg-stone-50/60 border-stone-200 hover:border-orange-400"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      routineChecks['make-bed'] ? 'bg-emerald-600 text-white' : 'border-2 border-stone-300'
                    }`}>
                      {routineChecks['make-bed'] && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <span className={`text-xs font-bold ${routineChecks['make-bed'] ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                      Make bed
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-600 font-bold">+1 ⭐</span>
                </button>

                <button
                  onClick={() => toggleRoutineItem('brush-teeth')}
                  className="w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all bg-stone-50/60 border-stone-200 hover:border-orange-400"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      routineChecks['brush-teeth'] ? 'bg-emerald-600 text-white' : 'border-2 border-stone-300'
                    }`}>
                      {routineChecks['brush-teeth'] && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <span className={`text-xs font-bold ${routineChecks['brush-teeth'] ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                      Brush teeth
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-600 font-bold">+1 ⭐</span>
                </button>

                <button
                  onClick={() => toggleRoutineItem('breakfast')}
                  className="w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all bg-stone-50/60 border-stone-200 hover:border-orange-400"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      routineChecks['breakfast'] ? 'bg-emerald-600 text-white' : 'border-2 border-stone-300'
                    }`}>
                      {routineChecks['breakfast'] && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <span className={`text-xs font-bold ${routineChecks['breakfast'] ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                      Eat breakfast
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-600 font-bold">+1 ⭐</span>
                </button>

                <button
                  onClick={() => toggleRoutineItem('dance-bag')}
                  className="w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all bg-white border-stone-200 hover:border-orange-400"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      routineChecks['dance-bag'] ? 'bg-emerald-600 text-white' : 'border-2 border-stone-300'
                    }`}>
                      {routineChecks['dance-bag'] && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <span className={`text-xs font-bold ${routineChecks['dance-bag'] ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                      Pack dance bag
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-600 font-bold">+2 ⭐</span>
                </button>

                <button
                  onClick={() => toggleRoutineItem('homework')}
                  className="w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all bg-white border-stone-200 hover:border-orange-400"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      routineChecks['homework'] ? 'bg-emerald-600 text-white' : 'border-2 border-stone-300'
                    }`}>
                      {routineChecks['homework'] && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <span className={`text-xs font-bold ${routineChecks['homework'] ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                      Homework
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-600 font-bold">+3 ⭐</span>
                </button>

                {/* Chores from API backend */}
                {tasks.map(t => {
                  const isDone = t.Status === 'COMPLETED' || t.Status === 'APPROVED';
                  return (
                    <button
                      key={t.Task_ID}
                      onClick={() => !isDone && handleCompleteChore(t.Task_ID)}
                      className="w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all bg-white border-stone-200 hover:border-orange-400"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          isDone ? 'bg-emerald-600 text-white' : 'border-2 border-stone-300'
                        }`}>
                          {isDone && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <span className={`text-xs font-bold ${isDone ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                          {t.Title}
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-600 font-bold">+{t.Points} ⭐</span>
                    </button>
                  );
                })}
              </div>

              {/* Big Action Button */}
              <button
                onClick={handleFinishToday}
                className="w-full mt-4 py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-98 text-white font-black text-sm shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <span>I'm Finished for Now!</span>
                <span className="text-base">🎉</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: ROUTINES (Matching Screen 2 in reference mockup)  */}
        {/* ========================================================= */}
        {activeTab === 'ROUTINES' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-stone-900 tracking-tight">My Routines</h2>
              <button className="p-2 rounded-xl bg-white border border-stone-200 text-stone-500 hover:text-stone-900">
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {/* Routine Card 1: Morning */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs flex items-center justify-between hover:border-amber-400 transition-colors cursor-pointer">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
                  <Sun className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Morning</h3>
                  <p className="text-xs text-stone-500">4 of 5 done</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-stone-400" />
            </div>

            {/* Routine Card 2: After School */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs flex items-center justify-between hover:border-blue-400 transition-colors cursor-pointer">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700">
                  <Backpack className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">After School</h3>
                  <p className="text-xs text-stone-500">1 of 4 done</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-stone-400" />
            </div>

            {/* Routine Card 3: Bedtime */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs flex items-center justify-between hover:border-indigo-400 transition-colors cursor-pointer">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <Moon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Bedtime</h3>
                  <p className="text-xs text-stone-500">0 of 4 done</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-stone-400" />
            </div>

            {/* Illustration Banner */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-3xl p-5 border border-orange-200/60 text-center space-y-1">
              <div className="text-3xl mb-1">🐶 ⭐</div>
              <div className="text-xs font-bold text-orange-950">
                Small steps make big things happen!
              </div>
              <div className="text-[11px] text-orange-800">Keep up your daily streaks!</div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: REWARDS (Matching Screen 3 in reference mockup)   */}
        {/* ========================================================= */}
        {activeTab === 'REWARDS' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-stone-900 tracking-tight">My Stars</h2>

            {/* Big Golden Star Display */}
            <div className="bg-gradient-to-b from-amber-400 to-orange-400 rounded-3xl p-6 text-center text-white shadow-lg space-y-2">
              <div className="relative inline-block">
                <Star className="w-24 h-24 text-white fill-white mx-auto drop-shadow-md" />
                <span className="absolute inset-0 flex items-center justify-center text-3xl font-black text-amber-600">
                  {points}
                </span>
              </div>
              <h3 className="text-lg font-black">Great job, {childName}!</h3>
              <p className="text-xs text-amber-100 font-medium">
                You're only 8 stars away from the Ice Cream trip! 🍦
              </p>
            </div>

            {/* Recent Achievements */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-400 pb-1 border-b border-stone-100">
                Recent Achievements
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-2xl bg-stone-50 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">☀️</span>
                    <span className="font-bold text-stone-800">Completed Morning Routine</span>
                  </div>
                  <span className="font-black text-amber-600">+1 star</span>
                </div>

                <div className="p-3 rounded-2xl bg-stone-50 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">📚</span>
                    <span className="font-bold text-stone-800">Did Homework</span>
                  </div>
                  <span className="font-black text-amber-600">+1 star</span>
                </div>

                <div className="p-3 rounded-2xl bg-stone-50 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">🧹</span>
                    <span className="font-bold text-stone-800">Helped at Home</span>
                  </div>
                  <span className="font-black text-amber-600">+1 star</span>
                </div>

                <div className="p-3 rounded-2xl bg-stone-50 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">🦷</span>
                    <span className="font-bold text-stone-800">Brushed Teeth 7 Days!</span>
                  </div>
                  <span className="font-black text-amber-600">+3 stars</span>
                </div>
              </div>
            </div>

            {/* Bottom Encouraging Card */}
            <div className="bg-rose-50 rounded-2xl p-3.5 border border-rose-200 text-center text-xs font-bold text-rose-800 flex items-center justify-center space-x-1.5">
              <span>You're amazing!</span>
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: NEXT (Matching Screen 4 in reference mockup)      */}
        {/* ========================================================= */}
        {activeTab === 'NEXT' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-stone-900 tracking-tight">What's Next?</h2>
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>

            {/* Schedule Cards from reference image */}
            <div className="space-y-2.5">
              <div className="bg-white rounded-3xl p-4 border border-stone-200 shadow-xs flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-pink-100 flex items-center justify-center text-pink-700 font-bold">
                    🩰
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-stone-900">Dance Class</h3>
                    <p className="text-[11px] text-stone-500">Today • 3:00 PM</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-pink-700">
                  Today
                </span>
              </div>

              <div className="bg-white rounded-3xl p-4 border border-stone-200 shadow-xs flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
                    🍽️
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-stone-900">Family Dinner</h3>
                    <p className="text-[11px] text-stone-500">Today • 7:00 PM</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                  Today
                </span>
              </div>

              <div className="bg-white rounded-3xl p-4 border border-stone-200 shadow-xs flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                    🎹
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-stone-900">Piano Lesson</h3>
                    <p className="text-[11px] text-stone-500">Wed, Sep 10 • 4:30 PM</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  Tomorrow
                </span>
              </div>

              <div className="bg-white rounded-3xl p-4 border border-stone-200 shadow-xs flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 font-bold">
                    🎈
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-stone-900">Playdate with Alexa</h3>
                    <p className="text-[11px] text-stone-500">Sat, Sep 13 • 1:00 PM</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                  Weekend
                </span>
              </div>
            </div>

            {/* Bottom Excited Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-200/60 text-center">
              <div className="text-xs font-black text-blue-900">Excited for today! 🎉</div>
              <div className="text-[11px] text-blue-700 mt-0.5">Don't forget to pack your dance shoes.</div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: ME (Matching Screen 5 in reference mockup)        */}
        {/* ========================================================= */}
        {activeTab === 'ME' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-stone-900 tracking-tight">My Profile</h2>

            {/* Profile Avatar Card */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 text-center shadow-xs space-y-2">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-black mx-auto shadow-md border-4 border-white ring-4 ring-orange-200"
                style={{ backgroundColor: currentMember?.Color || '#9333EA' }}
              >
                {childName.charAt(0)}
              </div>
              <h3 className="text-base font-bold text-stone-900">{childName}, 8 years old</h3>
              <p className="text-xs text-stone-500">Enguerra Family Star Explorer</p>
              <button className="px-4 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors">
                Change Avatar
              </button>
            </div>

            {/* Settings Options List */}
            <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs divide-y divide-stone-100 text-xs font-bold text-stone-800">
              <div className="p-4 flex items-center justify-between hover:bg-stone-50 cursor-pointer">
                <div className="flex items-center space-x-2.5">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span>My Favorites</span>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </div>

              <div className="p-4 flex items-center justify-between hover:bg-stone-50 cursor-pointer">
                <div className="flex items-center space-x-2.5">
                  <Settings className="w-4 h-4 text-blue-500" />
                  <span>My Routine Settings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </div>

              <div className="p-4 flex items-center justify-between hover:bg-stone-50 cursor-pointer">
                <div className="flex items-center space-x-2.5">
                  <Palette className="w-4 h-4 text-purple-500" />
                  <span>Theme & Colors</span>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </div>

              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <span>Night Mode</span>
                </div>
                <button
                  onClick={() => setNightMode(!nightMode)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    nightMode ? 'bg-indigo-600' : 'bg-stone-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    nightMode ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={() => logout()}
              className="w-full py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center space-x-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Switch or Sign Out</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 5-TAB BOTTOM NAVIGATION BAR (Exact as Reference UI)       */}
      {/* ========================================================= */}
      <div className="bg-white border-t border-stone-200 px-3 py-2 flex items-center justify-around">
        <button
          onClick={() => setActiveTab('TODAY')}
          className={`flex flex-col items-center p-1.5 rounded-xl transition-all ${
            activeTab === 'TODAY' ? 'text-orange-600 font-black' : 'text-stone-400 hover:text-stone-700'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-bold">Today</span>
        </button>

        <button
          onClick={() => setActiveTab('ROUTINES')}
          className={`flex flex-col items-center p-1.5 rounded-xl transition-all ${
            activeTab === 'ROUTINES' ? 'text-orange-600 font-black' : 'text-stone-400 hover:text-stone-700'
          }`}
        >
          <Sun className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-bold">Routines</span>
        </button>

        <button
          onClick={() => setActiveTab('REWARDS')}
          className={`flex flex-col items-center p-1.5 rounded-xl transition-all ${
            activeTab === 'REWARDS' ? 'text-orange-600 font-black' : 'text-stone-400 hover:text-stone-700'
          }`}
        >
          <Star className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-bold">Rewards</span>
        </button>

        <button
          onClick={() => setActiveTab('NEXT')}
          className={`flex flex-col items-center p-1.5 rounded-xl transition-all ${
            activeTab === 'NEXT' ? 'text-orange-600 font-black' : 'text-stone-400 hover:text-stone-700'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-bold">Next</span>
        </button>

        <button
          onClick={() => setActiveTab('ME')}
          className={`flex flex-col items-center p-1.5 rounded-xl transition-all ${
            activeTab === 'ME' ? 'text-orange-600 font-black' : 'text-stone-400 hover:text-stone-700'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-bold">Me</span>
        </button>
      </div>
    </div>
  );
};
