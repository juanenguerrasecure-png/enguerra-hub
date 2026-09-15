import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CalendarEvent, FamilyMember } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { FamilyAvatar } from '../ui/FamilyAvatar';
import { ContextualMemberChips } from './calendar/ContextualMemberChips';
import { EventEditorSheet } from './calendar/EventEditorSheet';
import {
  CalendarDay,
  CATEGORY_STYLES,
  formatToDateString,
  generateMonthGrid,
  eventOccursOnDate,
  formatEventTime,
  parseLocalDate
} from './calendar/calendarUtils';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Repeat,
  Shield,
  Trash2,
  Edit3,
  RefreshCw,
  CheckCircle2,
  Users,
  Grid,
  List,
  Filter,
  Sparkles,
  CalendarDays,
  Info
} from 'lucide-react';

export interface CalendarViewProps {
  variant?: 'STANDARD' | 'HUB';
  onBack?: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  variant = 'STANDARD',
  onBack,
}) => {
  const { session, members, deviceMode, detectedType } = useAuth();

  // Screen size detection for responsive rules
  const [windowWidth, setWindowWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200));
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute effective responsive layout
  const isHubMode = variant === 'HUB' || deviceMode === 'HUB';
  const isMobileLayout = !isHubMode && (deviceMode === 'MOBILE' || (windowWidth < 768 && deviceMode !== 'DESKTOP' && deviceMode !== 'TABLET'));
  const isTabletLayout = !isHubMode && !isMobileLayout && (deviceMode === 'TABLET' || (windowWidth >= 768 && windowWidth < 1100 && deviceMode !== 'DESKTOP'));
  const isDesktopLayout = !isHubMode && !isMobileLayout && !isTabletLayout;

  // Calendar State
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => formatToDateString(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(() => new Date());

  // Filters
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [desktopViewMode, setDesktopViewMode] = useState<'MONTH' | 'AGENDA'>('MONTH');

  // Event Editor Sheet State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editorDefaultDate, setEditorDefaultDate] = useState<string>(selectedDateStr);

  const fetchEvents = useCallback(async (isManualSync: boolean = false) => {
    try {
      if (isManualSync) setSyncing(true);
      else setLoading(true);

      const data = await api.getEvents();
      // Ensure data is array and filtered of soft-deleted
      const validEvents = (Array.isArray(data) ? data : []).filter(e => !e.Deleted_At);
      setEvents(validEvents);
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Current Month Navigation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleJumpToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(formatToDateString(today));
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      // Member filter
      if (selectedMemberFilter !== 'ALL') {
        const assigned = e.Assigned_Members || [];
        if (!assigned.includes(selectedMemberFilter)) return false;
      }
      // Category filter
      if (selectedCategoryFilter !== 'ALL') {
        if (e.Category !== selectedCategoryFilter) return false;
      }
      return true;
    });
  }, [events, selectedMemberFilter, selectedCategoryFilter]);

  // Event counts per member for contextual chips
  const memberEventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of members) {
      counts[m.Member_ID] = events.filter(e => (e.Assigned_Members || []).includes(m.Member_ID)).length;
    }
    return counts;
  }, [members, events]);

  // Generate Month Grid Days
  const monthGridDays = useMemo(() => {
    return generateMonthGrid(year, month, filteredEvents);
  }, [year, month, filteredEvents]);

  // Selected Day's Events
  const selectedDayEvents = useMemo(() => {
    return filteredEvents
      .filter(e => eventOccursOnDate(e, selectedDateStr))
      .sort((a, b) => new Date(a.Start_Time).getTime() - new Date(b.Start_Time).getTime());
  }, [filteredEvents, selectedDateStr]);

  // Today & Tomorrow Events (especially for Hub and quick glance)
  const todayStr = useMemo(() => formatToDateString(new Date()), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatToDateString(d);
  }, []);

  const todayEvents = useMemo(() => {
    return filteredEvents
      .filter(e => eventOccursOnDate(e, todayStr))
      .sort((a, b) => new Date(a.Start_Time).getTime() - new Date(b.Start_Time).getTime());
  }, [filteredEvents, todayStr]);

  const tomorrowEvents = useMemo(() => {
    return filteredEvents
      .filter(e => eventOccursOnDate(e, tomorrowStr))
      .sort((a, b) => new Date(a.Start_Time).getTime() - new Date(b.Start_Time).getTime());
  }, [filteredEvents, tomorrowStr]);

  // Event Handlers
  const handleOpenCreateModal = (targetDate?: string) => {
    setEditingEvent(null);
    setEditorDefaultDate(targetDate || selectedDateStr);
    setIsEditorOpen(true);
  };

  const handleOpenEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEditorDefaultDate(event.Start_Time.slice(0, 10));
    setIsEditorOpen(true);
  };

  const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
    if (editingEvent && editingEvent.Event_ID) {
      await api.updateEvent(editingEvent.Event_ID, eventData);
    } else {
      await api.createEvent(eventData);
    }
    await fetchEvents(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    await api.deleteEvent(eventId);
    await fetchEvents(true);
  };

  const getMemberById = (id: string) => members.find(m => m.Member_ID === id);

  // Selected date formatted display
  const selectedDateFormatted = useMemo(() => {
    const d = parseLocalDate(selectedDateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, [selectedDateStr]);

  // ===========================================================================
  // 1. HUB LAYOUT: Large Month / Calendar Panel + Today & Tomorrow Agenda
  // ===========================================================================
  if (isHubMode) {
    return (
      <div className="w-full flex flex-col space-y-6 animate-in fade-in duration-200">
        {/* Hub Header */}
        <div className="flex items-center justify-between bg-slate-900/80 p-5 rounded-[20px] border border-slate-800 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <CalendarIcon className="w-6 h-6 text-[#7A5AF8]" />
                <span>Family Calendar & Schedule</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Glanceable family timeline • Synchronized with Google Sheets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchEvents(true)}
              disabled={syncing}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 min-h-[44px]"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-[#7A5AF8]' : ''}`} />
              <span className="hidden sm:inline">Sync Sheets</span>
            </button>
            <button
              onClick={() => handleOpenCreateModal(todayStr)}
              className="px-5 py-2.5 rounded-xl bg-[#7A5AF8] hover:bg-[#6843EC] text-white font-bold text-sm shadow-md flex items-center gap-2 min-h-[56px]"
            >
              <Plus className="w-5 h-5" />
              <span>Add Event</span>
            </button>
          </div>
        </div>

        {/* Member filter chips */}
        <ContextualMemberChips
          members={members}
          selectedMemberId={selectedMemberFilter}
          onSelectMember={setSelectedMemberFilter}
          eventCounts={memberEventCounts}
          className="bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800"
        />

        {/* Large Grid + Agenda Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Large Month Calendar Panel (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900/80 rounded-[20px] p-6 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-white">
                    {monthName} {year}
                  </h3>
                  <span className="text-xs text-slate-400">Touch any day to view details</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevMonth}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleJumpToday}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white min-h-[44px]"
                  >
                    Today
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Day header */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 mb-2">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Month Cells */}
              <div className="grid grid-cols-7 gap-2">
                {monthGridDays.map(day => {
                  const isSelected = day.dateString === selectedDateStr;
                  const hasEvents = day.events.length > 0;

                  return (
                    <button
                      key={day.dateString}
                      onClick={() => setSelectedDateStr(day.dateString)}
                      className={`min-h-[64px] sm:min-h-[72px] p-2 rounded-xl flex flex-col justify-between text-left transition-all border ${
                        isSelected
                          ? 'bg-[#7A5AF8]/20 border-[#7A5AF8] ring-2 ring-[#7A5AF8]/30 text-white'
                          : day.isToday
                          ? 'bg-slate-800 border-blue-500 text-white'
                          : day.isCurrentMonth
                          ? 'bg-slate-800/60 border-slate-700/60 text-slate-200 hover:bg-slate-800'
                          : 'bg-slate-900/30 border-slate-800/30 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm font-bold ${
                            day.isToday ? 'px-1.5 py-0.5 rounded-md bg-blue-600 text-white' : ''
                          }`}
                        >
                          {day.dayNumber}
                        </span>
                        {hasEvents && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#7A5AF8] text-white font-black">
                            {day.events.length}
                          </span>
                        )}
                      </div>

                      {/* Event category indicator dots */}
                      {hasEvents && (
                        <div className="flex items-center gap-1 mt-1 overflow-hidden">
                          {day.events.slice(0, 3).map((ev, i) => (
                            <span
                              key={i}
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: ev.Color || '#7A5AF8' }}
                            />
                          ))}
                          {day.events.length > 3 && (
                            <span className="text-[9px] text-slate-400">+{day.events.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Today + Tomorrow Event Agenda (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* TODAY Panel */}
            <div className="bg-slate-900/80 rounded-[20px] p-6 border border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    Today’s Agenda
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>

              {todayEvents.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No events scheduled for today.
                </div>
              ) : (
                <div className="space-y-3">
                  {todayEvents.map(event => (
                    <div
                      key={event.Event_ID}
                      onClick={() => handleOpenEditModal(event)}
                      className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 transition-all cursor-pointer flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#7A5AF8]" />
                          <span>{formatEventTime(event.Start_Time)} - {formatEventTime(event.End_Time)}</span>
                        </span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: event.Color || '#7A5AF8' }}
                        >
                          {event.Category}
                        </span>
                      </div>
                      <div className="text-base font-bold text-white">{event.Title}</div>
                      {event.Location && (
                        <div className="text-xs text-slate-400 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span>{event.Location}</span>
                        </div>
                      )}
                      {event.Assigned_Members?.length > 0 && (
                        <div className="flex items-center gap-1.5 pt-1">
                          {event.Assigned_Members.map(mId => {
                            const mem = getMemberById(mId);
                            if (!mem) return null;
                            return (
                              <FamilyAvatar key={mId} member={mem} size="xs" shape="circle" />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TOMORROW Panel */}
            <div className="bg-slate-900/80 rounded-[20px] p-6 border border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-blue-400" />
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    Tomorrow’s Agenda
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  {(() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  })()}
                </span>
              </div>

              {tomorrowEvents.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">
                  No events scheduled for tomorrow.
                </div>
              ) : (
                <div className="space-y-3">
                  {tomorrowEvents.map(event => (
                    <div
                      key={event.Event_ID}
                      onClick={() => handleOpenEditModal(event)}
                      className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 hover:border-slate-600 transition-all cursor-pointer flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{formatEventTime(event.Start_Time)}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                          {event.Category}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-white">{event.Title}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <EventEditorSheet
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          initialEvent={editingEvent}
          defaultDate={editorDefaultDate}
          members={members}
          isMobile={false}
        />
      </div>
    );
  }

  // ===========================================================================
  // 2. MOBILE LAYOUT:
  // - Compact Month Calendar
  // - Selected-Day Agenda
  // - Family Filter Control (Contextual Member Chips)
  // - Bottom-Sheet Event Editor
  // ===========================================================================
  if (isMobileLayout) {
    return (
      <div className="w-full space-y-4 animate-in fade-in duration-200">
        {/* Mobile Header Bar */}
        <div className="flex items-center justify-between bg-white px-4 py-3.5 rounded-[16px] border border-[#E5E4E1] shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-[#1C1E21] tracking-tight flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#7A5AF8]" />
              <span>Calendar</span>
            </h2>
            <div className="text-[11px] text-[#5B6169] flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Google Sheets live sync</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchEvents(true)}
              disabled={syncing}
              className="p-2 rounded-xl text-[#5B6169] hover:text-[#1C1E21] hover:bg-stone-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Sync with Sheets"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-[#7A5AF8]' : ''}`} />
            </button>
            <button
              onClick={() => handleOpenCreateModal(selectedDateStr)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#7A5AF8] hover:bg-[#6843EC] active:bg-[#5833DC] text-white font-semibold text-xs shadow-xs min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>Event</span>
            </button>
          </div>
        </div>

        {/* Family Filter Control (Contextual Character Chips) */}
        <div className="bg-white p-2 rounded-[16px] border border-[#E5E4E1] shadow-xs">
          <ContextualMemberChips
            members={members}
            selectedMemberId={selectedMemberFilter}
            onSelectMember={setSelectedMemberFilter}
            eventCounts={memberEventCounts}
            compact={true}
          />
        </div>

        {/* Compact Month Calendar */}
        <div className="bg-white p-4 rounded-[16px] border border-[#E5E4E1] shadow-xs space-y-3">
          {/* Month Header with fast navigation */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1C1E21] tracking-tight">
              {monthName} {year}
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={handleJumpToday}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#7A5AF8] hover:bg-[#7A5AF8]/10"
              >
                Today
              </button>
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-[#5B6169] hover:text-[#1C1E21] hover:bg-stone-100"
                aria-label="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-[#5B6169] hover:text-[#1C1E21] hover:bg-stone-100"
                aria-label="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Compact Weekday row */}
          <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-[#8A8F98]">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Compact Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {monthGridDays.map(day => {
              const isSelected = day.dateString === selectedDateStr;
              const hasEvents = day.events.length > 0;

              return (
                <button
                  key={day.dateString}
                  onClick={() => setSelectedDateStr(day.dateString)}
                  className={`relative flex flex-col items-center justify-center py-2 rounded-xl transition-all min-h-[44px] ${
                    isSelected
                      ? 'bg-[#7A5AF8] text-white font-bold shadow-xs'
                      : day.isToday
                      ? 'bg-[#7A5AF8]/10 text-[#7A5AF8] font-bold border border-[#7A5AF8]/30'
                      : day.isCurrentMonth
                      ? 'text-[#1C1E21] hover:bg-stone-50'
                      : 'text-stone-300'
                  }`}
                >
                  <span className="text-xs">{day.dayNumber}</span>
                  {/* Event indicator dots */}
                  {hasEvents && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {day.events.slice(0, 3).map((ev, i) => (
                        <span
                          key={i}
                          className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : ''}`}
                          style={{
                            backgroundColor: isSelected ? '#FFFFFF' : ev.Color || '#7A5AF8',
                          }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected-Day Agenda */}
        <div className="bg-white p-4 rounded-[16px] border border-[#E5E4E1] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E4E1]">
            <div>
              <div className="text-xs font-bold text-[#1C1E21] flex items-center gap-1.5">
                <span>{selectedDateFormatted}</span>
                {selectedDateStr === todayStr && (
                  <span className="px-2 py-0.5 rounded-full bg-[#7A5AF8]/10 text-[#7A5AF8] font-extrabold text-[10px]">
                    Today
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#5B6169] mt-0.5">
                {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'event' : 'events'} scheduled
              </p>
            </div>

            <button
              onClick={() => handleOpenCreateModal(selectedDateStr)}
              className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#1C1E21] min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Add event for this day"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Agenda Event Cards */}
          {selectedDayEvents.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <CalendarIcon className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-xs font-semibold text-[#5B6169]">No events for this day</p>
              <button
                onClick={() => handleOpenCreateModal(selectedDateStr)}
                className="text-xs text-[#7A5AF8] font-bold hover:underline"
              >
                + Schedule an activity or event
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {selectedDayEvents.map(event => {
                const isRecurring = Boolean(event.Recurrence_Rule && event.Recurrence_Rule !== 'NONE');
                const isParentsOnly = event.Visibility === 'PARENTS_ONLY';
                const style = CATEGORY_STYLES[event.Category] || CATEGORY_STYLES.FAMILY;

                return (
                  <div
                    key={event.Event_ID}
                    onClick={() => handleOpenEditModal(event)}
                    className="p-3.5 rounded-xl border border-[#E5E4E1] hover:border-[#8A8F98] transition-all bg-stone-50/50 cursor-pointer flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${style.bg} ${style.text} ${style.border}`}
                        >
                          {event.Category}
                        </span>
                        {isRecurring && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                            <Repeat className="w-3 h-3" />
                            <span>Recurring</span>
                          </span>
                        )}
                        {isParentsOnly && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                            <Shield className="w-3 h-3" />
                            <span>Parents Only</span>
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-semibold text-[#5B6169] shrink-0">
                        {formatEventTime(event.Start_Time)}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-[#1C1E21] leading-snug">{event.Title}</h4>

                    {event.Description && (
                      <p className="text-xs text-[#5B6169] line-clamp-2 leading-relaxed">
                        {event.Description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 text-xs text-[#5B6169]">
                      <div className="flex items-center gap-1">
                        {event.Location && (
                          <div className="flex items-center gap-1 truncate max-w-[180px]">
                            <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span className="truncate">{event.Location}</span>
                          </div>
                        )}
                      </div>

                      {event.Assigned_Members?.length > 0 && (
                        <div className="flex items-center -space-x-1.5">
                          {event.Assigned_Members.map(mId => {
                            const member = getMemberById(mId);
                            if (!member) return null;
                            return (
                              <FamilyAvatar
                                key={mId}
                                member={member}
                                size="xs"
                                shape="circle"
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom-Sheet Event Editor */}
        <EventEditorSheet
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          initialEvent={editingEvent}
          defaultDate={editorDefaultDate}
          members={members}
          isMobile={true}
        />
      </div>
    );
  }

  // ===========================================================================
  // 3. TABLET LAYOUT: Month + Agenda Split
  // ===========================================================================
  if (isTabletLayout) {
    return (
      <div className="w-full space-y-5 animate-in fade-in duration-200">
        {/* Tablet Top Control Bar */}
        <div className="flex items-center justify-between bg-white p-5 rounded-[20px] border border-[#E5E4E1] shadow-xs">
          <div>
            <h2 className="text-xl font-bold text-[#1C1E21] tracking-tight flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#7A5AF8]" />
              <span>Family Calendar</span>
            </h2>
            <p className="text-xs text-[#5B6169] mt-0.5">
              Live Google Sheets Synchronization • Month & Agenda Split
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchEvents(true)}
              disabled={syncing}
              className="px-3.5 py-2 rounded-xl border border-[#E5E4E1] hover:bg-stone-50 text-xs font-semibold text-[#5B6169] flex items-center gap-1.5 min-h-[44px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-[#7A5AF8]' : ''}`} />
              <span>Sync</span>
            </button>
            <button
              onClick={() => handleOpenCreateModal(selectedDateStr)}
              className="px-4 py-2 rounded-xl bg-[#7A5AF8] hover:bg-[#6843EC] text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>New Event</span>
            </button>
          </div>
        </div>

        {/* Contextual Member Character Chips Filter */}
        <div className="bg-white p-3 rounded-[16px] border border-[#E5E4E1] shadow-xs">
          <ContextualMemberChips
            members={members}
            selectedMemberId={selectedMemberFilter}
            onSelectMember={setSelectedMemberFilter}
            eventCounts={memberEventCounts}
          />
        </div>

        {/* 2-Column Split: Left Month Calendar + Right Agenda */}
        <div className="grid grid-cols-12 gap-5 items-start">
          {/* Left: Month Calendar (7 cols) */}
          <div className="col-span-7 bg-white p-5 rounded-[20px] border border-[#E5E4E1] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1C1E21]">
                {monthName} {year}
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleJumpToday}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#7A5AF8] hover:bg-[#7A5AF8]/10"
                >
                  Today
                </button>
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg text-[#5B6169] hover:text-[#1C1E21] hover:bg-stone-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg text-[#5B6169] hover:text-[#1C1E21] hover:bg-stone-100"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-[#8A8F98]">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {monthGridDays.map(day => {
                const isSelected = day.dateString === selectedDateStr;
                const hasEvents = day.events.length > 0;

                return (
                  <button
                    key={day.dateString}
                    onClick={() => setSelectedDateStr(day.dateString)}
                    className={`min-h-[58px] p-2 rounded-xl flex flex-col justify-between text-left transition-all border ${
                      isSelected
                        ? 'bg-[#7A5AF8]/10 border-[#7A5AF8] ring-2 ring-[#7A5AF8]/20 font-bold'
                        : day.isToday
                        ? 'bg-[#1C1E21] text-white border-[#1C1E21]'
                        : day.isCurrentMonth
                        ? 'bg-white border-[#E5E4E1] hover:border-stone-400 text-[#1C1E21]'
                        : 'bg-stone-50/50 border-stone-100 text-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs">{day.dayNumber}</span>
                      {hasEvents && (
                        <span className="text-[10px] px-1 py-0.1 rounded-full bg-[#7A5AF8] text-white font-bold">
                          {day.events.length}
                        </span>
                      )}
                    </div>

                    {hasEvents && (
                      <div className="flex items-center gap-1 overflow-hidden mt-1">
                        {day.events.slice(0, 3).map((ev, idx) => (
                          <span
                            key={idx}
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: ev.Color || '#7A5AF8' }}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Day Agenda + Upcoming (5 cols) */}
          <div className="col-span-5 bg-white p-5 rounded-[20px] border border-[#E5E4E1] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E4E1]">
              <div>
                <h3 className="text-sm font-bold text-[#1C1E21]">{selectedDateFormatted}</h3>
                <span className="text-xs text-[#5B6169]">
                  {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'event' : 'events'}
                </span>
              </div>
              <button
                onClick={() => handleOpenCreateModal(selectedDateStr)}
                className="px-3 py-1.5 rounded-xl bg-[#7A5AF8] hover:bg-[#6843EC] text-white font-semibold text-xs flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {selectedDayEvents.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <CalendarIcon className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="text-xs font-semibold text-[#5B6169]">No events scheduled</p>
                <button
                  onClick={() => handleOpenCreateModal(selectedDateStr)}
                  className="text-xs text-[#7A5AF8] font-bold hover:underline"
                >
                  Schedule an event for this day
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {selectedDayEvents.map(event => (
                  <div
                    key={event.Event_ID}
                    onClick={() => handleOpenEditModal(event)}
                    className="p-3.5 rounded-xl border border-[#E5E4E1] hover:border-[#8A8F98] transition-all bg-white cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#7A5AF8]">
                        {formatEventTime(event.Start_Time)} - {formatEventTime(event.End_Time)}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                        {event.Category}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-[#1C1E21]">{event.Title}</div>
                    {event.Location && (
                      <div className="text-xs text-[#5B6169] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                        <span className="truncate">{event.Location}</span>
                      </div>
                    )}
                    {event.Assigned_Members?.length > 0 && (
                      <div className="flex items-center gap-1 pt-1">
                        {event.Assigned_Members.map(mId => {
                          const m = getMemberById(mId);
                          if (!m) return null;
                          return <FamilyAvatar key={mId} member={m} size="xs" shape="circle" />;
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <EventEditorSheet
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          initialEvent={editingEvent}
          defaultDate={editorDefaultDate}
          members={members}
          isMobile={false}
        />
      </div>
    );
  }

  // ===========================================================================
  // 4. DESKTOP LAYOUT:
  // - Sidebar (filters, mini jump, sync status, actions)
  // - Calendar Workspace (interactive month view & event chips)
  // - Selected-Day / Right Agenda Rail
  // ===========================================================================
  return (
    <div className="w-full space-y-5 animate-in fade-in duration-200">
      {/* Desktop Calendar Workspace Layout */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* ================================================================= */}
        {/* Left Sidebar (3 cols: ~260-280px)                                  */}
        {/* ================================================================= */}
        <div className="col-span-3 space-y-5">
          {/* Primary Action */}
          <button
            onClick={() => handleOpenCreateModal(selectedDateStr)}
            className="w-full py-3 px-4 rounded-xl bg-[#7A5AF8] hover:bg-[#6843EC] active:bg-[#5833DC] text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 min-h-[48px]"
          >
            <Plus className="w-5 h-5" />
            <span>Create New Event</span>
          </button>

          {/* Mini Calendar / Quick Date Jumper Card */}
          <div className="bg-white p-4 rounded-[16px] border border-[#E5E4E1] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#1C1E21]">
                {monthName} {year}
              </h4>
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1 rounded-md text-[#5B6169] hover:text-[#1C1E21] hover:bg-stone-100"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleJumpToday}
                  className="px-1.5 py-0.5 rounded text-[11px] font-bold text-[#7A5AF8] hover:bg-[#7A5AF8]/10"
                >
                  Today
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1 rounded-md text-[#5B6169] hover:text-[#1C1E21] hover:bg-stone-100"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-[#8A8F98]">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="py-0.5">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {monthGridDays.map(day => {
                const isSelected = day.dateString === selectedDateStr;
                const hasEvents = day.events.length > 0;

                return (
                  <button
                    key={day.dateString}
                    onClick={() => setSelectedDateStr(day.dateString)}
                    className={`h-7 w-full rounded-lg flex flex-col items-center justify-center text-[11px] font-medium transition-colors ${
                      isSelected
                        ? 'bg-[#7A5AF8] text-white font-bold'
                        : day.isToday
                        ? 'bg-[#7A5AF8]/10 text-[#7A5AF8] font-bold'
                        : day.isCurrentMonth
                        ? 'text-[#1C1E21] hover:bg-stone-100'
                        : 'text-stone-300'
                    }`}
                  >
                    <span>{day.dayNumber}</span>
                    {hasEvents && !isSelected && (
                      <span className="w-1 h-1 rounded-full bg-[#7A5AF8] -mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contextual Member Character Chips Filter Card */}
          <div className="bg-white p-4 rounded-[16px] border border-[#E5E4E1] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1C1E21] uppercase tracking-wider">
                Family Members
              </span>
              {selectedMemberFilter !== 'ALL' && (
                <button
                  onClick={() => setSelectedMemberFilter('ALL')}
                  className="text-[11px] text-[#7A5AF8] hover:underline font-semibold"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              {/* Universal All Family */}
              <button
                type="button"
                onClick={() => setSelectedMemberFilter('ALL')}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors min-h-[44px] ${
                  selectedMemberFilter === 'ALL'
                    ? 'bg-[#1C1E21] text-white font-bold shadow-xs'
                    : 'bg-stone-50 text-[#5B6169] hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span>All Family</span>
                </div>
                <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-white/20">
                  {events.length}
                </span>
              </button>

              {/* Individual Contextual Character Chips */}
              {members.map(member => {
                const isSelected = selectedMemberFilter === member.Member_ID;
                const count = memberEventCounts[member.Member_ID] || 0;
                const memberColor = member.Color || '#7A5AF8';

                return (
                  <button
                    key={member.Member_ID}
                    type="button"
                    onClick={() => setSelectedMemberFilter(member.Member_ID)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition-all min-h-[44px] ${
                      isSelected
                        ? 'bg-white text-[#1C1E21] font-bold border-2 shadow-xs'
                        : 'bg-white text-[#5B6169] border-[#E5E4E1] hover:bg-stone-50'
                    }`}
                    style={{
                      borderColor: isSelected ? memberColor : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <FamilyAvatar
                        member={member}
                        size="xs"
                        shape="circle"
                        showBorder={false}
                      />
                      <span>{member.Display_Name}</span>
                    </div>

                    {count > 0 && (
                      <span
                        className="text-[11px] px-1.5 py-0.2 rounded-full font-bold text-white"
                        style={{ backgroundColor: memberColor }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Filters */}
          <div className="bg-white p-4 rounded-[16px] border border-[#E5E4E1] shadow-xs space-y-2.5">
            <span className="text-xs font-bold text-[#1C1E21] uppercase tracking-wider block">
              Categories
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedCategoryFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategoryFilter === 'ALL'
                    ? 'bg-[#1C1E21] text-white font-bold'
                    : 'bg-stone-100 text-[#5B6169] hover:bg-stone-200'
                }`}
              >
                All
              </button>
              {Object.entries(CATEGORY_STYLES).map(([catKey, style]) => (
                <button
                  key={catKey}
                  onClick={() => setSelectedCategoryFilter(catKey)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border ${
                    selectedCategoryFilter === catKey
                      ? 'border-[#7A5AF8] bg-[#7A5AF8]/10 text-[#1C1E21] font-bold'
                      : 'border-[#E5E4E1] bg-white text-[#5B6169] hover:bg-stone-50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: style.dot }} />
                  <span>{style.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Google Sheets Live Sync Card */}
          <div className="bg-white p-4 rounded-[16px] border border-[#E5E4E1] shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-[#1C1E21]">Google Sheets Sync</span>
              </div>
              <button
                onClick={() => fetchEvents(true)}
                disabled={syncing}
                className="text-[11px] text-[#7A5AF8] hover:underline font-bold flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                <span>Sync Now</span>
              </button>
            </div>
            <p className="text-[11px] text-[#5B6169] leading-relaxed">
              Family calendar events are synchronized bidirectionally with the authoritative Google Sheets database.
            </p>
            <div className="text-[10px] text-[#8A8F98]">
              Last updated: {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* Center: Calendar Workspace (6 cols: Month Grid View)              */}
        {/* ================================================================= */}
        <div className="col-span-6 bg-white p-6 rounded-[20px] border border-[#E5E4E1] shadow-xs space-y-4">
          {/* Workspace Controls Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E4E1]">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-[#1C1E21] tracking-tight">
                {monthName} {year}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg text-[#5B6169] hover:text-[#1C1E21] hover:bg-stone-100"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleJumpToday}
                  className="px-3 py-1 rounded-lg text-xs font-bold text-[#7A5AF8] hover:bg-[#7A5AF8]/10"
                >
                  Today
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg text-[#5B6169] hover:text-[#1C1E21] hover:bg-stone-100"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-stone-100 p-1 rounded-xl">
              <button
                onClick={() => setDesktopViewMode('MONTH')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  desktopViewMode === 'MONTH'
                    ? 'bg-white text-[#1C1E21] shadow-xs'
                    : 'text-[#5B6169] hover:text-[#1C1E21]'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Month</span>
              </button>
              <button
                onClick={() => setDesktopViewMode('AGENDA')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  desktopViewMode === 'AGENDA'
                    ? 'bg-white text-[#1C1E21] shadow-xs'
                    : 'text-[#5B6169] hover:text-[#1C1E21]'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>All Events</span>
              </button>
            </div>
          </div>

          {/* MONTH GRID VIEW */}
          {desktopViewMode === 'MONTH' ? (
            <div className="space-y-1">
              {/* Day headers */}
              <div className="grid grid-cols-7 text-center text-xs font-bold text-[#8A8F98] py-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              {/* Month Grid */}
              <div className="grid grid-cols-7 gap-2">
                {monthGridDays.map(day => {
                  const isSelected = day.dateString === selectedDateStr;
                  const hasEvents = day.events.length > 0;

                  return (
                    <div
                      key={day.dateString}
                      onClick={() => setSelectedDateStr(day.dateString)}
                      className={`min-h-[96px] p-2 rounded-xl border flex flex-col justify-between transition-all cursor-pointer group ${
                        isSelected
                          ? 'border-[#7A5AF8] bg-[#7A5AF8]/5 ring-2 ring-[#7A5AF8]/20 shadow-xs'
                          : day.isToday
                          ? 'border-[#1C1E21] bg-stone-50/70 font-semibold'
                          : day.isCurrentMonth
                          ? 'border-[#E5E4E1] bg-white hover:border-stone-400 hover:shadow-xs'
                          : 'border-stone-100 bg-stone-50/40 opacity-40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${
                            day.isToday
                              ? 'w-5 h-5 rounded-full bg-[#1C1E21] text-white flex items-center justify-center'
                              : isSelected
                              ? 'text-[#7A5AF8]'
                              : 'text-[#1C1E21]'
                          }`}
                        >
                          {day.dayNumber}
                        </span>

                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleOpenCreateModal(day.dateString);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[#5B6169] hover:text-[#7A5AF8] hover:bg-[#7A5AF8]/10 transition-opacity"
                          title="Add event for this day"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Event Chips inside Day Cell */}
                      <div className="space-y-1 mt-1 overflow-hidden">
                        {day.events.slice(0, 2).map(ev => (
                          <div
                            key={ev.Event_ID}
                            onClick={e => {
                              e.stopPropagation();
                              handleOpenEditModal(ev);
                            }}
                            className="px-1.5 py-0.5 rounded text-[11px] font-semibold truncate flex items-center gap-1 hover:opacity-90 transition-opacity"
                            style={{
                              backgroundColor: `${ev.Color || '#7A5AF8'}1A`,
                              color: ev.Color || '#7A5AF8',
                              borderLeft: `2.5px solid ${ev.Color || '#7A5AF8'}`,
                            }}
                          >
                            <span className="truncate">{ev.Title}</span>
                          </div>
                        ))}
                        {day.events.length > 2 && (
                          <div className="text-[10px] text-[#5B6169] font-bold pl-1">
                            +{day.events.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* AGENDA / ALL EVENTS VIEW */
            <div className="space-y-3">
              {filteredEvents.length === 0 ? (
                <div className="py-12 text-center text-[#5B6169] text-xs">
                  No events found matching your filters.
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                  {filteredEvents.map(ev => {
                    const start = new Date(ev.Start_Time);
                    const style = CATEGORY_STYLES[ev.Category] || CATEGORY_STYLES.FAMILY;
                    return (
                      <div
                        key={ev.Event_ID}
                        onClick={() => handleOpenEditModal(ev)}
                        className="p-4 rounded-xl border border-[#E5E4E1] hover:border-[#8A8F98] transition-all bg-white cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-2.5 h-10 rounded-full"
                            style={{ backgroundColor: ev.Color || '#7A5AF8' }}
                          />
                          <div>
                            <div className="text-sm font-bold text-[#1C1E21]">{ev.Title}</div>
                            <div className="text-xs text-[#5B6169] flex items-center gap-2 mt-0.5">
                              <span>{start.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                              <span>•</span>
                              <span>{formatEventTime(ev.Start_Time)}</span>
                              {ev.Location && <span>• {ev.Location}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${style.bg} ${style.text} ${style.border} border`}
                          >
                            {ev.Category}
                          </span>
                          <div className="flex items-center -space-x-1.5">
                            {ev.Assigned_Members?.map(mId => {
                              const m = getMemberById(mId);
                              if (!m) return null;
                              return <FamilyAvatar key={mId} member={m} size="xs" shape="circle" />;
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* Right Rail: Selected-Day / Right Agenda Rail (3 cols: ~300-320px) */}
        {/* ================================================================= */}
        <div className="col-span-3 bg-white p-5 rounded-[20px] border border-[#E5E4E1] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E4E1]">
            <div>
              <div className="text-xs font-bold text-[#1C1E21] uppercase tracking-wider flex items-center gap-1.5">
                <span>Selected Day Agenda</span>
                {selectedDateStr === todayStr && (
                  <span className="px-2 py-0.5 rounded-full bg-[#7A5AF8]/10 text-[#7A5AF8] font-bold text-[10px]">
                    Today
                  </span>
                )}
              </div>
              <p className="text-xs text-[#5B6169] mt-0.5">{selectedDateFormatted}</p>
            </div>

            <button
              onClick={() => handleOpenCreateModal(selectedDateStr)}
              className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#1C1E21] min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Add event for this day"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {selectedDayEvents.length === 0 ? (
            <div className="py-10 text-center space-y-2 border border-dashed border-[#E5E4E1] rounded-2xl p-4">
              <CalendarIcon className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-xs font-semibold text-[#5B6169]">No events scheduled</p>
              <p className="text-[11px] text-[#8A8F98]">Enjoy free time or plan an activity</p>
              <button
                onClick={() => handleOpenCreateModal(selectedDateStr)}
                className="mt-2 inline-flex items-center gap-1 text-xs text-[#7A5AF8] font-bold hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Event for This Day</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
              {selectedDayEvents.map(event => {
                const isRecurring = Boolean(event.Recurrence_Rule && event.Recurrence_Rule !== 'NONE');
                const isParentsOnly = event.Visibility === 'PARENTS_ONLY';
                const style = CATEGORY_STYLES[event.Category] || CATEGORY_STYLES.FAMILY;

                return (
                  <div
                    key={event.Event_ID}
                    onClick={() => handleOpenEditModal(event)}
                    className="p-3.5 rounded-xl border border-[#E5E4E1] hover:border-[#8A8F98] transition-all bg-stone-50/40 cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#7A5AF8] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#7A5AF8]" />
                        <span>
                          {formatEventTime(event.Start_Time)} - {formatEventTime(event.End_Time)}
                        </span>
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text} border ${style.border}`}
                      >
                        {event.Category}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-[#1C1E21] leading-tight">{event.Title}</div>

                    {event.Description && (
                      <p className="text-xs text-[#5B6169] line-clamp-2 leading-relaxed">
                        {event.Description}
                      </p>
                    )}

                    {event.Location && (
                      <div className="text-xs text-[#5B6169] flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{event.Location}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                      <div className="flex items-center gap-1">
                        {isRecurring && (
                          <span
                            className="text-[10px] text-purple-700 font-semibold flex items-center gap-0.5"
                            title={`Recurrence: ${event.Recurrence_Rule}`}
                          >
                            <Repeat className="w-3 h-3" />
                            <span>Repeats</span>
                          </span>
                        )}
                        {isParentsOnly && (
                          <span className="text-[10px] text-rose-700 font-semibold flex items-center gap-0.5">
                            <Shield className="w-3 h-3" />
                            <span>Parents</span>
                          </span>
                        )}
                      </div>

                      {event.Assigned_Members?.length > 0 && (
                        <div className="flex items-center -space-x-1.5">
                          {event.Assigned_Members.map(mId => {
                            const member = getMemberById(mId);
                            if (!member) return null;
                            return (
                              <FamilyAvatar
                                key={mId}
                                member={member}
                                size="xs"
                                shape="circle"
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Event Editor Modal */}
      <EventEditorSheet
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        initialEvent={editingEvent}
        defaultDate={editorDefaultDate}
        members={members}
        isMobile={false}
      />
    </div>
  );
};
