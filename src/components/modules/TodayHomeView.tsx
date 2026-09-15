import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  CalendarEvent,
  TaskItem,
  TaskResponsibility,
  FamilyList,
  FamilyListItem,
  ChatThread,
  ChatMessage,
  FamilyMember,
} from '../../types';
import { api } from '../../lib/api';
import { ENGUERRA_COLORS, RADIUS } from '../../lib/tokens';
import { Card } from '../ui/Card';
import { FamilyAvatar } from '../ui/FamilyAvatar';
import { Dialog } from '../ui/Dialog';
import {
  Calendar as CalendarIcon,
  CheckSquare,
  ShoppingCart,
  MessageSquare,
  Users,
  Sparkles,
  CloudSun,
  Clock,
  Plus,
  ChevronRight,
  AlertCircle,
  ShieldCheck,
  Star,
  Award,
  MapPin,
  CheckCircle2,
  Circle,
  Send,
  MoreHorizontal,
  ArrowRight,
  Flame,
  UserCheck,
  RefreshCw,
  X,
  Layers,
  SlidersHorizontal,
  Compass,
} from 'lucide-react';

export interface TodayHomeViewProps {
  onNavigate: (tab: 'OVERVIEW' | 'CALENDAR' | 'TASKS' | 'LISTS' | 'CHAT' | 'PHOTOS' | 'PROFILES' | 'DIAGNOSTICS') => void;
  onOpenQuickAdd?: () => void;
}

