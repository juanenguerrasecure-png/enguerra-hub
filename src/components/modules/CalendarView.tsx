import React, { useState, useEffect } from 'react';
import { CalendarEvent, FamilyMember } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Plus,
  Users,
  Shield,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';

export const CalendarView: React.FC = () => {
  const { session, members } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('ALL');
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('10:00');
  const [newLoc, setNewLoc] = useState('');
  const [newVisibility, setNewVisibility] = useState<'FAMILY' | 'PARENTS_ONLY' | 'PRIVATE'>('FAMILY');
  const [assigned, setAssigned] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await api.getEvents();
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    setSubmitting(true);
    try {
      const startTime = `${newDate}T${newStart}:00.000Z`;
      const endTime = `${newDate}T${newEnd}:00.000Z`;

      await api.createEvent({
        Title: newTitle,
        Description: newDesc,
        Start_Time: startTime,
        End_Time: endTime,
        Location: newLoc,
        Assigned_Members: assigned.length > 0 ? assigned : [session?.member.Member_ID || ''],
        Visibility: newVisibility,
        Color: '#C2410C',
      });

      setIsNewEventModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewLoc('');
      fetchEvents();
    } catch (err) {
      console.error('Failed to create event:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await api.deleteEvent(id);
      fetchEvents();
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  const filteredEvents = events.filter(e => {
    if (selectedMemberFilter === 'ALL') return true;
    return e.Assigned_Members.includes(selectedMemberFilter);
  });

  const getMemberById = (id: string) => members.find(m => m.Member_ID === id);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-orange-700" />
            <span>Family Calendar</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Synchronized with Google Sheets • Role-authorized visibility
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Member Filter */}
          <div className="flex items-center space-x-2 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={selectedMemberFilter}
              onChange={e => setSelectedMemberFilter(e.target.value)}
              className="bg-transparent text-stone-700 font-medium focus:outline-none"
            >
              <option value="ALL">All Family Members</option>
              {members.map(m => (
                <option key={m.Member_ID} value={m.Member_ID}>
                  {m.Display_Name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsNewEventModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-orange-700 hover:bg-orange-800 active:bg-orange-900 text-white font-medium text-xs shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Events List / Agenda */}
      {loading ? (
        <div className="text-center py-12 text-stone-400 text-xs">Loading family schedule...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-stone-200">
          <CalendarIcon className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-stone-700">No scheduled events</p>
          <p className="text-xs text-stone-400 mt-1">Tap 'Add Event' to schedule family activities.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map(event => {
            const startDate = new Date(event.Start_Time);
            const endDate = new Date(event.End_Time);
            const isParentsOnly = event.Visibility === 'PARENTS_ONLY';

            return (
              <div
                key={event.Event_ID}
                className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between relative group"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200">
                        {event.Category}
                      </span>
                      {isParentsOnly && (
                        <span className="flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          <Shield className="w-3 h-3" />
                          <span>Parents Only</span>
                        </span>
                      )}
                    </div>

                    {session?.isParent && (
                      <button
                        onClick={() => handleDeleteEvent(event.Event_ID)}
                        className="text-stone-300 hover:text-rose-600 transition-colors p-1"
                        title="Delete Event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-stone-900 leading-snug">{event.Title}</h3>
                  {event.Description && (
                    <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">{event.Description}</p>
                  )}

                  <div className="mt-4 space-y-1.5 text-xs text-stone-500">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>
                        {startDate.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        •{' '}
                        {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {event.Location && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{event.Location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Assigned Member Avatars */}
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {event.Assigned_Members.map(memberId => {
                      const member = getMemberById(memberId);
                      if (!member) return null;
                      return (
                        <div
                          key={member.Member_ID}
                          className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                          style={{ backgroundColor: member.Color }}
                          title={member.Display_Name}
                        >
                          {member.First_Name.charAt(0)}
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-[11px] text-stone-400">Sheet v{event.Version}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Event Modal */}
      {isNewEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-900">Schedule Family Event</h3>
              <button
                onClick={() => setIsNewEventModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amber Soccer Practice, Adine Checkup"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Details, gear to bring, carpool notes..."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={newStart}
                    onChange={e => setNewStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={newEnd}
                    onChange={e => setNewEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g. Central Park East, Pediatrician Clinic"
                  value={newLoc}
                  onChange={e => setNewLoc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>

              {/* Assigned Members */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">Assigned Members</label>
                <div className="flex flex-wrap gap-2">
                  {members.map(m => {
                    const isSelected = assigned.includes(m.Member_ID);
                    return (
                      <button
                        type="button"
                        key={m.Member_ID}
                        onClick={() => {
                          setAssigned(prev =>
                            isSelected ? prev.filter(id => id !== m.Member_ID) : [...prev, m.Member_ID]
                          );
                        }}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          isSelected
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: m.Color }}
                        />
                        <span>{m.Display_Name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visibility (Only Parents can set PARENTS_ONLY) */}
              {session?.isParent && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Privacy & Visibility</label>
                  <select
                    value={newVisibility}
                    onChange={e => setNewVisibility(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-600"
                  >
                    <option value="FAMILY">Visible to Full Family & Hub</option>
                    <option value="PARENTS_ONLY">Parents Only (Restricted from Children & Public Hub)</option>
                    <option value="PRIVATE">Private to Creator</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsNewEventModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-orange-700 hover:bg-orange-800 text-white text-xs font-medium shadow-xs"
                >
                  {submitting ? 'Saving...' : 'Save to Sheets'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
