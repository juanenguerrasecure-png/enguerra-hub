import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { CalendarEvent, TaskItem, FamilyListItem } from '../../types';
import {
  Tv,
  Clock,
  Sun,
  Calendar,
  CheckSquare,
  ShoppingCart,
  Lock,
  Unlock,
  Timer,
  Plus,
  Play,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Image as ImageIcon,
  MessageSquare,
  Utensils,
  Home,
  Check,
  Circle,
  X,
  Heart,
  ChefHat,
  ChevronLeft
} from 'lucide-react';

type HubTab = 'HOME' | 'CALENDAR' | 'TASKS' | 'GROCERIES' | 'MEALS' | 'MESSAGES' | 'PHOTOS' | 'MORE';

export const FamilyHubShell: React.FC = () => {
  const { session, members, hubLocked, unlockHub, lockHub, openPinModal, toggleHubMode } = useAuth();
  const [activeTab, setActiveTab] = useState<HubTab>('HOME');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [ambientMode, setAmbientMode] = useState<boolean>(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Data states
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [groceryItems, setGroceryItems] = useState<FamilyListItem[]>([]);
  const [selectedTaskMember, setSelectedTaskMember] = useState<string>('ALL');
  const [groceryCategory, setGroceryCategory] = useState<string>('ALL');
  const [ambientPhotos, setAmbientPhotos] = useState<any[]>([]);

  // Kitchen Timer State
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // Quick Action Modals
  const [quickActionModal, setQuickActionModal] = useState<'EVENT' | 'TASK' | 'LIST' | 'MESSAGE' | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDetail, setQuickDetail] = useState('');

  // Sticky notes for fridge
  const [fridgeNotes, setFridgeNotes] = useState([
    { id: '1', author: 'Mom (Mabu)', text: 'Dance recital rehearsal at 3:00 PM today! Bring water bottle 💕', color: '#FEF3C7' },
    { id: '2', author: 'Dad (Papa)', text: 'Pick up milk & eggs on way home from work.', color: '#E0F2FE' },
    { id: '3', author: 'Amber', text: 'Practiced piano 30 mins! Can we get pizza Friday? 🍕', color: '#FCE7F3' }
  ]);

  // Live Clock Tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Hub Data
  const loadHubData = async () => {
    try {
      const [hubRes, evts, tsks, lists] = await Promise.all([
        api.getHubData(),
        api.getEvents(),
        api.getTasks(),
        api.getLists()
      ]);

      if (hubRes?.ambientPhotos) {
        setAmbientPhotos(hubRes.ambientPhotos);
      }
      setEvents(evts);
      setTasks(tsks);

      const groceryList = lists.find(l => l.Category === 'GROCERY') || lists[0];
      if (groceryList) {
        const items = await api.getListItems(groceryList.List_ID);
        setGroceryItems(items);
      }
    } catch (err) {
      console.error('Failed to load hub data:', err);
    }
  };

  useEffect(() => {
    loadHubData();
  }, []);

  // Kitchen Timer Tick
  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(s => s - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerActive) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  // Ambient Screensaver Rotation
  useEffect(() => {
    if (ambientMode && ambientPhotos.length > 0) {
      const timer = setInterval(() => {
        setPhotoIndex(prev => (prev + 1) % ambientPhotos.length);
      }, 10000);
      return () => clearInterval(timer);
    }
  }, [ambientMode, ambientPhotos]);

  const startKitchenTimer = (minutes: number) => {
    setTimerSeconds(minutes * 60);
    setTimerActive(true);
    setIsTimerModalOpen(false);
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await api.updateTaskStatus(taskId, newStatus);
      loadHubData();
    } catch (err) {
      console.error('Task update error:', err);
    }
  };

  const handleApproveTask = async (taskId: string) => {
    try {
      await api.updateTaskStatus(taskId, 'APPROVED', 'Approved from Kitchen Family Hub');
      loadHubData();
    } catch (err) {
      console.error('Task approval error:', err);
    }
  };

  const handleToggleGroceryItem = async (itemId: string, currentStatus: string) => {
    const isCompleted = currentStatus === 'BOUGHT' || currentStatus === 'COMPLETED';
    try {
      await api.toggleListItem(itemId, !isCompleted);
      loadHubData();
    } catch (err) {
      console.error('Grocery update error:', err);
    }
  };

  const handleCreateQuickAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    try {
      if (quickActionModal === 'EVENT') {
        const start = new Date();
        start.setHours(18, 0, 0, 0);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        await api.createEvent({
          Title: quickTitle,
          Description: quickDetail || 'Created on Family Hub Fridge',
          Start_Time: start.toISOString(),
          End_Time: end.toISOString(),
          Visibility: 'FAMILY',
          Category: 'FAMILY',
          Color: '#2563EB',
          Assigned_Members: members.map(m => m.Member_ID)
        });
      } else if (quickActionModal === 'TASK') {
        await api.createTask({
          Title: quickTitle,
          Description: quickDetail,
          Assigned_To: members[0]?.Member_ID || '',
          Points: 5,
          Priority: 'MEDIUM',
          Visibility: 'FAMILY',
          Category: 'CHORE'
        });
      } else if (quickActionModal === 'LIST') {
        const lists = await api.getLists();
        const gList = lists.find(l => l.Category === 'GROCERY') || lists[0];
        if (gList) {
          await api.addListItem(gList.List_ID, quickTitle, quickDetail || '1');
        }
      } else if (quickActionModal === 'MESSAGE') {
        setFridgeNotes(prev => [
          {
            id: Date.now().toString(),
            author: session?.member.Display_Name || 'Family Member',
            text: quickTitle,
            color: '#FEF3C7'
          },
          ...prev
        ]);
      }

      setQuickTitle('');
      setQuickDetail('');
      setQuickActionModal(null);
      loadHubData();
    } catch (err) {
      console.error('Quick action failed:', err);
    }
  };

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });

  const currentAmbientPhoto = ambientPhotos[photoIndex];

  // Dynamic Greeting based on time of day
  const hour = currentTime.getHours();
  const greetingTime = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Chores awaiting review
  const pendingApprovalTasks = tasks.filter(t => t.Status === 'COMPLETED');
  const openTasks = tasks.filter(t => t.Status === 'PENDING');

  // Filtered tasks for tasks tab
  const filteredTasks = tasks.filter(t => {
    if (selectedTaskMember === 'ALL') return true;
    return t.Assigned_To === selectedTaskMember;
  });

  // Filtered groceries for groceries tab
  const filteredGroceries = groceryItems.filter(item => {
    if (groceryCategory === 'ALL') return true;
    return item.Category?.toUpperCase() === groceryCategory;
  });

  // Ambient Screensaver Overlay
  if (ambientMode) {
    return (
      <div
        onClick={() => setAmbientMode(false)}
        className="relative min-h-[700px] h-[85vh] rounded-3xl overflow-hidden shadow-2xl bg-stone-950 flex flex-col justify-between p-8 sm:p-12 cursor-pointer select-none text-white"
      >
        {currentAmbientPhoto ? (
          <img
            src={api.getMediaStreamUrl(currentAmbientPhoto.Media_ID)}
            alt="Ambient Memory"
            className="absolute inset-0 w-full h-full object-cover opacity-50 blur-xs transition-all duration-1000 scale-105"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-blue-950 to-stone-900 opacity-90" />
        )}

        {/* Top Info */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center font-bold">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight">Enguerra of NY</div>
              <div className="text-xs text-blue-200">Family Hub Kiosk</div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-amber-400 font-semibold">
              <Sun className="w-6 h-6" />
              <span className="text-lg">72° Mostly Sunny</span>
            </div>
            <div className="text-right text-stone-200 text-sm">
              <div>{formattedDate}</div>
            </div>
          </div>
        </div>

        {/* Center Clock */}
        <div className="relative z-10 text-center my-auto">
          <div className="text-8xl sm:text-9xl font-black text-white tracking-tight drop-shadow-2xl font-mono">
            {formattedTime}
          </div>
          <p className="text-stone-300 text-sm sm:text-base mt-4 animate-pulse">
            Touch anywhere to wake Family Command Center
          </p>
        </div>

        {/* Bottom Banner */}
        <div className="relative z-10 text-center bg-black/40 backdrop-blur-md py-3 px-6 rounded-full max-w-lg mx-auto text-xs text-stone-300">
          More time together ♡ • Private Cloud Persistence
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-6 shadow-2xl border-4 border-slate-800 relative overflow-hidden">
      {/* Kiosk Bezel Header: Title, Nav Pills, Greeting, Clock & Weather */}
      <div className="border-b border-slate-800 pb-5 mb-5 space-y-4">
        {/* Top Bar: Brand + Navigation Pills + Clock/Weather */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Logo + Navigation Tabs */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap">
            <div className="flex items-center space-x-2 mr-2">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md">
                <Home className="w-5 h-5" />
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-black tracking-tight leading-none text-white">Enguerra of NY</div>
                <div className="text-[10px] text-blue-300 font-medium">Family Hub</div>
              </div>
            </div>

            {/* Navigation Pills (Matching Reference Mockup) */}
            <div className="flex items-center space-x-1 bg-slate-800/90 p-1 rounded-2xl border border-slate-700/80 overflow-x-auto text-xs font-semibold">
              <button
                onClick={() => setActiveTab('HOME')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === 'HOME'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>

              <button
                onClick={() => setActiveTab('CALENDAR')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === 'CALENDAR'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Calendar</span>
              </button>

              <button
                onClick={() => setActiveTab('TASKS')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === 'TASKS'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Tasks</span>
                {pendingApprovalTasks.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('GROCERIES')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === 'GROCERIES'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Groceries</span>
              </button>

              <button
                onClick={() => setActiveTab('MEALS')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === 'MEALS'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Meals</span>
              </button>

              <button
                onClick={() => setActiveTab('MESSAGES')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === 'MESSAGES'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Messages</span>
              </button>

              <button
                onClick={() => setActiveTab('PHOTOS')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === 'PHOTOS'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Photos</span>
              </button>
            </div>
          </div>

          {/* Right: Date, Live Clock & Weather */}
          <div className="flex items-center space-x-4 shrink-0">
            <div className="text-right">
              <div className="text-xs text-slate-400 font-medium">{formattedDate}</div>
              <div className="text-2xl font-black text-white tracking-tight font-mono">{formattedTime}</div>
            </div>

            <div className="flex items-center space-x-2 pl-3 border-l border-slate-700/80">
              <Sun className="w-7 h-7 text-amber-400 animate-spin-slow" />
              <div>
                <div className="text-sm font-black text-white">72°</div>
                <div className="text-[10px] text-amber-300 leading-tight">Mostly Sunny</div>
              </div>
            </div>

            {/* Quick Ambient Screensaver Switcher */}
            <button
              onClick={() => setAmbientMode(true)}
              title="Start Ambient Screensaver"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </div>

        {/* Center Banner: Greeting + Family Avatars */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {greetingTime}, Enguerra Family!
            </h2>
            <p className="text-xs text-slate-400">
              Today is looking bright. 3 events scheduled • {openTasks.length} tasks open.
            </p>
          </div>

          {/* Family Avatars Row (Papa, Mabu, Amber, Alexa, Adine) */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 bg-slate-800/80 px-3.5 py-2 rounded-2xl border border-slate-700/60">
            {members.map(m => {
              const initial = m.First_Name.charAt(0);
              const isSelected = selectedTaskMember === m.Member_ID;
              return (
                <button
                  key={m.Member_ID}
                  onClick={() => {
                    setSelectedTaskMember(prev => prev === m.Member_ID ? 'ALL' : m.Member_ID);
                    if (activeTab !== 'TASKS' && activeTab !== 'HOME') {
                      setActiveTab('TASKS');
                    }
                  }}
                  className="flex flex-col items-center group transition-transform hover:scale-105"
                  title={`${m.Display_Name} (${m.Role})`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md border-2 transition-all ${
                      isSelected ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: m.Color }}
                  >
                    {initial}
                  </div>
                  <span className="text-[10px] font-medium text-slate-300 mt-1 group-hover:text-white">
                    {m.First_Name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Kitchen Cooking Timer Banner if Running */}
      {timerActive && (
        <div className="mb-4 bg-amber-500 text-slate-950 px-4 py-2.5 rounded-2xl flex items-center justify-between font-bold animate-pulse shadow-lg">
          <div className="flex items-center space-x-2">
            <Timer className="w-5 h-5 animate-spin" />
            <span>Kitchen Cooking Timer Running:</span>
            <span className="text-lg font-mono font-black">
              {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <button
            onClick={() => setTimerActive(false)}
            className="px-3 py-1 rounded-xl bg-slate-950 text-white text-xs font-bold hover:bg-slate-800"
          >
            Reset Timer
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: HOME (Matching Family Hub / Kiosk Layout in Image)  */}
      {/* ========================================================= */}
      {activeTab === 'HOME' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Col 1: Today's Schedule (Lg: 4 cols) */}
          <div className="lg:col-span-4 bg-slate-800/80 rounded-3xl p-5 border border-slate-700/80 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/70 mb-3">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span>Today's Schedule</span>
                </h3>
                <button
                  onClick={() => setActiveTab('CALENDAR')}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                >
                  See all
                </button>
              </div>

              {/* Event Items with colored dots */}
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-700/60 flex items-start space-x-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 shrink-0"></div>
                  <div>
                    <div className="text-xs font-bold text-white">6:30 AM • ED Peconic</div>
                    <div className="text-[11px] text-slate-400">Work • Papa (Dad)</div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-700/60 flex items-start space-x-3">
                  <div className="w-3 h-3 rounded-full bg-pink-500 mt-1 shrink-0"></div>
                  <div>
                    <div className="text-xs font-bold text-white">3:00 PM • Amber - Dance Class</div>
                    <div className="text-[11px] text-slate-400">Community Center • Dance bag required</div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-700/60 flex items-start space-x-3">
                  <div className="w-3 h-3 rounded-full bg-amber-500 mt-1 shrink-0"></div>
                  <div>
                    <div className="text-xs font-bold text-white">7:00 PM • Family Dinner</div>
                    <div className="text-[11px] text-slate-400">Home • All family present</div>
                  </div>
                </div>

                {events.slice(0, 2).map(evt => (
                  <div
                    key={evt.Event_ID}
                    className="p-3 rounded-2xl bg-slate-900/60 border border-slate-700/60 flex items-start space-x-3"
                  >
                    <div
                      className="w-3 h-3 rounded-full mt-1 shrink-0"
                      style={{ backgroundColor: evt.Color || '#3B82F6' }}
                    ></div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {new Date(evt.Start_Time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {evt.Title}
                      </div>
                      <div className="text-[11px] text-slate-400">{evt.Location || 'Home'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setQuickActionModal('EVENT')}
              className="mt-4 w-full py-2.5 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Plus className="w-4 h-4 text-blue-400" />
              <span>Add Event to Hub</span>
            </button>
          </div>

          {/* Col 2: Needs Attention + Groceries Card (Lg: 4 cols) */}
          <div className="lg:col-span-4 space-y-5 flex flex-col justify-between">
            {/* Needs Attention Card */}
            <div className="bg-slate-800/80 rounded-3xl p-5 border border-slate-700/80 shadow-sm flex-1">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/70 mb-3">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                  <span>Needs Attention</span>
                </h3>
                <button
                  onClick={() => setActiveTab('TASKS')}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                >
                  See all
                </button>
              </div>

              <div className="space-y-2.5">
                {/* Attention 1 */}
                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-4 h-4 rounded border border-slate-500 flex items-center justify-center"></div>
                    <div>
                      <div className="text-xs font-bold text-white">Approve Alexa's homework</div>
                      <div className="text-[10px] text-amber-400 font-semibold">Pending approval</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('TASKS')}
                    className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[11px] font-bold"
                  >
                    Review
                  </button>
                </div>

                {/* Attention 2 */}
                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-4 h-4 rounded border border-slate-500 flex items-center justify-center"></div>
                    <div>
                      <div className="text-xs font-bold text-white">Pick up groceries</div>
                      <div className="text-[10px] text-blue-400 font-semibold">Shopping list</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('GROCERIES')}
                    className="px-2.5 py-1 rounded-xl bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 text-[11px] font-bold"
                  >
                    View
                  </button>
                </div>

                {/* Attention 3 */}
                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-4 h-4 rounded border border-slate-500 flex items-center justify-center"></div>
                    <div>
                      <div className="text-xs font-bold text-white">Plan weekend trip</div>
                      <div className="text-[10px] text-rose-400 font-semibold">2 days left</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">Sat-Sun</span>
                </div>
              </div>
            </div>

            {/* Groceries Mini Card */}
            <div className="bg-slate-800/80 rounded-3xl p-5 border border-slate-700/80 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-400" />
                  <span>Groceries</span>
                </h3>
                <span className="text-xs text-slate-400">8 things to buy</span>
              </div>
              <p className="text-xs text-amber-300 font-medium mb-3">
                3 low-stock items detected in pantry
              </p>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-700/60 text-center">
                  <span className="text-base">🥛</span>
                  <div className="text-[11px] font-bold text-white mt-0.5">Milk</div>
                  <div className="text-[10px] text-rose-400 font-semibold">Low</div>
                </div>

                <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-700/60 text-center">
                  <span className="text-base">🥚</span>
                  <div className="text-[11px] font-bold text-white mt-0.5">Eggs</div>
                  <div className="text-[10px] text-rose-400 font-semibold">Low</div>
                </div>

                <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-700/60 text-center">
                  <span className="text-base">🍌</span>
                  <div className="text-[11px] font-bold text-white mt-0.5">Bananas</div>
                  <div className="text-[10px] text-emerald-400 font-semibold">Ready</div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('GROCERIES')}
                className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
              >
                Open Grocery List
              </button>
            </div>
          </div>

          {/* Col 3: Right Photo Frame & Family Montage (Lg: 4 cols) */}
          <div className="lg:col-span-4 bg-slate-800/80 rounded-3xl p-5 border border-slate-700/80 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/70 mb-3">
                <div className="font-serif italic text-base text-amber-200">
                  More time together ♡
                </div>
                <button
                  onClick={() => setAmbientMode(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Slideshow</span>
                </button>
              </div>

              {/* Photo Collage Grid */}
              <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden mb-3">
                <div className="col-span-2 h-40 bg-gradient-to-tr from-amber-900 to-indigo-900 rounded-xl relative overflow-hidden flex items-center justify-center">
                  {ambientPhotos[0] ? (
                    <img
                      src={api.getMediaStreamUrl(ambientPhotos[0].Media_ID)}
                      alt="Family Montage"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <Heart className="w-8 h-8 text-rose-400 mx-auto mb-1 animate-pulse" />
                      <div className="text-xs font-bold text-white">The Enguerra Family</div>
                      <div className="text-[10px] text-amber-200">New York • 2026</div>
                    </div>
                  )}
                </div>

                <div className="h-20 bg-slate-900 rounded-xl relative overflow-hidden flex items-center justify-center border border-slate-700">
                  {ambientPhotos[1] ? (
                    <img
                      src={api.getMediaStreamUrl(ambientPhotos[1].Media_ID)}
                      alt="Kids smile"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-xl">👧🏻</span>
                  )}
                </div>

                <div className="h-20 bg-slate-900 rounded-xl relative overflow-hidden flex items-center justify-center border border-slate-700">
                  {ambientPhotos[2] ? (
                    <img
                      src={api.getMediaStreamUrl(ambientPhotos[2].Media_ID)}
                      alt="Family trip"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-xl">🐶</span>
                  )}
                </div>
              </div>

              <div className="text-center text-xs text-slate-300 font-medium">
                The Enguerra Family
              </div>
              <div className="text-center text-[11px] text-slate-400 mt-0.5">
                Our Family. One App. A Brighter Everyday.
              </div>
            </div>

            {/* Quick Sticky Notes Preview */}
            <div className="mt-4 pt-3 border-t border-slate-700/70">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider text-[10px]">Kitchen Fridge Notes</span>
                <button
                  onClick={() => setQuickActionModal('MESSAGE')}
                  className="text-blue-400 font-bold hover:underline"
                >
                  + Post Note
                </button>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-200/90 text-slate-900 text-xs shadow-xs font-medium">
                "{fridgeNotes[0]?.text || 'Have a wonderful day!'}"
                <div className="text-[10px] text-amber-900 text-right mt-1 font-bold">
                  — {fridgeNotes[0]?.author || 'Mom'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: CALENDAR FOCUS (Monthly Grid + Today/Tomorrow)      */}
      {/* ========================================================= */}
      {activeTab === 'CALENDAR' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Monthly Mini Grid (7 cols) */}
          <div className="lg:col-span-7 bg-slate-800/80 rounded-3xl p-5 border border-slate-700/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                <span>September 2026</span>
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentTime(new Date())}
                  className="px-3 py-1 rounded-xl bg-slate-700 text-white text-xs font-bold hover:bg-slate-600"
                >
                  Today
                </button>
                <button
                  onClick={() => setQuickActionModal('EVENT')}
                  className="px-3 py-1 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500"
                >
                  + Event
                </button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 mb-2">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {[...Array(30)].map((_, i) => {
                const dayNum = i + 1;
                const isToday = dayNum === 9; // Tue, Sep 9
                const hasEvent = [2, 9, 10, 13, 16, 24].includes(dayNum);
                return (
                  <div
                    key={dayNum}
                    className={`py-3 rounded-xl border transition-all ${
                      isToday
                        ? 'bg-blue-600 text-white font-black border-blue-400 shadow-md'
                        : 'bg-slate-900/60 text-slate-200 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div>{dayNum}</div>
                    {hasEvent && (
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mx-auto mt-1"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today & Tomorrow Agenda (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-800/80 rounded-3xl p-5 border border-slate-700/80">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3">
                Today's Schedule
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-700 flex items-start space-x-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 shrink-0"></div>
                  <div>
                    <div className="text-sm font-bold text-white">6:30 AM • ED Peconic</div>
                    <div className="text-xs text-slate-400">Work • Dad</div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-700 flex items-start space-x-3">
                  <div className="w-3 h-3 rounded-full bg-pink-500 mt-1 shrink-0"></div>
                  <div>
                    <div className="text-sm font-bold text-white">3:00 PM • Amber - Dance Class</div>
                    <div className="text-xs text-slate-400">Community Center</div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-700 flex items-start space-x-3">
                  <div className="w-3 h-3 rounded-full bg-amber-500 mt-1 shrink-0"></div>
                  <div>
                    <div className="text-sm font-bold text-white">7:00 PM • Family Dinner</div>
                    <div className="text-xs text-slate-400">Home</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 rounded-3xl p-5 border border-slate-700/80">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Tomorrow's Schedule
              </div>
              <div className="space-y-2.5">
                <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-700 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                    <span className="font-bold text-white">Alexa - School</span>
                  </div>
                  <span className="text-slate-400">7:00 AM</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-700 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    <span className="font-bold text-white">Laundry Day & Bedding</span>
                  </div>
                  <span className="text-slate-400">8:00 PM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: TASKS FOCUS (Filters, Checklist & Approvals)        */}
      {/* ========================================================= */}
      {activeTab === 'TASKS' && (
        <div className="space-y-5">
          {/* Member Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedTaskMember('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedTaskMember === 'ALL'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              Everyone
            </button>
            {members.map(m => (
              <button
                key={m.Member_ID}
                onClick={() => setSelectedTaskMember(m.Member_ID)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  selectedTaskMember === m.Member_ID
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.Color }}></div>
                <span>{m.First_Name}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Active Tasks (7 cols) */}
            <div className="lg:col-span-7 bg-slate-800/80 rounded-3xl p-5 border border-slate-700/80">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/70 mb-4">
                <h3 className="text-base font-bold text-white">Today's Chores & Responsibilities</h3>
                <button
                  onClick={() => setQuickActionModal('TASK')}
                  className="px-3 py-1 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500"
                >
                  + Add Task
                </button>
              </div>

              <div className="space-y-2.5">
                {filteredTasks.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">All tasks completed!</div>
                ) : (
                  filteredTasks.map(t => {
                    const isCompleted = t.Status === 'COMPLETED' || t.Status === 'APPROVED';
                    const assignedMember = members.find(m => m.Member_ID === t.Assigned_To);
                    return (
                      <div
                        key={t.Task_ID}
                        className="p-3 rounded-2xl bg-slate-900/60 border border-slate-700 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleToggleTask(t.Task_ID, t.Status)}
                            className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                              isCompleted
                                ? 'bg-emerald-600 border-emerald-500 text-white'
                                : 'border-slate-500 hover:border-slate-300'
                            }`}
                          >
                            {isCompleted && <Check className="w-3.5 h-3.5" />}
                          </button>
                          <div>
                            <div className={`text-xs font-bold ${isCompleted ? 'line-through text-slate-500' : 'text-white'}`}>
                              {t.Title}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {assignedMember?.Display_Name || 'Family'} • +{t.Points} pts
                            </div>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.Status === 'APPROVED' ? 'bg-emerald-900/60 text-emerald-300' :
                          t.Status === 'COMPLETED' ? 'bg-amber-900/60 text-amber-300' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {t.Status}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Waiting for Approval Cards (5 cols) */}
            <div className="lg:col-span-5 bg-slate-800/80 rounded-3xl p-5 border border-slate-700/80">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/70 mb-4">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Waiting for Approval</span>
                </h3>
                <span className="text-xs font-bold text-amber-400">
                  {pendingApprovalTasks.length} Pending
                </span>
              </div>

              <div className="space-y-3">
                {/* Mocked/Real Approval Cards matching image */}
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-amber-500/40 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white text-xs">
                      A
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Amber</div>
                      <div className="text-xs text-slate-300 font-medium">Clean room</div>
                    </div>
                  </div>
                  <button
                    onClick={() => alert('Approved! +5 Stars awarded to Amber ⭐')}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                  >
                    Review
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-amber-500/40 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white text-xs">
                      A
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Alexa</div>
                      <div className="text-xs text-slate-300 font-medium">Math worksheet</div>
                    </div>
                  </div>
                  <button
                    onClick={() => alert('Approved! +10 Stars awarded to Alexa ⭐')}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                  >
                    Review
                  </button>
                </div>

                {pendingApprovalTasks.map(task => (
                  <div
                    key={task.Task_ID}
                    className="p-3.5 rounded-2xl bg-slate-900/80 border border-amber-500/40 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{task.Title}</div>
                      <div className="text-[10px] text-amber-300">+{task.Points} pts reward</div>
                    </div>
                    <button
                      onClick={() => handleApproveTask(task.Task_ID)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                    >
                      Approve
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: GROCERIES FOCUS (Categories & Interactive List)    */}
      {/* ========================================================= */}
      {activeTab === 'GROCERIES' && (
        <div className="space-y-4">
          {/* Category Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-1.5 bg-slate-800 p-1 rounded-2xl border border-slate-700 text-xs font-bold overflow-x-auto">
              {['ALL', 'PRODUCE', 'DAIRY', 'PANTRY', 'FROZEN', 'HOUSEHOLD'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setGroceryCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl capitalize transition-all ${
                    groceryCategory === cat
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {cat.toLowerCase()}
                </button>
              ))}
            </div>

            <button
              onClick={() => setQuickActionModal('LIST')}
              className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Item</span>
            </button>
          </div>

          {/* Grocery Table / Card List */}
          <div className="bg-slate-800/80 rounded-3xl p-5 border border-slate-700/80">
            <div className="space-y-2">
              {/* Default template items matching the reference image */}
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 rounded-md border border-slate-500 flex items-center justify-center"></div>
                  <span className="text-xl">🥛</span>
                  <div>
                    <div className="text-xs font-bold text-white">Milk</div>
                    <div className="text-[10px] text-slate-400">2 gallons</div>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-semibold">Dairy</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 rounded-md border border-slate-500 flex items-center justify-center"></div>
                  <span className="text-xl">🥚</span>
                  <div>
                    <div className="text-xs font-bold text-white">Eggs</div>
                    <div className="text-[10px] text-slate-400">1 dozen</div>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-semibold">Dairy</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 rounded-md border border-slate-500 flex items-center justify-center"></div>
                  <span className="text-xl">🍞</span>
                  <div>
                    <div className="text-xs font-bold text-white">Bread</div>
                    <div className="text-[10px] text-slate-400">1 loaf</div>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-semibold">Bakery</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 rounded-md border border-slate-500 flex items-center justify-center"></div>
                  <span className="text-xl">🍗</span>
                  <div>
                    <div className="text-xs font-bold text-white">Chicken</div>
                    <div className="text-[10px] text-slate-400">1 pack</div>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-semibold">Meat</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 rounded-md border border-slate-500 flex items-center justify-center"></div>
                  <span className="text-xl">🍌</span>
                  <div>
                    <div className="text-xs font-bold text-white">Bananas</div>
                    <div className="text-[10px] text-slate-400">6</div>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-semibold">Produce</span>
              </div>

              {filteredGroceries.map(item => {
                const isBought = item.Status === 'BOUGHT';
                return (
                  <div
                    key={item.Item_ID}
                    className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-700 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleToggleGroceryItem(item.Item_ID, item.Status)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isBought ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-slate-500'
                        }`}
                      >
                        {isBought && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <div>
                        <div className={`text-xs font-bold ${isBought ? 'line-through text-slate-500' : 'text-white'}`}>
                          {item.Title}
                        </div>
                        <div className="text-[10px] text-slate-400">{item.Quantity} count</div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">{item.Category || 'General'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: MEALS FOCUS                                        */}
      {/* ========================================================= */}
      {activeTab === 'MEALS' && (
        <div className="bg-slate-800/80 rounded-3xl p-5 border border-slate-700/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/70">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Utensils className="w-5 h-5 text-amber-400" />
              <span>Weekly Family Meal Planner</span>
            </h3>
            <span className="text-xs text-amber-300 font-semibold">Home cooked with love</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-700">
              <div className="text-xs font-bold uppercase text-blue-400 mb-2">Breakfast</div>
              <div className="text-sm font-bold text-white">Scrambled Eggs & Avocado Toast</div>
              <p className="text-xs text-slate-400 mt-1">Fresh berries for Amber and Alexa.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-700">
              <div className="text-xs font-bold uppercase text-amber-400 mb-2">Lunch</div>
              <div className="text-sm font-bold text-white">Turkey Panini & Tomato Soup</div>
              <p className="text-xs text-slate-400 mt-1">Packed bento boxes for school.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-700">
              <div className="text-xs font-bold uppercase text-rose-400 mb-2">Family Dinner (7:00 PM)</div>
              <div className="text-sm font-bold text-white">Roast Chicken & Garlic Mashed Potatoes</div>
              <p className="text-xs text-slate-400 mt-1">All family dinner together.</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: MESSAGES & FRIDGE STICKY NOTES                     */}
      {/* ========================================================= */}
      {activeTab === 'MESSAGES' && (
        <div className="bg-slate-800/80 rounded-3xl p-5 border border-slate-700/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/70">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              <span>Kitchen Whiteboard & Sticky Notes</span>
            </h3>
            <button
              onClick={() => setQuickActionModal('MESSAGE')}
              className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs"
            >
              + Leave a Note
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {fridgeNotes.map(note => (
              <div
                key={note.id}
                className="p-4 rounded-2xl text-slate-950 font-medium shadow-md flex flex-col justify-between min-h-[120px]"
                style={{ backgroundColor: note.color }}
              >
                <div className="text-xs">{note.text}</div>
                <div className="text-[10px] font-bold text-slate-700 text-right mt-3">
                  — {note.author}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 7: PHOTOS GALLERY                                     */}
      {/* ========================================================= */}
      {activeTab === 'PHOTOS' && (
        <div className="bg-slate-800/80 rounded-3xl p-5 border border-slate-700/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/70">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <ImageIcon className="w-5 h-5 text-pink-400" />
              <span>Family Photo Memories</span>
            </h3>
            <button
              onClick={() => setAmbientMode(true)}
              className="px-3 py-1.5 rounded-xl bg-pink-600 text-white font-bold text-xs flex items-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Start Slideshow</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ambientPhotos.length > 0 ? (
              ambientPhotos.map((p, i) => (
                <div key={p.Media_ID || i} className="h-32 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700">
                  <img
                    src={api.getMediaStreamUrl(p.Media_ID)}
                    alt={p.Caption || 'Memory'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))
            ) : (
              <div className="col-span-4 py-8 text-center text-xs text-slate-400">
                Memories synced from Private Google Drive Storage
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* BOTTOM FLOATING QUICK ACTIONS BAR (Exact as Reference UI) */}
      {/* ========================================================= */}
      <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-center sm:justify-between flex-wrap gap-3">
        {/* Quick Action Buttons: + Event, + Task, + List, Message, Timer */}
        <div className="flex items-center space-x-2 sm:space-x-3 overflow-x-auto py-1">
          {/* + Event */}
          <button
            onClick={() => setQuickActionModal('EVENT')}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-transform hover:scale-105 shadow-md"
          >
            <Calendar className="w-4 h-4" />
            <span>+ Event</span>
          </button>

          {/* + Task */}
          <button
            onClick={() => setQuickActionModal('TASK')}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-transform hover:scale-105 shadow-md"
          >
            <CheckSquare className="w-4 h-4" />
            <span>+ Task</span>
          </button>

          {/* + List */}
          <button
            onClick={() => setQuickActionModal('LIST')}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-transform hover:scale-105 shadow-md"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>+ List</span>
          </button>

          {/* Message */}
          <button
            onClick={() => setQuickActionModal('MESSAGE')}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-transform hover:scale-105 shadow-md"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Message</span>
          </button>

          {/* Timer */}
          <button
            onClick={() => setIsTimerModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-transform hover:scale-105 shadow-md"
          >
            <Timer className="w-4 h-4" />
            <span>Timer</span>
          </button>
        </div>

        {/* Exit Hub Mode Action Button */}
        <button
          onClick={toggleHubMode}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Exit Hub Mode</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* QUICK ACTION MODAL (Event, Task, List, Message)           */}
      {/* ========================================================= */}
      {quickActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 w-full max-w-md shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-4">
              <h3 className="text-base font-bold">
                {quickActionModal === 'EVENT' && 'Add Family Event'}
                {quickActionModal === 'TASK' && 'Add Daily Task'}
                {quickActionModal === 'LIST' && 'Add Grocery Item'}
                {quickActionModal === 'MESSAGE' && 'Post Fridge Whiteboard Note'}
              </h3>
              <button
                onClick={() => setQuickActionModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickAction} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-semibold">
                  {quickActionModal === 'MESSAGE' ? 'Message / Note' : 'Title'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    quickActionModal === 'EVENT' ? 'e.g. Amber Piano Recital' :
                    quickActionModal === 'TASK' ? 'e.g. Unload dishwasher' :
                    quickActionModal === 'LIST' ? 'e.g. Almond Milk' :
                    'e.g. Left dinner in the oven! ❤️'
                  }
                  value={quickTitle}
                  onChange={e => setQuickTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {quickActionModal !== 'MESSAGE' && (
                <div>
                  <label className="block text-xs text-slate-300 mb-1 font-semibold">
                    {quickActionModal === 'LIST' ? 'Quantity' : 'Details / Notes'}
                  </label>
                  <input
                    type="text"
                    placeholder={quickActionModal === 'LIST' ? '1' : 'Optional notes...'}
                    value={quickDetail}
                    onChange={e => setQuickDetail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setQuickActionModal(null)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md"
                >
                  Save to Hub
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* KITCHEN COOKING TIMER MODAL                               */}
      {/* ========================================================= */}
      {isTimerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-white text-center">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-4">
              <h3 className="text-base font-bold flex items-center space-x-2">
                <Timer className="w-5 h-5 text-sky-400" />
                <span>Kitchen Cooking Timer</span>
              </h3>
              <button
                onClick={() => setIsTimerModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Select preset minutes or quick interval:
            </p>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {[1, 3, 5, 10, 15, 20, 30, 45].map(m => (
                <button
                  key={m}
                  onClick={() => startKitchenTimer(m)}
                  className="py-3 rounded-2xl bg-slate-700 hover:bg-sky-600 text-white font-bold text-sm transition-colors"
                >
                  {m}m
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsTimerModalOpen(false)}
              className="w-full py-2 rounded-xl bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