export const TodayHomeView: React.FC<TodayHomeViewProps> = ({
  onNavigate,
  onOpenQuickAdd,
}) => {
  const { session, members, deviceMode, detectedType, switchMember } = useAuth();
  const currentMember = session?.member;
  const isParent = currentMember?.Role === 'OWNER' || currentMember?.Role === 'ADMIN';

  // Real Data States
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [responsibilities, setResponsibilities] = useState<TaskResponsibility[]>([]);
  const [lists, setLists] = useState<FamilyList[]>([]);
  const [listItems, setListItems] = useState<FamilyListItem[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [latestMessages, setLatestMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Quick Action / Local states
  const [quickReplyText, setQuickReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [quickShoppingText, setQuickShoppingText] = useState('');
  const [isAddingShopping, setIsAddingShopping] = useState(false);

  // Modal States
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddTab, setQuickAddTab] = useState<'TASK' | 'EVENT' | 'SHOPPING' | 'MESSAGE'>('TASK');
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);

  // Context Rail & Debug Toggles
  const [showContextRail, setShowContextRail] = useState(true);
  const [isDebugMode, setIsDebugMode] = useState(false);

  // Form states for Quick Add
  const [formTaskTitle, setFormTaskTitle] = useState('');
  const [formTaskAssignee, setFormTaskAssignee] = useState(members[2]?.Member_ID || '');
  const [formTaskPoints, setFormTaskPoints] = useState(15);
  const [formTaskCategory, setFormTaskCategory] = useState<'CHORE' | 'HOMEWORK' | 'ROUTINE'>('CHORE');

  const [formEventTitle, setFormEventTitle] = useState('');
  const [formEventDate, setFormEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [formEventTime, setFormEventTime] = useState('18:00');
  const [formEventLocation, setFormEventLocation] = useState('');

  const [formShoppingTitle, setFormShoppingTitle] = useState('');
  const [formShoppingQty, setFormShoppingQty] = useState('');

  const [formMessageContent, setFormMessageContent] = useState('');

  // Fetch all live Enguerra data
  const loadDashboardData = async (isManualRefresh: boolean = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const [evts, tsks, resps, lsts, thrds] = await Promise.all([
        api.getEvents().catch(() => []),
        api.getTasks().catch(() => []),
        api.getResponsibilities().catch(() => []),
        api.getLists().catch(() => []),
        api.getThreads().catch(() => []),
      ]);

      setEvents(evts);
      setTasks(tsks);
      setResponsibilities(resps);
      setLists(lsts);
      setThreads(thrds);

      // Load grocery list items from primary grocery list
      const groceryList = lsts.find(l => l.Category === 'GROCERY') || lsts[0];
      if (groceryList) {
        const items = await api.getListItems(groceryList.List_ID).catch(() => []);
        setListItems(items);
      }

      // Load latest messages from primary family thread
      const familyThread = thrds.find(t => t.Thread_Type === 'FAMILY') || thrds[0];
      if (familyThread) {
        const msgs = await api.getMessages(familyThread.Thread_ID).catch(() => []);
        setLatestMessages(msgs);
      }
    } catch (err) {
      console.error('[TodayHomeView] Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Set default form assignee once members are loaded
  useEffect(() => {
    if (members.length > 0 && !formTaskAssignee) {
      const child = members.find(m => m.Role === 'CHILD') || members[0];
      setFormTaskAssignee(child.Member_ID);
    }
  }, [members, formTaskAssignee]);

  // Date & Greeting Helpers
  const now = new Date();
  const liveDateString = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const hour = now.getHours();
  let greetingPeriod = 'Good morning';
  if (hour >= 12 && hour < 17) greetingPeriod = 'Good afternoon';
  else if (hour >= 17) greetingPeriod = 'Good evening';

  const adultDisplayName = currentMember?.First_Name || 'Parent';

  // 1. Today's Events (Events falling on current day)
  const todayDateString = now.toISOString().slice(0, 10);
  const todaysScheduleEvents = useMemo(() => {
    return events.filter(evt => {
      if (!evt.Start_Time) return false;
      const evtDate = evt.Start_Time.slice(0, 10);
      return evtDate === todayDateString;
    }).sort((a, b) => new Date(a.Start_Time).getTime() - new Date(b.Start_Time).getTime());
  }, [events, todayDateString]);

  // Imminent Next Event for Context Rail
  const nextImminentEvent = useMemo(() => {
    const upcoming = events
      .filter(e => new Date(e.Start_Time).getTime() >= now.getTime())
      .sort((a, b) => new Date(a.Start_Time).getTime() - new Date(b.Start_Time).getTime());
    return upcoming[0] || todaysScheduleEvents[0] || null;
  }, [events, todaysScheduleEvents, now]);

  // 2. Needs Attention items
  // Includes:
  // - Tasks completed by kids awaiting parent review/approval (Status === 'COMPLETED' and not 'APPROVED')
  // - Urgent tasks due today with HIGH priority
  const needsAttentionTasks = useMemo(() => {
    return tasks.filter(t => {
      const isAwaitingApproval = t.Status === 'COMPLETED' && !t.Approved_By;
      const isUrgentToday = t.Priority === 'HIGH' && t.Due_Date === todayDateString && t.Status !== 'APPROVED';
      return isAwaitingApproval || isUrgentToday;
    });
  }, [tasks, todayDateString]);

  // 3. Tasks Summary (Active tasks for today, pending or completed)
  const todaysTasks = useMemo(() => {
    return tasks
      .filter(t => t.Status !== 'APPROVED')
      .slice(0, 5);
  }, [tasks]);

  // 4. Shopping Summary items (uncompleted first)
  const sortedShoppingItems = useMemo(() => {
    return [...listItems].sort((a, b) => (a.Completed === b.Completed ? 0 : a.Completed ? 1 : -1)).slice(0, 5);
  }, [listItems]);

  const uncompletedShoppingCount = useMemo(() => {
    return listItems.filter(i => !i.Completed).length;
  }, [listItems]);

  // 5. Kids Progress: Amber, Alexa, Adine
  const kidsMembers = useMemo(() => {
    return members.filter(m => m.Role === 'CHILD');
  }, [members]);

  const kidsProgressData = useMemo(() => {
    return kidsMembers.map(child => {
      const childTasks = tasks.filter(t => t.Assigned_To === child.Member_ID);
      const completedTasks = childTasks.filter(t => t.Status === 'COMPLETED' || t.Status === 'APPROVED');
      const earnedPoints = completedTasks.reduce((acc, t) => acc + (t.Points || 0), 0);
      const totalCount = childTasks.length || 1;
      const percentage = Math.round((completedTasks.length / totalCount) * 100);

      return {
        member: child,
        totalTasks: childTasks.length,
        completedTasks: completedTasks.length,
        percentage,
        points: earnedPoints,
      };
    });
  }, [kidsMembers, tasks]);

  // 6. Next 7 Days Outlook
  const next7DaysAgenda = useMemo(() => {
    const days: { date: Date; dateStr: string; label: string; events: CalendarEvent[] }[] = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(now.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const dayEvents = events.filter(e => e.Start_Time && e.Start_Time.slice(0, 10) === dateStr);
      days.push({ date: d, dateStr, label, events: dayEvents });
    }
    return days;
  }, [events, now]);

  // 7. Latest Message Preview
  const mostRecentMessage = latestMessages[latestMessages.length - 1];
  const recentMessageSender = members.find(m => m.Member_ID === mostRecentMessage?.Sender_ID);

  // --- Handlers for Real API Operations ---

  // Task Status Toggle
  const handleToggleTask = async (task: TaskItem) => {
    const newStatus = task.Status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    // Optimistic UI update
    setTasks(prev => prev.map(t => (t.Task_ID === task.Task_ID ? { ...t, Status: newStatus } : t)));
    try {
      await api.updateTaskStatus(task.Task_ID, newStatus);
    } catch (err) {
      console.error('Failed to update task status:', err);
      loadDashboardData();
    }
  };

  // One-click Parent Approval for Task
  const handleApproveTask = async (taskId: string) => {
    // Optimistic UI update
    setTasks(prev => prev.map(t => (t.Task_ID === taskId ? { ...t, Status: 'APPROVED', Approved_By: currentMember?.Member_ID } : t)));
    try {
      await api.updateTaskStatus(taskId, 'APPROVED', 'Parent authorized from Today dashboard');
      loadDashboardData();
    } catch (err) {
      console.error('Failed to approve task:', err);
      loadDashboardData();
    }
  };

  // Shopping Item Toggle
  const handleToggleShoppingItem = async (item: FamilyListItem) => {
    const newCompleted = !item.Completed;
    setListItems(prev => prev.map(i => (i.Item_ID === item.Item_ID ? { ...i, Completed: newCompleted } : i)));
    try {
      await api.toggleListItem(item.Item_ID, newCompleted);
    } catch (err) {
      console.error('Failed to toggle shopping item:', err);
      loadDashboardData();
    }
  };

  // Quick Add Shopping Item
  const handleQuickAddShopping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickShoppingText.trim()) return;
    const groceryList = lists.find(l => l.Category === 'GROCERY') || lists[0];
    if (!groceryList) return;

    setIsAddingShopping(true);
    try {
      await api.addListItem(groceryList.List_ID, quickShoppingText.trim(), '1');
      setQuickShoppingText('');
      const updated = await api.getListItems(groceryList.List_ID);
      setListItems(updated);
    } catch (err) {
      console.error('Failed to add shopping item:', err);
    } finally {
      setIsAddingShopping(false);
    }
  };

  // Quick Inline Message Reply
  const handleSendQuickReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickReplyText.trim()) return;
    const familyThread = threads.find(t => t.Thread_Type === 'FAMILY') || threads[0];
    if (!familyThread) return;

    setIsSendingReply(true);
    try {
      const newMsg = await api.sendMessage(familyThread.Thread_ID, quickReplyText.trim());
      setQuickReplyText('');
      setLatestMessages(prev => [...prev, newMsg]);
    } catch (err) {
      console.error('Failed to send quick message:', err);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Modal Quick Add Submission
  const handleModalQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (quickAddTab === 'TASK') {
        if (!formTaskTitle.trim()) return;
        await api.createTask({
          Title: formTaskTitle.trim(),
          Assigned_To: formTaskAssignee,
          Points: Number(formTaskPoints),
          Category: formTaskCategory,
          Due_Date: todayDateString,
          Visibility: 'FAMILY',
        });
        setFormTaskTitle('');
      } else if (quickAddTab === 'EVENT') {
        if (!formEventTitle.trim()) return;
        const startTime = `${formEventDate}T${formEventTime}:00.000Z`;
        const endTime = `${formEventDate}T${String(Number(formEventTime.slice(0, 2)) + 1).padStart(2, '0')}:${formEventTime.slice(3, 5)}:00.000Z`;
        await api.createEvent({
          Title: formEventTitle.trim(),
          Start_Time: startTime,
          End_Time: endTime,
          Location: formEventLocation.trim() || 'Home',
          Visibility: 'FAMILY',
          Category: 'FAMILY',
          Color: ENGUERRA_COLORS.calendar,
        });
        setFormEventTitle('');
      } else if (quickAddTab === 'SHOPPING') {
        if (!formShoppingTitle.trim()) return;
        const targetList = lists.find(l => l.Category === 'GROCERY') || lists[0];
        if (targetList) {
          await api.addListItem(targetList.List_ID, formShoppingTitle.trim(), formShoppingQty.trim() || '1');
          setFormShoppingTitle('');
          setFormShoppingQty('');
        }
      } else if (quickAddTab === 'MESSAGE') {
        if (!formMessageContent.trim()) return;
        const targetThread = threads.find(t => t.Thread_Type === 'FAMILY') || threads[0];
        if (targetThread) {
          await api.sendMessage(targetThread.Thread_ID, formMessageContent.trim());
          setFormMessageContent('');
        }
      }

      setIsQuickAddOpen(false);
      loadDashboardData();
    } catch (err) {
      console.error('Failed to submit quick add:', err);
    }
  };

  return (
    <div className="w-full space-y-6 pb-12 animate-in fade-in duration-300">
      {/* ========================================================================= */}
      {/* 1. HERO BANNER: Premium Greeting, Live Date, NY Weather, Adult Character  */}
      {/* ========================================================================= */}
      <section
        id="today-greeting-hero"
        className="bg-[#1C1E21] rounded-[20px] sm:rounded-[24px] p-6 sm:p-8 text-white shadow-xs border border-[#E5E4E1]/15 relative overflow-hidden transition-all"
      >
        {/* Subtle accent glow behind character */}
        <div
          className="absolute -right-16 -top-16 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: currentMember?.Color || ENGUERRA_COLORS.today }}
        />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex-1 space-y-3 max-w-2xl">
            {/* Live Date, Weather & Authority Node Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/10 text-white/90 backdrop-blur-xs border border-white/10">
                <CalendarIcon className="w-3.5 h-3.5 text-[#D9962A]" />
                <span>{liveDateString}</span>
              </span>

              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/10 text-white/90 backdrop-blur-xs border border-white/10">
                <CloudSun className="w-3.5 h-3.5 text-[#F28C4B]" />
                <span>New York, NY • 72°F Partly Cloudy</span>
              </span>

              {isParent && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#3F9D68]/20 text-[#3F9D68] border border-[#3F9D68]/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Authority Node ({currentMember?.Role})</span>
                </span>
              )}

              {refreshing && (
                <span className="inline-flex items-center space-x-1 text-[11px] text-[#8A8F98] animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Syncing...</span>
                </span>
              )}
            </div>

            {/* Premium Greeting Heading */}
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
                {greetingPeriod}, {adultDisplayName}
              </h1>
              <p className="text-[#8A8F98] text-sm sm:text-base mt-1.5 leading-relaxed">
                Enguerra Family Operating System • {todaysScheduleEvents.length} events scheduled today •{' '}
                {needsAttentionTasks.length > 0 ? (
                  <span className="text-[#D9962A] font-semibold">{needsAttentionTasks.length} items need your review</span>
                ) : (
                  <span className="text-[#3F9D68] font-medium">All household chores are in order</span>
                )}
              </p>
            </div>

            {/* Quick Hero Summary Metric Pills */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                onClick={() => onNavigate('CALENDAR')}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/90 flex items-center space-x-1.5 transition-colors"
              >
                <Clock className="w-3.5 h-3.5 text-[#7A5AF8]" />
                <span>{todaysScheduleEvents.length} Scheduled Today</span>
              </button>

              <button
                onClick={() => onNavigate('TASKS')}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/90 flex items-center space-x-1.5 transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5 text-[#3F9D68]" />
                <span>{todaysTasks.length} Open Tasks</span>
              </button>

              <button
                onClick={() => onNavigate('LISTS')}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/90 flex items-center space-x-1.5 transition-colors"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-[#D9962A]" />
                <span>{uncompletedShoppingCount} Groceries Needed</span>
              </button>

              <button
                onClick={() => loadDashboardData(true)}
                title="Refresh Live Data"
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Logged-In User Profile Photo or Initials Monogram */}
          <div className="shrink-0 flex items-center justify-center self-center lg:self-auto">
            <div className="relative group">
              <FamilyAvatar
                member={currentMember}
                size="xl"
                shape="squircle"
                className="w-18 h-18 sm:w-20 sm:h-20 shadow-md ring-2 ring-white/20 text-2xl"
              />
              <button
                onClick={() => onNavigate('PROFILES')}
                title="Update Profile Photo"
                className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-stone-900/90 hover:bg-stone-900 text-white/90 hover:text-white border border-white/20 text-[10px] font-semibold transition-all shadow-xs"
              >
                Photo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. MODULE LAUNCHER: Responsive Grid (Mobile 2x3, Tablet 3x2, Desktop 6x1)  */}
      {/* ========================================================================= */}
      <section id="module-launcher" aria-label="Module Launcher">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
          {/* 1. Calendar */}
          <button
            onClick={() => onNavigate('CALENDAR')}
            className="group flex flex-col p-4 bg-white border border-[#E5E4E1] hover:border-[#7A5AF8] rounded-[16px] shadow-xs hover:shadow-sm text-left transition-all min-h-[84px] focus:outline-hidden focus:ring-2 focus:ring-[#7A5AF8]/30"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 rounded-xl text-white" style={{ backgroundColor: ENGUERRA_COLORS.calendar }}>
                <CalendarIcon className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#7A5AF8]/10 text-[#7A5AF8]">
                {todaysScheduleEvents.length}
              </span>
            </div>
            <span className="text-sm font-bold text-[#1C1E21] group-hover:text-[#7A5AF8] transition-colors">Calendar</span>
            <span className="text-[11px] text-[#5B6169] mt-0.5">Family schedule</span>
          </button>

          {/* 2. Tasks */}
          <button
            onClick={() => onNavigate('TASKS')}
            className="group flex flex-col p-4 bg-white border border-[#E5E4E1] hover:border-[#3F9D68] rounded-[16px] shadow-xs hover:shadow-sm text-left transition-all min-h-[84px] focus:outline-hidden focus:ring-2 focus:ring-[#3F9D68]/30"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 rounded-xl text-white" style={{ backgroundColor: ENGUERRA_COLORS.tasks }}>
                <CheckSquare className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#3F9D68]/10 text-[#3F9D68]">
                {todaysTasks.length}
              </span>
            </div>
            <span className="text-sm font-bold text-[#1C1E21] group-hover:text-[#3F9D68] transition-colors">Tasks</span>
            <span className="text-[11px] text-[#5B6169] mt-0.5">Chores & stars</span>
          </button>

          {/* 3. Shopping */}
          <button
            onClick={() => onNavigate('LISTS')}
            className="group flex flex-col p-4 bg-white border border-[#E5E4E1] hover:border-[#D9962A] rounded-[16px] shadow-xs hover:shadow-sm text-left transition-all min-h-[84px] focus:outline-hidden focus:ring-2 focus:ring-[#D9962A]/30"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 rounded-xl text-white" style={{ backgroundColor: ENGUERRA_COLORS.shopping }}>
                <ShoppingCart className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#D9962A]/10 text-[#D9962A]">
                {uncompletedShoppingCount}
              </span>
            </div>
            <span className="text-sm font-bold text-[#1C1E21] group-hover:text-[#D9962A] transition-colors">Shopping</span>
            <span className="text-[11px] text-[#5B6169] mt-0.5">Grocery list</span>
          </button>

          {/* 4. Messages */}
          <button
            onClick={() => onNavigate('CHAT')}
            className="group flex flex-col p-4 bg-white border border-[#E5E4E1] hover:border-[#3A80DE] rounded-[16px] shadow-xs hover:shadow-sm text-left transition-all min-h-[84px] focus:outline-hidden focus:ring-2 focus:ring-[#3A80DE]/30"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 rounded-xl text-white" style={{ backgroundColor: ENGUERRA_COLORS.messages }}>
                <MessageSquare className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#3A80DE]/10 text-[#3A80DE]">
                Chat
              </span>
            </div>
            <span className="text-sm font-bold text-[#1C1E21] group-hover:text-[#3A80DE] transition-colors">Messages</span>
            <span className="text-[11px] text-[#5B6169] mt-0.5">Family stream</span>
          </button>

          {/* 5. Family */}
          <button
            onClick={() => onNavigate('PROFILES')}
            className="group flex flex-col p-4 bg-white border border-[#E5E4E1] hover:border-[#E16F7C] rounded-[16px] shadow-xs hover:shadow-sm text-left transition-all min-h-[84px] focus:outline-hidden focus:ring-2 focus:ring-[#E16F7C]/30"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 rounded-xl text-white" style={{ backgroundColor: ENGUERRA_COLORS.family }}>
                <Users className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#E16F7C]/10 text-[#E16F7C]">
                {members.length}
              </span>
            </div>
            <span className="text-sm font-bold text-[#1C1E21] group-hover:text-[#E16F7C] transition-colors">Family</span>
            <span className="text-[11px] text-[#5B6169] mt-0.5">Member profiles</span>
          </button>

          {/* 6. More */}
          <button
            onClick={() => setIsMoreSheetOpen(true)}
            className="group flex flex-col p-4 bg-white border border-[#E5E4E1] hover:border-[#74808C] rounded-[16px] shadow-xs hover:shadow-sm text-left transition-all min-h-[84px] focus:outline-hidden focus:ring-2 focus:ring-[#74808C]/30"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 rounded-xl text-white" style={{ backgroundColor: ENGUERRA_COLORS.more }}>
                <MoreHorizontal className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#74808C]/10 text-[#74808C]">
                More
              </span>
            </div>
            <span className="text-sm font-bold text-[#1C1E21] group-hover:text-[#74808C] transition-colors">More</span>
            <span className="text-[11px] text-[#5B6169] mt-0.5">Tools & memories</span>
          </button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. CORE DASHBOARD: Desktop 12-Column Grid / Tablet 2-Col / Mobile Stack   */}
      {/* ========================================================================= */}
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Main 12-Column Workspace Grid */}
        <div className="flex-1 w-full space-y-6">
          {/* ROW 1: Today's Schedule (7 cols) + Needs Attention (5 cols) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
            {/* Schedule (Desktop: col-span-7) */}
            <div className="lg:col-span-7">
              <Card className="h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3.5 border-b border-[#E5E4E1] mb-4">
                    <div className="flex items-center space-x-2.5">
                      <span className="p-1.5 rounded-lg text-white" style={{ backgroundColor: ENGUERRA_COLORS.calendar }}>
                        <CalendarIcon className="w-4 h-4" />
                      </span>
                      <div>
                        <h2 className="text-base font-bold text-[#1C1E21]">Today&apos;s Schedule</h2>
                        <p className="text-[11px] text-[#5B6169]">Events scheduled for today</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setQuickAddTab('EVENT');
                          setIsQuickAddOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-[#5B6169] hover:text-[#1C1E21] hover:bg-[#F7F6F4] transition-colors"
                        title="Add Event"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onNavigate('CALENDAR')}
                        className="text-xs font-semibold text-[#7A5AF8] hover:underline flex items-center space-x-0.5"
                      >
                        <span>Full Calendar</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {todaysScheduleEvents.length === 0 ? (
                    <div className="py-8 text-center text-[#5B6169]">
                      <div className="w-12 h-12 mx-auto mb-2.5 rounded-2xl bg-[#F7F6F4] border border-[#E5E4E1] flex items-center justify-center text-[#8A8F98]">
                        <CalendarIcon className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-[#1C1E21]">No scheduled events today</p>
                      <p className="text-xs text-[#8A8F98] mt-1">Enjoy family time or add a new activity.</p>
                      <button
                        onClick={() => {
                          setQuickAddTab('EVENT');
                          setIsQuickAddOpen(true);
                        }}
                        className="mt-3 px-3 py-1.5 rounded-xl bg-[#F7F6F4] hover:bg-[#E5E4E1] text-xs font-bold text-[#1C1E21] transition-colors"
                      >
                        + Add Today&apos;s Event
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {todaysScheduleEvents.map(evt => {
                        const startTime = evt.Start_Time ? new Date(evt.Start_Time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
                        const endTime = evt.End_Time ? new Date(evt.End_Time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';

                        return (
                          <div
                            key={evt.Event_ID}
                            className="p-3.5 rounded-xl bg-[#F7F6F4]/70 hover:bg-[#F7F6F4] border border-[#E5E4E1] transition-all flex items-start justify-between gap-3"
                          >
                            <div className="flex items-start space-x-3 min-w-0">
                              <div className="shrink-0 text-center px-2 py-1 rounded-lg bg-white border border-[#E5E4E1] min-w-[64px]">
                                <div className="text-[11px] font-bold text-[#1C1E21]">{startTime || 'All Day'}</div>
                                {endTime && <div className="text-[9px] text-[#8A8F98]">{endTime}</div>}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center space-x-2">
                                  <h3 className="text-xs sm:text-sm font-bold text-[#1C1E21] truncate">{evt.Title}</h3>
                                  {evt.Visibility === 'PARENTS_ONLY' && (
                                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                      Parents
                                    </span>
                                  )}
                                </div>
                                {evt.Location && (
                                  <div className="flex items-center space-x-1 text-[11px] text-[#5B6169] mt-0.5">
                                    <MapPin className="w-3 h-3 text-[#8A8F98]" />
                                    <span className="truncate">{evt.Location}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Assigned Members stack */}
                            <div className="shrink-0 flex items-center -space-x-1.5">
                              {evt.Assigned_Members?.slice(0, 3).map(memId => {
                                const m = members.find(mem => mem.Member_ID === memId);
                                return m ? (
                                  <FamilyAvatar
                                    key={m.Member_ID}
                                    member={m}
                                    size="xs"
                                    shape="squircle"
                                    showBorder={true}
                                  />
                                ) : null;
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#E5E4E1]/80 flex items-center justify-between text-xs text-[#8A8F98]">
                  <span>{todaysScheduleEvents.length} active events</span>
                  <button
                    onClick={() => onNavigate('CALENDAR')}
                    className="font-semibold text-[#7A5AF8] hover:underline"
                  >
                    Manage Calendar
                  </button>
                </div>
              </Card>
            </div>

            {/* Needs Attention (Desktop: col-span-5) */}
            <div className="lg:col-span-5">
              <Card className="h-full flex flex-col justify-between border-[#D9962A]/30">
                <div>
                  <div className="flex items-center justify-between pb-3.5 border-b border-[#E5E4E1] mb-4">
                    <div className="flex items-center space-x-2.5">
                      <span className="p-1.5 rounded-lg text-white" style={{ backgroundColor: ENGUERRA_COLORS.warning }}>
                        <AlertCircle className="w-4 h-4" />
                      </span>
                      <div>
                        <h2 className="text-base font-bold text-[#1C1E21]">Needs Attention</h2>
                        <p className="text-[11px] text-[#5B6169]">Parent approvals & urgent items</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#D9962A]/10 text-[#D9962A]">
                      {needsAttentionTasks.length} Pending
                    </span>
                  </div>

                  {needsAttentionTasks.length === 0 ? (
                    <div className="py-8 text-center text-[#5B6169]">
                      <div className="w-12 h-12 mx-auto mb-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#3F9D68]">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-[#1C1E21]">All Caught Up!</p>
                      <p className="text-xs text-[#8A8F98] mt-1">No items awaiting parent approval or triage.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {needsAttentionTasks.map(task => {
                        const assignedMember = members.find(m => m.Member_ID === task.Assigned_To);
                        const isCompletedByChild = task.Status === 'COMPLETED' && !task.Approved_By;

                        return (
                          <div
                            key={task.Task_ID}
                            className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 flex flex-col space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center space-x-2 min-w-0">
                                {assignedMember && (
                                  <FamilyAvatar
                                    member={assignedMember}
                                    size="xs"
                                    shape="squircle"
                                  />
                                )}
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-[#1C1E21] truncate">{task.Title}</div>
                                  <div className="text-[10px] text-amber-800">
                                    {assignedMember?.First_Name || 'Child'} • {task.Category}
                                  </div>
                                </div>
                              </div>

                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#D9962A] border border-amber-200 shrink-0">
                                +{task.Points || 10} pts
                              </span>
                            </div>

                            {/* Action Bar */}
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[11px] font-medium text-amber-900">
                                {isCompletedByChild ? 'Marked complete by child' : 'High Priority Due Today'}
                              </span>
                              <button
                                onClick={() => handleApproveTask(task.Task_ID)}
                                className="px-3 py-1 rounded-lg bg-[#3F9D68] hover:bg-[#348356] text-white text-xs font-bold shadow-xs transition-colors"
                              >
                                Approve ({task.Points || 10}★)
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#E5E4E1]/80 flex items-center justify-between text-xs text-[#8A8F98]">
                  <span>Parent approval releases star rewards</span>
                  <button
                    onClick={() => onNavigate('TASKS')}
                    className="font-semibold text-[#D9962A] hover:underline"
                  >
                    View Approvals
                  </button>
                </div>
              </Card>
            </div>
          </div>

          {/* ROW 2: Tasks Summary (7 cols) + Messages Preview (5 cols) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
            {/* Tasks Summary (Desktop: col-span-7) */}
            <div className="lg:col-span-7">
              <Card className="h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3.5 border-b border-[#E5E4E1] mb-4">
                    <div className="flex items-center space-x-2.5">
                      <span className="p-1.5 rounded-lg text-white" style={{ backgroundColor: ENGUERRA_COLORS.tasks }}>
                        <CheckSquare className="w-4 h-4" />
                      </span>
                      <div>
                        <h2 className="text-base font-bold text-[#1C1E21]">Tasks Summary</h2>
                        <p className="text-[11px] text-[#5B6169]">Active family chores and homework</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setQuickAddTab('TASK');
                          setIsQuickAddOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-[#5B6169] hover:text-[#1C1E21] hover:bg-[#F7F6F4] transition-colors"
                        title="Add Task"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onNavigate('TASKS')}
                        className="text-xs font-semibold text-[#3F9D68] hover:underline flex items-center space-x-0.5"
                      >
                        <span>All Tasks</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {todaysTasks.length === 0 ? (
                    <div className="py-8 text-center text-[#5B6169]">
                      <CheckCircle2 className="w-8 h-8 text-[#3F9D68] mx-auto mb-2" />
                      <p className="text-sm font-semibold text-[#1C1E21]">No pending tasks</p>
                      <p className="text-xs text-[#8A8F98] mt-1">All family chores have been finished!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {todaysTasks.map(task => {
                        const assignedMember = members.find(m => m.Member_ID === task.Assigned_To);
                        const isDone = task.Status === 'COMPLETED' || task.Status === 'APPROVED';

                        return (
                          <div
                            key={task.Task_ID}
                            onClick={() => handleToggleTask(task)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isDone
                                ? 'bg-[#F7F6F4]/60 border-[#E5E4E1] opacity-75'
                                : 'bg-white hover:bg-[#F7F6F4] border-[#E5E4E1] shadow-xs'
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <button
                                type="button"
                                className="shrink-0 text-stone-400 hover:text-[#3F9D68] transition-colors"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleToggleTask(task);
                                }}
                              >
                                {isDone ? (
                                  <CheckCircle2 className="w-5 h-5 text-[#3F9D68]" />
                                ) : (
                                  <Circle className="w-5 h-5 text-[#8A8F98]" />
                                )}
                              </button>

                              <div className="min-w-0">
                                <span className={`text-xs font-bold block truncate ${isDone ? 'line-through text-[#8A8F98]' : 'text-[#1C1E21]'}`}>
                                  {task.Title}
                                </span>
                                <div className="flex items-center space-x-2 text-[10px] text-[#5B6169] mt-0.5">
                                  <span className="capitalize">{task.Category.toLowerCase()}</span>
                                  <span>•</span>
                                  <span className={task.Priority === 'HIGH' ? 'text-amber-700 font-bold' : ''}>
                                    {task.Priority} priority
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center space-x-2">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-[#3F9D68]">
                                +{task.Points || 10}★
                              </span>
                              {assignedMember && (
                                <FamilyAvatar
                                  member={assignedMember}
                                  size="xs"
                                  shape="squircle"
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#E5E4E1]/80 flex items-center justify-between text-xs text-[#8A8F98]">
                  <span>Tap checkbox to mark completed</span>
                  <button
                    onClick={() => onNavigate('TASKS')}
                    className="font-semibold text-[#3F9D68] hover:underline"
                  >
                    Open Chores & Approvals
                  </button>
                </div>
              </Card>
            </div>

            {/* Messages Preview (Desktop: col-span-5) */}
            <div className="lg:col-span-5">
              <Card className="h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3.5 border-b border-[#E5E4E1] mb-4">
                    <div className="flex items-center space-x-2.5">
                      <span className="p-1.5 rounded-lg text-white" style={{ backgroundColor: ENGUERRA_COLORS.messages }}>
                        <MessageSquare className="w-4 h-4" />
                      </span>
                      <div>
                        <h2 className="text-base font-bold text-[#1C1E21]">Messages Preview</h2>
                        <p className="text-[11px] text-[#5B6169]">Latest family communication</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('CHAT')}
                      className="text-xs font-semibold text-[#3A80DE] hover:underline flex items-center space-x-0.5"
                    >
                      <span>Open Chat</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Primary Family Message Snippet */}
                  {mostRecentMessage ? (
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-2xl bg-[#F7F6F4] border border-[#E5E4E1]">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {recentMessageSender && (
                              <FamilyAvatar
                                member={recentMessageSender}
                                size="xs"
                                shape="squircle"
                              />
                            )}
                            <span className="text-xs font-bold text-[#1C1E21]">
                              {recentMessageSender?.First_Name || 'Family'}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#8A8F98]">
                            {new Date(mostRecentMessage.Created_At).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-[#1C1E21] leading-relaxed">
                          &ldquo;{mostRecentMessage.Content}&rdquo;
                        </p>
                      </div>

                      {/* Inline Quick Reply Field */}
                      <form onSubmit={handleSendQuickReply} className="flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder="Quick reply to family..."
                          value={quickReplyText}
                          onChange={e => setQuickReplyText(e.target.value)}
                          className="flex-1 bg-white border border-[#E5E4E1] focus:border-[#3A80DE] focus:outline-hidden text-xs rounded-xl px-3 py-2 text-[#1C1E21] placeholder:text-[#8A8F98] shadow-xs"
                        />
                        <button
                          type="submit"
                          disabled={isSendingReply || !quickReplyText.trim()}
                          className="p-2 rounded-xl bg-[#3A80DE] hover:bg-[#2F6BBE] text-white disabled:opacity-40 transition-all shrink-0"
                          title="Send Message"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-[#5B6169]">
                      <MessageSquare className="w-8 h-8 text-[#8A8F98] mx-auto mb-2" />
                      <p className="text-sm font-semibold text-[#1C1E21]">No messages yet</p>
                      <p className="text-xs text-[#8A8F98] mt-1">Start a conversation in Family Chat.</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#E5E4E1]/80 flex items-center justify-between text-xs text-[#8A8F98]">
                  <span>Enguerra family group thread active</span>
                  <button
                    onClick={() => onNavigate('CHAT')}
                    className="font-semibold text-[#3A80DE] hover:underline"
                  >
                    View All Threads
                  </button>
                </div>
              </Card>
            </div>
          </div>

          {/* ROW 3: Shopping Summary (5 cols) + Kids Progress (7 cols) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
            {/* Shopping Summary (Desktop: col-span-5) */}
            <div className="lg:col-span-5">
              <Card className="h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3.5 border-b border-[#E5E4E1] mb-4">
                    <div className="flex items-center space-x-2.5">
                      <span className="p-1.5 rounded-lg text-white" style={{ backgroundColor: ENGUERRA_COLORS.shopping }}>
                        <ShoppingCart className="w-4 h-4" />
                      </span>
                      <div>
                        <h2 className="text-base font-bold text-[#1C1E21]">Shopping Summary</h2>
                        <p className="text-[11px] text-[#5B6169]">Groceries & essentials needed</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('LISTS')}
                      className="text-xs font-semibold text-[#D9962A] hover:underline flex items-center space-x-0.5"
                    >
                      <span>View Lists</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Fast Add Inline Input */}
                  <form onSubmit={handleQuickAddShopping} className="flex items-center space-x-2 mb-3">
                    <input
                      type="text"
                      placeholder="+ Quick add grocery item..."
                      value={quickShoppingText}
                      onChange={e => setQuickShoppingText(e.target.value)}
                      className="flex-1 bg-white border border-[#E5E4E1] focus:border-[#D9962A] focus:outline-hidden text-xs rounded-xl px-3 py-1.5 text-[#1C1E21] placeholder:text-[#8A8F98] shadow-xs"
                    />
                    <button
                      type="submit"
                      disabled={isAddingShopping || !quickShoppingText.trim()}
                      className="px-2.5 py-1.5 rounded-xl bg-[#D9962A] hover:bg-[#C28522] text-white text-xs font-bold disabled:opacity-40 transition-all shrink-0"
                    >
                      Add
                    </button>
                  </form>

                  {sortedShoppingItems.length === 0 ? (
                    <div className="py-6 text-center text-[#5B6169]">
                      <p className="text-xs font-semibold text-[#1C1E21]">Pantry is fully stocked</p>
                      <p className="text-[11px] text-[#8A8F98] mt-0.5">No grocery items pending purchase.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {sortedShoppingItems.map(item => (
                        <div
                          key={item.Item_ID}
                          onClick={() => handleToggleShoppingItem(item)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                            item.Completed
                              ? 'bg-[#F7F6F4]/50 border-[#E5E4E1] opacity-60 line-through text-[#8A8F98]'
                              : 'bg-white hover:bg-[#F7F6F4] border-[#E5E4E1] text-[#1C1E21]'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <button
                              type="button"
                              className="shrink-0"
                              onClick={e => {
                                e.stopPropagation();
                                handleToggleShoppingItem(item);
                              }}
                            >
                              {item.Completed ? (
                                <CheckCircle2 className="w-4 h-4 text-[#3F9D68]" />
                              ) : (
                                <Circle className="w-4 h-4 text-[#8A8F98]" />
                              )}
                            </button>
                            <span className="truncate">{item.Title}</span>
                          </div>
                          {item.Quantity && (
                            <span className="text-[10px] text-[#8A8F98] bg-[#F7F6F4] px-1.5 py-0.5 rounded shrink-0">
                              {item.Quantity}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#E5E4E1]/80 flex items-center justify-between text-xs text-[#8A8F98]">
                  <span>{uncompletedShoppingCount} items remaining</span>
                  <button
                    onClick={() => onNavigate('LISTS')}
                    className="font-semibold text-[#D9962A] hover:underline"
                  >
                    Open All Lists
                  </button>
                </div>
              </Card>
            </div>

            {/* Kids Progress (Desktop: col-span-7) */}
            <div className="lg:col-span-7">
              <Card className="h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3.5 border-b border-[#E5E4E1] mb-4">
                    <div className="flex items-center space-x-2.5">
                      <span className="p-1.5 rounded-lg text-white" style={{ backgroundColor: ENGUERRA_COLORS.family }}>
                        <Award className="w-4 h-4" />
                      </span>
                      <div>
                        <h2 className="text-base font-bold text-[#1C1E21]">Kids Progress</h2>
                        <p className="text-[11px] text-[#5B6169]">Daily routine completion & star rewards</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#3F9D68]">
                      3 Active Children
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {kidsProgressData.map(({ member: child, totalTasks, completedTasks, percentage, points }) => (
                      <div
                        key={child.Member_ID}
                        className="p-3.5 rounded-xl bg-[#F7F6F4]/70 border border-[#E5E4E1] flex flex-col space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <FamilyAvatar
                              member={child}
                              size="sm"
                              shape="squircle"
                            />
                            <div>
                              <div className="text-xs font-bold text-[#1C1E21]">{child.First_Name}</div>
                              <div className="text-[10px] text-[#5B6169]">
                                {completedTasks}/{totalTasks} missions completed
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center space-x-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              <span>{points} Stars</span>
                            </span>
                            <span className="text-xs font-bold text-[#1C1E21]">{percentage}%</span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-[#E5E4E1] h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: child.Color || ENGUERRA_COLORS.tasks,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E5E4E1]/80 flex items-center justify-between text-xs text-[#8A8F98]">
                  <span>Stars translate to weekly rewards in Kids Hub</span>
                  <button
                    onClick={() => onNavigate('TASKS')}
                    className="font-semibold text-[#E16F7C] hover:underline"
                  >
                    Manage Chores
                  </button>
                </div>
              </Card>
            </div>
          </div>

          {/* ROW 4: Next 7 Days (7 cols) + Family At Home (5 cols) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
            {/* Next 7 Days (Desktop: col-span-7) */}
            <div className="lg:col-span-7">
              <Card className="h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3.5 border-b border-[#E5E4E1] mb-4">
                    <div className="flex items-center space-x-2.5">
                      <span className="p-1.5 rounded-lg text-white" style={{ backgroundColor: ENGUERRA_COLORS.calendar }}>
                        <Clock className="w-4 h-4" />
                      </span>
                      <div>
                        <h2 className="text-base font-bold text-[#1C1E21]">Next 7 Days</h2>
                        <p className="text-[11px] text-[#5B6169]">Rolling weekly horizon and upcoming classes</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('CALENDAR')}
                      className="text-xs font-semibold text-[#7A5AF8] hover:underline flex items-center space-x-0.5"
                    >
                      <span>Agenda</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {next7DaysAgenda.map((day, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-[#F7F6F4]/50 border border-[#E5E4E1] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-[#1C1E21] min-w-[75px]">{day.label}</span>
                          {day.events.length > 0 ? (
                            <div className="flex items-center space-x-2">
                              <span className="text-[11px] text-[#1C1E21] truncate max-w-[200px]">
                                {day.events[0].Title}
                              </span>
                              {day.events.length > 1 && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white border border-[#E5E4E1] text-[#5B6169]">
                                  +{day.events.length - 1} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#8A8F98]">No commitments</span>
                          )}
                        </div>

                        {day.events.length > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7A5AF8]/10 text-[#7A5AF8]">
                            {day.events.length} event{day.events.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E5E4E1]/80 flex items-center justify-between text-xs text-[#8A8F98]">
                  <span>Syncs directly with Google Sheets calendar tab</span>
                  <button
                    onClick={() => onNavigate('CALENDAR')}
                    className="font-semibold text-[#7A5AF8] hover:underline"
                  >
                    View Month
                  </button>
                </div>
              </Card>
            </div>

            {/* Family At Home (Desktop: col-span-5) */}
            <div className="lg:col-span-5">
              <Card className="h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3.5 border-b border-[#E5E4E1] mb-4">
                    <div className="flex items-center space-x-2.5">
                      <span className="p-1.5 rounded-lg text-white" style={{ backgroundColor: ENGUERRA_COLORS.family }}>
                        <Users className="w-4 h-4" />
                      </span>
                      <div>
                        <h2 className="text-base font-bold text-[#1C1E21]">Family At Home</h2>
                        <p className="text-[11px] text-[#5B6169]">Member presence & activity pulse</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#3F9D68]">
                      All Connected
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {members.map(m => {
                      const isCurrent = m.Member_ID === currentMember?.Member_ID;
                      let memberStatus = 'At Home';
                      if (m.First_Name === 'Amber') memberStatus = '5th Grade • Homework Mode';
                      else if (m.First_Name === 'Alexa') memberStatus = '2nd Grade • Reading';
                      else if (m.First_Name === 'Adine') memberStatus = 'Playroom & Toddler Care';
                      else if (m.Role === 'OWNER') memberStatus = 'Parent Administrator (Active)';
                      else if (m.Role === 'ADMIN') memberStatus = 'Parent Administrator';

                      return (
                        <div
                          key={m.Member_ID}
                          className="p-2.5 rounded-xl bg-white border border-[#E5E4E1] flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <FamilyAvatar
                              member={m}
                              size="sm"
                              shape="squircle"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-xs font-bold text-[#1C1E21] truncate">{m.First_Name}</span>
                                {isCurrent && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-[#5B6169] truncate">{memberStatus}</div>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center space-x-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#3F9D68]" />
                            <span className="text-[10px] font-medium text-[#3F9D68]">Online</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E5E4E1]/80 flex items-center justify-between text-xs text-[#8A8F98]">
                  <span>Device nodes active in living room & mobile</span>
                  <button
                    onClick={() => onNavigate('PROFILES')}
                    className="font-semibold text-[#E16F7C] hover:underline"
                  >
                    Family Profiles
                  </button>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. DESKTOP OPTIONAL CONTEXT RAIL: Coming Up, Signed In, Quick Add         */}
        {/* ========================================================================= */}
        {showContextRail && (
          <aside
            id="today-context-rail"
            className="w-full xl:w-[290px] shrink-0 space-y-4"
          >
            {/* Context Rail Header & Close */}
            <div className="flex items-center justify-between pb-1 text-xs text-[#5B6169]">
              <span className="font-bold text-[#1C1E21] uppercase tracking-wider text-[10px]">Context Rail</span>
              <button
                onClick={() => setShowContextRail(false)}
                className="hover:text-[#1C1E21] text-[11px] underline"
              >
                Hide Rail
              </button>
            </div>

            {/* 1. Coming Up */}
            <Card className="p-4 space-y-2 border-[#7A5AF8]/30 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-[#7A5AF8]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Coming Up</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#7A5AF8]/10 text-[#7A5AF8]">
                  Next Event
                </span>
              </div>

              {nextImminentEvent ? (
                <div>
                  <h3 className="text-sm font-bold text-[#1C1E21]">{nextImminentEvent.Title}</h3>
                  <p className="text-xs text-[#5B6169] mt-0.5">
                    {nextImminentEvent.Start_Time ? new Date(nextImminentEvent.Start_Time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Today'}
                    {nextImminentEvent.Location && ` • ${nextImminentEvent.Location}`}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[#5B6169]">No upcoming events for the rest of the day.</p>
              )}
            </Card>

            {/* 2. Signed In Adult */}
            <Card className="p-4 space-y-3 bg-white">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#5B6169]">Signed In</div>
              <div className="flex items-center space-x-3">
                <FamilyAvatar
                  member={currentMember}
                  size="md"
                  shape="squircle"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#1C1E21] truncate">
                    {currentMember?.Display_Name || currentMember?.First_Name}
                  </div>
                  <div className="text-[10px] text-[#3F9D68] font-semibold flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>{currentMember?.Role} Privileges</span>
                  </div>
                </div>
              </div>

              {/* Quick switch to spouse/other adult */}
              {members.filter(m => m.Role === 'OWNER' || m.Role === 'ADMIN').length > 1 && (
                <div className="pt-2 border-t border-[#E5E4E1]">
                  <div className="text-[10px] text-[#8A8F98] mb-1.5">Switch Profile</div>
                  <div className="flex items-center space-x-1.5">
                    {members
                      .filter(m => (m.Role === 'OWNER' || m.Role === 'ADMIN') && m.Member_ID !== currentMember?.Member_ID)
                      .map(otherAdult => (
                        <button
                          key={otherAdult.Member_ID}
                          onClick={() => switchMember(otherAdult.Member_ID)}
                          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#F7F6F4] hover:bg-[#E5E4E1] text-xs font-medium text-[#1C1E21] transition-colors"
                        >
                          <UserCheck className="w-3 h-3 text-[#5B6169]" />
                          <span>{otherAdult.First_Name}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </Card>

            {/* 3. Quick Add Buttons */}
            <Card className="p-4 space-y-2.5 bg-white">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#5B6169]">Quick Add</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setQuickAddTab('EVENT');
                    setIsQuickAddOpen(true);
                  }}
                  className="p-2 rounded-xl bg-[#F7F6F4] hover:bg-[#E5E4E1] text-left transition-colors flex flex-col"
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-[#7A5AF8] mb-1" />
                  <span className="text-xs font-bold text-[#1C1E21]">+ Event</span>
                </button>

                <button
                  onClick={() => {
                    setQuickAddTab('TASK');
                    setIsQuickAddOpen(true);
                  }}
                  className="p-2 rounded-xl bg-[#F7F6F4] hover:bg-[#E5E4E1] text-left transition-colors flex flex-col"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-[#3F9D68] mb-1" />
                  <span className="text-xs font-bold text-[#1C1E21]">+ Task</span>
                </button>

                <button
                  onClick={() => {
                    setQuickAddTab('SHOPPING');
                    setIsQuickAddOpen(true);
                  }}
                  className="p-2 rounded-xl bg-[#F7F6F4] hover:bg-[#E5E4E1] text-left transition-colors flex flex-col"
                >
                  <ShoppingCart className="w-3.5 h-3.5 text-[#D9962A] mb-1" />
                  <span className="text-xs font-bold text-[#1C1E21]">+ Grocery</span>
                </button>

                <button
                  onClick={() => {
                    setQuickAddTab('MESSAGE');
                    setIsQuickAddOpen(true);
                  }}
                  className="p-2 rounded-xl bg-[#F7F6F4] hover:bg-[#E5E4E1] text-left transition-colors flex flex-col"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#3A80DE] mb-1" />
                  <span className="text-xs font-bold text-[#1C1E21]">+ Message</span>
                </button>
              </div>
            </Card>

            {/* Optional Discreet Debug Mode (Hidden unless explicitly enabled) */}
            <div className="pt-2">
              <button
                onClick={() => setIsDebugMode(!isDebugMode)}
                className="text-[10px] text-[#8A8F98] hover:text-[#5B6169] transition-colors"
              >
                {isDebugMode ? 'Disable Debug Cards' : 'Debug Options'}
              </button>

              {isDebugMode && (
                <div className="mt-2 p-3 rounded-xl bg-stone-900 text-stone-200 text-[10px] font-mono space-y-1">
                  <div className="font-bold text-amber-400">DEBUG CONSOLE (ACTIVE)</div>
                  <div>Events Count: {events.length}</div>
                  <div>Tasks Count: {tasks.length}</div>
                  <div>Lists Count: {lists.length}</div>
                  <div>Members: {members.length}</div>
                  <div>Session: {session?.sessionId?.slice(0, 8)}...</div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. QUICK ADD MODAL (Event, Task, Shopping Item, Message)                  */}
      {/* ========================================================================= */}
      <Dialog
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        title="Quick Add to Family OS"
        description="Write directly to private Google Sheets & Drive."
      >
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex rounded-xl bg-[#F7F6F4] p-1 border border-[#E5E4E1]">
            {(['TASK', 'EVENT', 'SHOPPING', 'MESSAGE'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setQuickAddTab(tab)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  quickAddTab === tab ? 'bg-white text-[#1C1E21] shadow-xs' : 'text-[#5B6169] hover:text-[#1C1E21]'
                }`}
              >
                {tab === 'TASK' && 'Task'}
                {tab === 'EVENT' && 'Event'}
                {tab === 'SHOPPING' && 'Grocery'}
                {tab === 'MESSAGE' && 'Message'}
              </button>
            ))}
          </div>

          <form onSubmit={handleModalQuickAddSubmit} className="space-y-3">
            {quickAddTab === 'TASK' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-[#1C1E21] mb-1">Chore or Task Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Practice violin 20 minutes"
                    value={formTaskTitle}
                    onChange={e => setFormTaskTitle(e.target.value)}
                    className="w-full bg-[#F7F6F4] border border-[#E5E4E1] focus:border-[#3F9D68] focus:bg-white text-xs rounded-xl px-3 py-2 text-[#1C1E21] outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1C1E21] mb-1">Assign To</label>
                    <select
                      value={formTaskAssignee}
                      onChange={e => setFormTaskAssignee(e.target.value)}
                      className="w-full bg-[#F7F6F4] border border-[#E5E4E1] text-xs rounded-xl px-2.5 py-2 text-[#1C1E21] outline-hidden"
                    >
                      {members.map(m => (
                        <option key={m.Member_ID} value={m.Member_ID}>
                          {m.First_Name} ({m.Role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1E21] mb-1">Star Points</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formTaskPoints}
                      onChange={e => setFormTaskPoints(Number(e.target.value))}
                      className="w-full bg-[#F7F6F4] border border-[#E5E4E1] text-xs rounded-xl px-3 py-2 text-[#1C1E21] outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1E21] mb-1">Category</label>
                  <select
                    value={formTaskCategory}
                    onChange={e => setFormTaskCategory(e.target.value as any)}
                    className="w-full bg-[#F7F6F4] border border-[#E5E4E1] text-xs rounded-xl px-2.5 py-2 text-[#1C1E21] outline-hidden"
                  >
                    <option value="CHORE">Chore</option>
                    <option value="HOMEWORK">Homework & Study</option>
                    <option value="ROUTINE">Daily Routine</option>
                  </select>
                </div>
              </>
            )}

            {quickAddTab === 'EVENT' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-[#1C1E21] mb-1">Event Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ballet Recital / Soccer Game"
                    value={formEventTitle}
                    onChange={e => setFormEventTitle(e.target.value)}
                    className="w-full bg-[#F7F6F4] border border-[#E5E4E1] focus:border-[#7A5AF8] focus:bg-white text-xs rounded-xl px-3 py-2 text-[#1C1E21] outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1C1E21] mb-1">Date</label>
                    <input
                      type="date"
                      value={formEventDate}
                      onChange={e => setFormEventDate(e.target.value)}
                      className="w-full bg-[#F7F6F4] border border-[#E5E4E1] text-xs rounded-xl px-2.5 py-2 text-[#1C1E21] outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1E21] mb-1">Start Time</label>
                    <input
                      type="time"
                      value={formEventTime}
                      onChange={e => setFormEventTime(e.target.value)}
                      className="w-full bg-[#F7F6F4] border border-[#E5E4E1] text-xs rounded-xl px-2.5 py-2 text-[#1C1E21] outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1E21] mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Upper West Side Studio"
                    value={formEventLocation}
                    onChange={e => setFormEventLocation(e.target.value)}
                    className="w-full bg-[#F7F6F4] border border-[#E5E4E1] text-xs rounded-xl px-3 py-2 text-[#1C1E21] outline-hidden"
                  />
                </div>
              </>
            )}

            {quickAddTab === 'SHOPPING' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-[#1C1E21] mb-1">Grocery Item Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Organic Almond Milk"
                    value={formShoppingTitle}
                    onChange={e => setFormShoppingTitle(e.target.value)}
                    className="w-full bg-[#F7F6F4] border border-[#E5E4E1] focus:border-[#D9962A] focus:bg-white text-xs rounded-xl px-3 py-2 text-[#1C1E21] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1E21] mb-1">Quantity</label>
                  <input
                    type="text"
                    placeholder="e.g. 2 cartons"
                    value={formShoppingQty}
                    onChange={e => setFormShoppingQty(e.target.value)}
                    className="w-full bg-[#F7F6F4] border border-[#E5E4E1] text-xs rounded-xl px-3 py-2 text-[#1C1E21] outline-hidden"
                  />
                </div>
              </>
            )}

            {quickAddTab === 'MESSAGE' && (
              <div>
                <label className="block text-xs font-bold text-[#1C1E21] mb-1">Family Message</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Type a message to the Enguerra family thread..."
                  value={formMessageContent}
                  onChange={e => setFormMessageContent(e.target.value)}
                  className="w-full bg-[#F7F6F4] border border-[#E5E4E1] focus:border-[#3A80DE] focus:bg-white text-xs rounded-xl px-3 py-2 text-[#1C1E21] outline-hidden"
                />
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E5E4E1]">
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5B6169] hover:bg-[#F7F6F4] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#1C1E21] hover:bg-black transition-colors shadow-xs"
              >
                Add to Hub
              </button>
            </div>
          </form>
        </div>
      </Dialog>

      {/* ========================================================================= */}
      {/* 6. MORE SHEET (Drawer for extra modules on Mobile / launcher)            */}
      {/* ========================================================================= */}
      <Dialog
        isOpen={isMoreSheetOpen}
        onClose={() => setIsMoreSheetOpen(false)}
        title="More Family Modules"
        description="Access additional tools and operating system controls."
      >
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setIsMoreSheetOpen(false);
              onNavigate('PHOTOS');
            }}
            className="p-3 rounded-xl bg-[#F7F6F4] hover:bg-[#E5E4E1] text-left transition-colors flex flex-col space-y-1"
          >
            <Sparkles className="w-5 h-5 text-[#F28C4B]" />
            <span className="text-xs font-bold text-[#1C1E21]">Memories & Photos</span>
            <span className="text-[10px] text-[#5B6169]">Google Drive albums</span>
          </button>

          <button
            onClick={() => {
              setIsMoreSheetOpen(false);
              onNavigate('PROFILES');
            }}
            className="p-3 rounded-xl bg-[#F7F6F4] hover:bg-[#E5E4E1] text-left transition-colors flex flex-col space-y-1"
          >
            <Users className="w-5 h-5 text-[#E16F7C]" />
            <span className="text-xs font-bold text-[#1C1E21]">Family Profiles</span>
            <span className="text-[10px] text-[#5B6169]">Roles, PINs & avatars</span>
          </button>

          <button
            onClick={() => {
              setIsMoreSheetOpen(false);
              onNavigate('DIAGNOSTICS');
            }}
            className="p-3 rounded-xl bg-[#F7F6F4] hover:bg-[#E5E4E1] text-left transition-colors flex flex-col space-y-1"
          >
            <SlidersHorizontal className="w-5 h-5 text-[#74808C]" />
            <span className="text-xs font-bold text-[#1C1E21]">System Diagnostics</span>
            <span className="text-[10px] text-[#5B6169]">Sheets sync & storage</span>
          </button>

          <button
            onClick={() => {
              setIsMoreSheetOpen(false);
              setShowContextRail(true);
            }}
            className="p-3 rounded-xl bg-[#F7F6F4] hover:bg-[#E5E4E1] text-left transition-colors flex flex-col space-y-1"
          >
            <Compass className="w-5 h-5 text-[#245F83]" />
            <span className="text-xs font-bold text-[#1C1E21]">Context Rail</span>
            <span className="text-[10px] text-[#5B6169]">Show sidebar rail</span>
          </button>
        </div>
      </Dialog>
    </div>
  );
};
