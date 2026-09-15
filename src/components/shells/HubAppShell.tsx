import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { CalendarEvent, TaskItem, FamilyListItem, FamilyMember } from '../../types';
import { FamilyAvatar } from '../ui/FamilyAvatar';
import { CalendarView } from '../modules/CalendarView';
import { TasksView } from '../modules/TasksView';
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
  ChevronLeft,
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
  Users,
  AlertCircle
} from 'lucide-react';

export type HubModeState =
  | 'FAMILY_HOME'     // The default bento overview (schedule, tasks, pantry, sticky notes)
  | 'AMBIENT'         // Ambient photo slideshow / screensaver
  | 'MODULE_FOCUS'    // Fullscreen single module view (e.g. Calendar, Groceries, Meals)
  | 'PERSON_FOCUS'    // Filtered view focusing on an individual member's day
  | 'ACTION_OVERLAY'  // Fullscreen touch modal (Quick add event, task, note, or kitchen timer)
  | 'PARENT_LOCK';    // PIN-gated parental administrative unlock

export const HubAppShell: React.FC = () => {
  const { session, members, hubLocked, unlockHub, lockHub, openPinModal, toggleHubMode } = useAuth();
  
  // Appliance Shell Primary Modes
  const [hubState, setHubState] = useState<HubModeState>('FAMILY_HOME');
  const [focusModule, setFocusModule] = useState<'CALENDAR' | 'TASKS' | 'GROCERIES' | 'MEALS' | 'PHOTOS'>('CALENDAR');
  const [focusMember, setFocusMember] = useState<FamilyMember | null>(null);
  
  // Action Overlay state
  const [actionType, setActionType] = useState<'EVENT' | 'TASK' | 'GROCERY' | 'NOTE' | 'TIMER' | null>(null);
  const [actionTitle, setActionTitle] = useState('');
  const [actionDetail, setActionDetail] = useState('');

  // Appliance Ambient Slideshow
  const [photoIndex, setPhotoIndex] = useState(0);
  const [ambientPhotos, setAmbientPhotos] = useState<any[]>([]);

  // Appliance Data
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [groceryItems, setGroceryItems] = useState<FamilyListItem[]>([]);
  const [groceryListId, setGroceryListId] = useState<string>('');
  const [fridgeNotes, setFridgeNotes] = useState([
    { id: '1', author: 'Mom (Mabu)', text: 'Dance recital rehearsal at 3:00 PM today! Bring water bottle 💕', color: '#FEF3C7' },
    { id: '2', author: 'Dad (Papa)', text: 'Pick up milk & eggs on way home from work.', color: '#E0F2FE' },
    { id: '3', author: 'Amber', text: 'Practiced piano 30 mins! Can we get pizza Friday? 🍕', color: '#FCE7F3' }
  ]);

  // Kitchen Timer State
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // Separate, isolated clock to prevent 1-second full-app re-renders
  const [clockTime, setClockTime] = useState<Date>(new Date());
  useEffect(() => {
    const interval = setInterval(() => setClockTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Timer countdown
  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(sec => sec - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerActive) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  // Load authoritative data
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
        setGroceryListId(groceryList.List_ID);
        const items = await api.getListItems(groceryList.List_ID);
        setGroceryItems(items);
      }
    } catch (err) {
      console.error('[HubAppShell] Failed to load data:', err);
    }
  };

  useEffect(() => {
    loadHubData();
  }, []);

  const handleToggleGrocery = async (item: FamilyListItem) => {
    const nextCompleted = !item.Completed;
    try {
      await api.toggleListItem(item.Item_ID, nextCompleted);
      setGroceryItems(prev =>
        prev.map(i => (i.Item_ID === item.Item_ID ? { ...i, Completed: nextCompleted } : i))
      );
    } catch (err) {
      console.error('Failed to toggle grocery item:', err);
    }
  };

  const handleSaveAction = async () => {
    if (!actionTitle.trim()) return;

    if (actionType === 'EVENT') {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 1);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);
      await api.createEvent({
        Title: actionTitle,
        Description: actionDetail,
        Start_Time: startTime.toISOString(),
        End_Time: endTime.toISOString(),
        Visibility: 'FAMILY',
        Category: 'FAMILY',
        Color: '#2563EB',
        Assigned_Members: []
      });
      const evts = await api.getEvents();
      setEvents(evts);
    } else if (actionType === 'TASK') {
      await api.createTask({
        Title: actionTitle,
        Description: actionDetail,
        Points: 5,
        Category: 'CHORE',
        Assigned_To: members[0]?.Member_ID || '',
        Created_By: session?.member.Member_ID || members[0]?.Member_ID || ''
      });
      const tsks = await api.getTasks();
      setTasks(tsks);
    } else if (actionType === 'GROCERY' && groceryListId) {
      await api.addListItem(groceryListId, actionTitle, actionDetail || '1');
      const items = await api.getListItems(groceryListId);
      setGroceryItems(items);
    } else if (actionType === 'NOTE') {
      setFridgeNotes(prev => [
        ...prev,
        {
          id: String(Date.now()),
          author: session?.member.Display_Name || 'Family Note',
          text: actionTitle,
          color: '#FEF3C7'
        }
      ]);
    }

    setActionType(null);
    setActionTitle('');
    setActionDetail('');
    setHubState('FAMILY_HOME');
  };

  // Format appliance digital clock
  const timeString = clockTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = clockTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col select-none relative overflow-hidden">
      {/* ========================================================================= */}
      {/* 1. APPLIANCE TOP BEZEL BAR (Always visible in all Hub modes)             */}
      {/* ========================================================================= */}
      <header className="h-20 bg-slate-900/90 border-b border-slate-800 px-6 flex items-center justify-between z-30 shrink-0">
        {/* Left: Clock & Weather Widget */}
        <div className="flex items-center space-x-6">
          <div className="flex items-baseline space-x-3">
            <span className="text-3xl font-black tracking-tight text-white">{timeString}</span>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{dateString}</span>
          </div>

          <div className="hidden md:flex items-center space-x-2 text-slate-400 text-xs border-l border-slate-800 pl-6">
            <Sun className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-slate-200">72°F</span>
            <span className="text-slate-400">New York, NY</span>
          </div>
        </div>

        {/* Center: Mode Indicator & Navigation Tabs (Hub Touch Sizing >= 56px height) */}
        <div className="flex items-center bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
          <button
            onClick={() => setHubState('FAMILY_HOME')}
            className={`flex items-center space-x-2 px-4 min-h-[56px] rounded-xl text-sm font-bold transition-all ${
              hubState === 'FAMILY_HOME' ? 'bg-[#D9962A] text-stone-950 shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="hidden sm:inline">Family Home</span>
          </button>

          <button
            onClick={() => setHubState('AMBIENT')}
            className={`flex items-center space-x-2 px-4 min-h-[56px] rounded-xl text-sm font-bold transition-all ${
              hubState === 'AMBIENT' ? 'bg-[#D9962A] text-stone-950 shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Ambient</span>
          </button>

          <button
            onClick={() => {
              setActionType('TIMER');
              setHubState('ACTION_OVERLAY');
            }}
            className={`flex items-center space-x-2 px-4 min-h-[56px] rounded-xl text-sm font-bold transition-all ${
              timerActive ? 'bg-[#3F9D68] text-slate-950 animate-pulse' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Timer className="w-5 h-5" />
            <span>
              {timerActive
                ? `${Math.floor(timerSeconds / 60)}:${(timerSeconds % 60).toString().padStart(2, '0')}`
                : 'Timer'}
            </span>
          </button>
        </div>

        {/* Right: Parent Lock / Exit Hub Controls */}
        <div className="flex items-center space-x-3">
          {/* Parent Lock / Unlock Toggle (Hub touch target >= 56px) */}
          <button
            onClick={() => {
              if (hubLocked) {
                setHubState('PARENT_LOCK');
              } else {
                lockHub();
              }
            }}
            className={`flex items-center space-x-2 px-4 min-h-[56px] rounded-xl text-sm font-bold border transition-all ${
              hubLocked
                ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                : 'bg-[#3F9D68]/20 text-[#3F9D68] border-[#3F9D68]/40'
            }`}
          >
            {hubLocked ? <Lock className="w-5 h-5 text-[#D9962A]" /> : <Unlock className="w-5 h-5 text-[#3F9D68]" />}
            <span className="hidden md:inline">{hubLocked ? 'Parent Locked' : 'Unlocked'}</span>
          </button>

          {/* Exit Hub Mode */}
          <button
            onClick={toggleHubMode}
            className="flex items-center space-x-2 px-4 min-h-[56px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold border border-slate-700"
            title="Exit Hub and return to personal view"
          >
            <Tv className="w-5 h-5" />
            <span>Exit Hub</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MODE: AMBIENT (Slideshow Screensaver)                                   */}
      {/* ========================================================================= */}
      {hubState === 'AMBIENT' && (
        <div
          onClick={() => setHubState('FAMILY_HOME')}
          className="flex-1 relative flex items-center justify-center bg-black cursor-pointer"
        >
          {ambientPhotos.length > 0 ? (
            <img
              src={`/api/media/${ambientPhotos[photoIndex % ambientPhotos.length].Media_ID}/stream`}
              alt="Family Memory"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="text-center p-8">
              <Sparkles className="w-16 h-16 text-amber-400 mx-auto mb-4 animate-pulse" />
              <h2 className="text-3xl font-serif font-bold text-slate-200">Enguerra of NY</h2>
              <p className="text-slate-500 mt-2">Tap anywhere on the screen to return to Family Home</p>
            </div>
          )}

          {/* Ambient Overlay Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none" />
          <div className="absolute bottom-10 left-10 text-white z-10 pointer-events-none">
            <div className="text-5xl font-black">{timeString}</div>
            <div className="text-base text-slate-300 font-medium">{dateString}</div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODE: FAMILY HOME (The Default Bento Dashboard)                       */}
      {/* ========================================================================= */}
      {hubState === 'FAMILY_HOME' && (
        <div className="flex-1 p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 Cols): Schedule & Sticky Fridge Notes */}
          <div className="lg:col-span-7 space-y-6">
            {/* Today's Family Schedule Card */}
            <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Today&apos;s Schedule</h2>
                    <p className="text-xs text-slate-400">Synced across all family devices</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setFocusModule('CALENDAR');
                      setHubState('MODULE_FOCUS');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center space-x-1"
                  >
                    <span>Expand</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setActionType('EVENT');
                      setHubState('ACTION_OVERLAY');
                    }}
                    className="p-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white"
                    title="Add Event"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {(() => {
                  const todayStr = new Date().toISOString().slice(0, 10);
                  const tom = new Date();
                  tom.setDate(tom.getDate() + 1);
                  const tomStr = tom.toISOString().slice(0, 10);

                  const todayEvs = events.filter(e => e.Start_Time?.slice(0, 10) === todayStr);
                  const tomEvs = events.filter(e => e.Start_Time?.slice(0, 10) === tomStr);

                  if (todayEvs.length === 0 && tomEvs.length === 0) {
                    return (
                      <div className="text-center py-8 text-slate-500 text-xs">
                        No events on the calendar for today or tomorrow.
                      </div>
                    );
                  }

                  return (
                    <>
                      {/* Today's Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            Today
                          </span>
                          <span>{todayEvs.length} {todayEvs.length === 1 ? 'event' : 'events'}</span>
                        </div>
                        {todayEvs.length === 0 ? (
                          <div className="p-2.5 rounded-xl bg-slate-800/40 text-slate-400 text-xs italic">
                            Nothing scheduled for today.
                          </div>
                        ) : (
                          todayEvs.slice(0, 3).map(event => (
                            <div
                              key={event.Event_ID}
                              className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/70 flex items-center justify-between"
                            >
                              <div className="flex items-center space-x-3">
                                <div
                                  className="w-2.5 h-9 rounded-full shrink-0"
                                  style={{ backgroundColor: event.Color || '#7A5AF8' }}
                                />
                                <div>
                                  <div className="text-sm font-bold text-white">{event.Title}</div>
                                  <div className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
                                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                                    <span>
                                      {new Date(event.Start_Time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {event.Location && <span>• {event.Location}</span>}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                                {event.Category}
                              </span>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Tomorrow's Section */}
                      <div className="space-y-2 pt-2 border-t border-slate-800/80">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5 text-blue-400">
                            Tomorrow
                          </span>
                          <span>{tomEvs.length} {tomEvs.length === 1 ? 'event' : 'events'}</span>
                        </div>
                        {tomEvs.length === 0 ? (
                          <div className="p-2.5 rounded-xl bg-slate-800/40 text-slate-400 text-xs italic">
                            Nothing scheduled for tomorrow.
                          </div>
                        ) : (
                          tomEvs.slice(0, 2).map(event => (
                            <div
                              key={event.Event_ID}
                              className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between"
                            >
                              <div className="flex items-center space-x-3">
                                <div
                                  className="w-2 h-7 rounded-full shrink-0 bg-blue-500"
                                />
                                <div>
                                  <div className="text-sm font-bold text-slate-200">{event.Title}</div>
                                  <div className="text-xs text-slate-400">
                                    {new Date(event.Start_Time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                                {event.Category}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Sticky Fridge Notes */}
            <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Kitchen Fridge Notes</h2>
                    <p className="text-xs text-slate-400">Quick family messages and reminders</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActionType('NOTE');
                    setHubState('ACTION_OVERLAY');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Leave Note</span>
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {fridgeNotes.map(note => (
                  <div
                    key={note.id}
                    className="p-4 rounded-2xl text-stone-950 font-medium shadow-md flex flex-col justify-between min-h-[110px]"
                    style={{ backgroundColor: note.color }}
                  >
                    <p className="text-xs font-bold leading-relaxed">{note.text}</p>
                    <div className="text-[10px] font-black uppercase tracking-wider text-stone-600 mt-3 pt-2 border-t border-black/10">
                      — {note.author}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (5 Cols): Family Members, Chores, & Groceries */}
          <div className="lg:col-span-5 space-y-6">
            {/* Person Focus Selector Bar */}
            <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Family Member View</h3>
                <span className="text-[11px] text-slate-500">Tap member to filter</span>
              </div>

              <div className="flex items-center space-x-3 overflow-x-auto pb-1">
                {members.map(m => (
                  <button
                    key={m.Member_ID}
                    onClick={() => {
                      setFocusMember(m);
                      setHubState('PERSON_FOCUS');
                    }}
                    className="flex flex-col items-center shrink-0 group"
                  >
                    <FamilyAvatar
                      member={m}
                      size="touchHub"
                      shape="squircle"
                      className="group-hover:scale-105 transition-transform"
                    />
                    <span className="text-xs font-semibold text-slate-300 mt-1.5 group-hover:text-white">
                      {m.First_Name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Chores Attention List */}
            <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Chores & Tasks</h2>
                    <p className="text-xs text-slate-400">Household task status</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setFocusModule('TASKS');
                    setHubState('MODULE_FOCUS');
                  }}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300"
                >
                  All Tasks →
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {tasks.slice(0, 4).map(task => (
                  <div
                    key={task.Task_ID}
                    className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between"
                  >
                    <span className="text-xs font-medium text-slate-200">{task.Title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                      {task.Status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pantry / Grocery List */}
            <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-2xl bg-purple-500/20 text-purple-400">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Pantry & Groceries</h2>
                    <p className="text-xs text-slate-400">Tap to mark item bought</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActionType('GROCERY');
                    setHubState('ACTION_OVERLAY');
                  }}
                  className="p-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white"
                  title="Add Grocery Item"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                {groceryItems.slice(0, 5).map(item => {
                  const isBought = item.Completed;
                  return (
                    <div
                      key={item.Item_ID}
                      onClick={() => handleToggleGrocery(item)}
                      className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                        isBought
                          ? 'bg-slate-800/30 border-slate-800 opacity-60 text-slate-500 line-through'
                          : 'bg-slate-800/60 border-slate-700 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        {isBought ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-500" />
                        )}
                        <span className="text-xs font-semibold">{item.Title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.Quantity || ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODE: MODULE FOCUS (Fullscreen single module view)                     */}
      {/* ========================================================================= */}
      {hubState === 'MODULE_FOCUS' && (
        <div className="flex-1 p-6 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <button
              onClick={() => setHubState('FAMILY_HOME')}
              className="flex items-center space-x-2 text-xs font-bold text-slate-400 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Family Home</span>
            </button>
            <h2 className="text-lg font-black text-white">{focusModule} FOCUS</h2>
            <div className="w-20" />
          </div>

          <div className="flex-1 bg-slate-900/90 rounded-3xl p-6 border border-slate-800 overflow-y-auto">
            {focusModule === 'CALENDAR' && (
              <CalendarView variant="HUB" onBack={() => setHubState('FAMILY_HOME')} />
            )}

            {focusModule === 'TASKS' && (
              <TasksView variant="HUB" onBack={() => setHubState('FAMILY_HOME')} />
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODE: PERSON FOCUS (Individual family member's schedule & chores)      */}
      {/* ========================================================================= */}
      {hubState === 'PERSON_FOCUS' && focusMember && (
        <div className="flex-1 p-6 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <button
              onClick={() => setHubState('FAMILY_HOME')}
              className="flex items-center space-x-2 text-xs font-bold text-slate-400 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Family Home</span>
            </button>
            <div className="flex items-center space-x-3">
              <FamilyAvatar
                member={focusMember}
                size="sm"
                shape="squircle"
              />
              <h2 className="text-lg font-black text-white">{focusMember.First_Name}&apos;s Day</h2>
            </div>
            <div className="w-20" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1">
            {/* Left Hero: Member Photo & Identity Card */}
            <div className="md:col-span-4 bg-slate-900/90 rounded-3xl p-6 border border-slate-800 flex flex-col items-center justify-center text-center">
              <FamilyAvatar
                member={focusMember}
                size="xl"
                shape="squircle"
                className="w-24 h-24 text-3xl shadow-xl ring-4 ring-slate-800"
              />
              <h3 className="text-xl font-black text-white mt-3">{focusMember.Display_Name || focusMember.First_Name}</h3>
              <p className="text-xs text-amber-400 font-semibold mt-0.5">{focusMember.First_Name}&apos;s daily hub view</p>
              <div className="mt-4 pt-4 border-t border-slate-800/80 w-full text-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{focusMember.Role}</span>
                <p className="text-xs text-slate-500 mt-1">Birthday: {focusMember.Birth_Date || 'Family Member'}</p>
              </div>
            </div>

            {/* Right: Assigned Tasks & Info */}
            <div className="md:col-span-8 bg-slate-900/90 rounded-3xl p-6 border border-slate-800">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Assigned Tasks</h3>
              <div className="space-y-3">
                {tasks.filter(t => t.Assigned_To === focusMember.Member_ID).length === 0 ? (
                  <div className="text-slate-500 text-xs py-8 text-center">No assigned tasks for today.</div>
                ) : (
                  tasks.filter(t => t.Assigned_To === focusMember.Member_ID).map(t => (
                    <div key={t.Task_ID} className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 flex justify-between items-center">
                      <span className="text-sm font-bold text-white">{t.Title}</span>
                      <span className="text-xs font-bold text-amber-400">+{t.Points || 5} pts</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODE: ACTION OVERLAY (Touch Add Event/Task/Note or Kitchen Timer)       */}
      {/* ========================================================================= */}
      {hubState === 'ACTION_OVERLAY' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <h2 className="text-lg font-black text-white">
                {actionType === 'TIMER'
                  ? 'Kitchen Cooking Timer'
                  : `Quick Add ${actionType}`}
              </h2>
              <button
                onClick={() => setHubState('FAMILY_HOME')}
                className="p-1 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionType === 'TIMER' ? (
              <div className="text-center space-y-6">
                <div className="text-6xl font-black font-mono text-amber-400">
                  {Math.floor(timerSeconds / 60).toString().padStart(2, '0')}:
                  {(timerSeconds % 60).toString().padStart(2, '0')}
                </div>

                <div className="flex justify-center gap-2">
                  {[1, 3, 5, 10, 15, 20].map(mins => (
                    <button
                      key={mins}
                      onClick={() => setTimerSeconds(mins * 60)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
                    >
                      +{mins}m
                    </button>
                  ))}
                </div>

                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setTimerActive(!timerActive)}
                    className={`px-6 py-3 rounded-2xl font-black text-xs flex items-center space-x-2 ${
                      timerActive ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    <Play className="w-4 h-4" />
                    <span>{timerActive ? 'Pause' : 'Start'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setTimerActive(false);
                      setTimerSeconds(0);
                    }}
                    className="px-6 py-3 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs flex items-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={actionTitle}
                    onChange={e => setActionTitle(e.target.value)}
                    placeholder="Enter description..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Detail / Quantity
                  </label>
                  <input
                    type="text"
                    value={actionDetail}
                    onChange={e => setActionDetail(e.target.value)}
                    placeholder="Optional details or quantity..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setHubState('FAMILY_HOME')}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAction}
                    className="px-6 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md"
                  >
                    Save Item
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODE: PARENT LOCK (PIN keypad to unlock parental controls)              */}
      {/* ========================================================================= */}
      {hubState === 'PARENT_LOCK' && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-white">Parent Authorization</h2>
            <p className="text-xs text-slate-400 mt-1 mb-6">
              Enter parent PIN to unlock full refrigerator management
            </p>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  const parent = members.find(m => m.Role === 'OWNER' || m.Role === 'ADMIN');
                  if (parent) {
                    openPinModal(parent, () => {
                      unlockHub('1234');
                      setHubState('FAMILY_HOME');
                    });
                  }
                }}
                className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-lg"
              >
                Open Numeric Keypad
              </button>
              <button
                onClick={() => setHubState('FAMILY_HOME')}
                className="px-4 py-3 rounded-2xl bg-slate-800 text-slate-400 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
