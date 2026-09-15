import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ENGUERRA_COLORS } from '../../lib/tokens';
import { Card } from '../ui/Card';
import { FamilyAvatar } from '../ui/FamilyAvatar';
import { CalendarView } from '../modules/CalendarView';
import { TasksView } from '../modules/TasksView';
import { ListsView } from '../modules/ListsView';
import { ChatView } from '../modules/ChatView';
import { MediaGalleryView } from '../modules/MediaGalleryView';
import { DiagnosticsView } from '../modules/DiagnosticsView';
import { FamilyProfilesView } from '../modules/FamilyProfilesView';
import { TodayHomeView } from '../modules/TodayHomeView';
import { Dialog } from '../ui/Dialog';
import {
  LayoutDashboard,
  Calendar as CalendarIcon,
  CheckSquare,
  ShoppingCart,
  MessageSquare,
  Image as ImageIcon,
  Activity,
  Users,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Clock,
  Sparkles,
  AlertCircle,
  Bell,
  Search,
  Plus,
  MoreHorizontal
} from 'lucide-react';

export type AdultTab =
  | 'OVERVIEW'
  | 'CALENDAR'
  | 'TASKS'
  | 'LISTS'
  | 'CHAT'
  | 'PHOTOS'
  | 'PROFILES'
  | 'DIAGNOSTICS';

export const AdultAppShell: React.FC = () => {
  const { session, members, detectedType, deviceMode } = useAuth();
  const [activeTab, setActiveTab] = useState<AdultTab>('OVERVIEW');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showRightRail, setShowRightRail] = useState(true);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [isMobileQuickAddOpen, setIsMobileQuickAddOpen] = useState(false);

  // Quick Add Form States for Mobile
  const [qaTitle, setQaTitle] = useState('');
  const [qaType, setQaType] = useState<'TASK' | 'EVENT' | 'SHOPPING'>('TASK');
  const [qaAssignee, setQaAssignee] = useState(members[2]?.Member_ID || '');

  const currentMember = session?.member;
  const parentName = currentMember?.First_Name || 'Parent';

  // Responsive device viewport classifications:
  // MOBILE: < 768px
  // TABLET: 768px - 1023px
  // DESKTOP: >= 1024px
  const isMobile = deviceMode === 'MOBILE' || detectedType === 'MOBILE';
  const isTablet = (deviceMode === 'TABLET' || detectedType === 'TABLET') && !isMobile;
  const isDesktop = !isMobile && !isTablet;

  const navItems: { id: AdultTab; label: string; shortLabel: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'OVERVIEW', label: 'Overview', shortLabel: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'CALENDAR', label: 'Calendar', shortLabel: 'Calendar', icon: <CalendarIcon className="w-5 h-5" /> },
    { id: 'TASKS', label: 'Chores & Tasks', shortLabel: 'Tasks', icon: <CheckSquare className="w-5 h-5" /> },
    { id: 'LISTS', label: 'Lists & Groceries', shortLabel: 'Lists', icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'CHAT', label: 'Family Chat', shortLabel: 'Chat', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'PHOTOS', label: 'Memories', shortLabel: 'Photos', icon: <ImageIcon className="w-5 h-5" /> },
    { id: 'PROFILES', label: 'Family Profiles', shortLabel: 'Profiles', icon: <Users className="w-5 h-5" /> },
    { id: 'DIAGNOSTICS', label: 'System Diagnostics', shortLabel: 'System', icon: <Activity className="w-5 h-5" /> },
  ];

  // Primary mobile navigation items (5 bottom tabs)
  const mobilePrimaryTabs: AdultTab[] = ['OVERVIEW', 'CALENDAR', 'TASKS', 'LISTS', 'PROFILES'];

  return (
    <div className="w-full flex flex-col min-h-[calc(100vh-4rem)]">
      {/* ========================================================================= */}
      {/* MOBILE LAYOUT (< 768px): Adult Top Bar + Content + Adult Bottom Nav       */}
      {/* No primary sidebar drawer                                                 */}
      {/* ========================================================================= */}
      {isMobile && (
        <div className="flex-1 flex flex-col pb-20">
          {/* Adult Mobile Sub-Header / Top Bar */}
          <div className="flex items-center justify-between px-3 py-2.5 bg-white border-b border-stone-200 sticky top-16 z-30 shadow-xs">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-stone-900">
                {navItems.find(n => n.id === activeTab)?.label}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                Parent View
              </span>
            </div>

            {/* Quick module selector for remaining tabs */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setActiveTab('CHAT')}
                className={`p-1.5 rounded-lg text-xs font-semibold ${
                  activeTab === 'CHAT' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
                }`}
                title="Family Chat"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTab('PHOTOS')}
                className={`p-1.5 rounded-lg text-xs font-semibold ${
                  activeTab === 'PHOTOS' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
                }`}
                title="Memories"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTab('DIAGNOSTICS')}
                className={`p-1.5 rounded-lg text-xs font-semibold ${
                  activeTab === 'DIAGNOSTICS' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
                }`}
                title="Diagnostics"
              >
                <Activity className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Main Content View */}
          <div className="flex-1 p-3">
            {renderActiveView(activeTab, setActiveTab, currentMember)}
          </div>

          {/* Adult Mobile Bottom Navigation (Fixed touch bar, adult touch target >= 44px) */}
          <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5E4E1] px-2 py-1 flex items-center justify-around shadow-xs">
            {/* 1. Today */}
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[48px] py-1 px-2 rounded-xl transition-all ${
                activeTab === 'OVERVIEW' ? 'text-[#245F83] font-bold' : 'text-[#5B6169] hover:text-[#1C1E21]'
              }`}
            >
              <div className={`p-1 rounded-lg ${activeTab === 'OVERVIEW' ? 'bg-[#245F83]/10' : ''}`}>
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">Today</span>
            </button>

            {/* 2. Calendar */}
            <button
              onClick={() => setActiveTab('CALENDAR')}
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[48px] py-1 px-2 rounded-xl transition-all ${
                activeTab === 'CALENDAR' ? 'text-[#7A5AF8] font-bold' : 'text-[#5B6169] hover:text-[#1C1E21]'
              }`}
            >
              <div className={`p-1 rounded-lg ${activeTab === 'CALENDAR' ? 'bg-[#7A5AF8]/10' : ''}`}>
                <CalendarIcon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">Calendar</span>
            </button>

            {/* 3. Quick Add (Center elevated action) */}
            <button
              onClick={() => setIsMobileQuickAddOpen(true)}
              className="flex flex-col items-center justify-center -mt-3 min-h-[44px] min-w-[48px] transition-transform active:scale-95"
              aria-label="Quick Add"
            >
              <div className="w-11 h-11 rounded-full bg-[#1C1E21] text-white flex items-center justify-center shadow-md border-2 border-white hover:bg-black transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-[#1C1E21] mt-0.5">Quick Add</span>
            </button>

            {/* 4. Messages */}
            <button
              onClick={() => setActiveTab('CHAT')}
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[48px] py-1 px-2 rounded-xl transition-all ${
                activeTab === 'CHAT' ? 'text-[#3A80DE] font-bold' : 'text-[#5B6169] hover:text-[#1C1E21]'
              }`}
            >
              <div className={`p-1 rounded-lg ${activeTab === 'CHAT' ? 'bg-[#3A80DE]/10' : ''}`}>
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">Messages</span>
            </button>

            {/* 5. More */}
            <button
              onClick={() => setIsMobileMoreOpen(true)}
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[48px] py-1 px-2 rounded-xl transition-all ${
                ['TASKS', 'LISTS', 'PHOTOS', 'PROFILES', 'DIAGNOSTICS'].includes(activeTab)
                  ? 'text-[#74808C] font-bold'
                  : 'text-[#5B6169] hover:text-[#1C1E21]'
              }`}
            >
              <div className="p-1 rounded-lg">
                <MoreHorizontal className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">More</span>
            </button>
          </nav>

          {/* Mobile Quick Add Dialog */}
          <Dialog
            isOpen={isMobileQuickAddOpen}
            onClose={() => setIsMobileQuickAddOpen(false)}
            title="Quick Add to Family OS"
            description="Add task, event or grocery item to Google Sheets."
          >
            <div className="space-y-4">
              <div className="flex rounded-xl bg-[#F7F6F4] p-1 border border-[#E5E4E1]">
                <button
                  type="button"
                  onClick={() => setQaType('TASK')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    qaType === 'TASK' ? 'bg-white text-[#1C1E21] shadow-xs' : 'text-[#5B6169]'
                  }`}
                >
                  Task / Chore
                </button>
                <button
                  type="button"
                  onClick={() => setQaType('EVENT')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    qaType === 'EVENT' ? 'bg-white text-[#1C1E21] shadow-xs' : 'text-[#5B6169]'
                  }`}
                >
                  Event
                </button>
                <button
                  type="button"
                  onClick={() => setQaType('SHOPPING')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    qaType === 'SHOPPING' ? 'bg-white text-[#1C1E21] shadow-xs' : 'text-[#5B6169]'
                  }`}
                >
                  Grocery
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1E21] mb-1">
                  {qaType === 'TASK' && 'Chore or Task Name'}
                  {qaType === 'EVENT' && 'Event Title'}
                  {qaType === 'SHOPPING' && 'Grocery Item Name'}
                </label>
                <input
                  type="text"
                  placeholder={
                    qaType === 'TASK'
                      ? 'e.g. Clean bedroom & make bed'
                      : qaType === 'EVENT'
                      ? 'e.g. Soccer game in Central Park'
                      : 'e.g. Organic Almond Milk'
                  }
                  value={qaTitle}
                  onChange={e => setQaTitle(e.target.value)}
                  className="w-full bg-[#F7F6F4] border border-[#E5E4E1] focus:bg-white text-xs rounded-xl px-3 py-2 text-[#1C1E21] outline-hidden"
                />
              </div>

              {qaType === 'TASK' && (
                <div>
                  <label className="block text-xs font-bold text-[#1C1E21] mb-1">Assign to</label>
                  <select
                    value={qaAssignee}
                    onChange={e => setQaAssignee(e.target.value)}
                    className="w-full bg-[#F7F6F4] border border-[#E5E4E1] text-xs rounded-xl px-2.5 py-2 text-[#1C1E21] outline-hidden"
                  >
                    {members.map(m => (
                      <option key={m.Member_ID} value={m.Member_ID}>
                        {m.First_Name} ({m.Role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E5E4E1]">
                <button
                  type="button"
                  onClick={() => setIsMobileQuickAddOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5B6169] hover:bg-[#F7F6F4]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!qaTitle.trim()) return;
                    try {
                      if (qaType === 'TASK') {
                        const { api } = await import('../../lib/api');
                        await api.createTask({
                          Title: qaTitle.trim(),
                          Assigned_To: qaAssignee || members[2]?.Member_ID || members[0]?.Member_ID,
                          Points: 15,
                          Category: 'CHORE',
                          Due_Date: new Date().toISOString().slice(0, 10),
                          Visibility: 'FAMILY',
                        });
                      } else if (qaType === 'EVENT') {
                        const { api } = await import('../../lib/api');
                        const today = new Date().toISOString().slice(0, 10);
                        await api.createEvent({
                          Title: qaTitle.trim(),
                          Start_Time: `${today}T18:00:00.000Z`,
                          End_Time: `${today}T19:00:00.000Z`,
                          Location: 'Home',
                          Visibility: 'FAMILY',
                          Category: 'FAMILY',
                          Color: ENGUERRA_COLORS.calendar,
                        });
                      } else if (qaType === 'SHOPPING') {
                        const { api } = await import('../../lib/api');
                        const lists = await api.getLists();
                        const gList = lists.find(l => l.Category === 'GROCERY') || lists[0];
                        if (gList) {
                          await api.addListItem(gList.List_ID, qaTitle.trim(), '1');
                        }
                      }
                      setQaTitle('');
                      setIsMobileQuickAddOpen(false);
                      setActiveTab('OVERVIEW');
                    } catch (err) {
                      console.error('Quick add failed:', err);
                    }
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#1C1E21] hover:bg-black transition-colors"
                >
                  Save to Hub
                </button>
              </div>
            </div>
          </Dialog>

          {/* Mobile More Sheet Dialog */}
          <Dialog
            isOpen={isMobileMoreOpen}
            onClose={() => setIsMobileMoreOpen(false)}
            title="Enguerra Family Modules"
            description="Select a family application view to navigate."
          >
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setIsMobileMoreOpen(false);
                  setActiveTab('TASKS');
                }}
                className="p-3 rounded-xl bg-[#F7F6F4] hover:bg-[#E5E4E1] text-left transition-colors flex flex-col space-y-1"
              >
                <CheckSquare className="w-5 h-5 text-[#3F9D68]" />
                <span className="text-xs font-bold text-[#1C1E21]">Chores & Tasks</span>
                <span className="text-[10px] text-[#5B6169]">Stars & approvals</span>
              </button>

              <button
                onClick={() => {
                  setIsMobileMoreOpen(false);
                  setActiveTab('LISTS');
                }}
                className="p-3 rounded-xl bg-[#F7F6F4] hover:bg-[#E5E4E1] text-left transition-colors flex flex-col space-y-1"
              >
                <ShoppingCart className="w-5 h-5 text-[#D9962A]" />
                <span className="text-xs font-bold text-[#1C1E21]">Shopping Lists</span>
                <span className="text-[10px] text-[#5B6169]">Groceries & pantry</span>
              </button>

              <button
                onClick={() => {
                  setIsMobileMoreOpen(false);
                  setActiveTab('PROFILES');
                }}
                className="p-3 rounded-xl bg-[#F7F6F4] hover:bg-[#E5E4E1] text-left transition-colors flex flex-col space-y-1"
              >
                <Users className="w-5 h-5 text-[#E16F7C]" />
                <span className="text-xs font-bold text-[#1C1E21]">Family Profiles</span>
                <span className="text-[10px] text-[#5B6169]">Members & roles</span>
              </button>

              <button
                onClick={() => {
                  setIsMobileMoreOpen(false);
                  setActiveTab('PHOTOS');
                }}
                className="p-3 rounded-xl bg-[#F7F6F4] hover:bg-[#E5E4E1] text-left transition-colors flex flex-col space-y-1"
              >
                <ImageIcon className="w-5 h-5 text-[#F28C4B]" />
                <span className="text-xs font-bold text-[#1C1E21]">Memories</span>
                <span className="text-[10px] text-[#5B6169]">Google Drive albums</span>
              </button>

              <button
                onClick={() => {
                  setIsMobileMoreOpen(false);
                  setActiveTab('DIAGNOSTICS');
                }}
                className="p-3 rounded-xl bg-[#F7F6F4] hover:bg-[#E5E4E1] text-left transition-colors flex flex-col space-y-1 col-span-2"
              >
                <Activity className="w-5 h-5 text-[#74808C]" />
                <span className="text-xs font-bold text-[#1C1E21]">System Diagnostics</span>
                <span className="text-[10px] text-[#5B6169]">Google Sheets live status & sync</span>
              </button>
            </div>
          </Dialog>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TABLET LAYOUT (768px - 1023px): Persistent ~72px Navigation Rail         */}
      {/* Touch-first layout                                                        */}
      {/* ========================================================================= */}
      {isTablet && (
        <div className="flex-1 flex w-full">
          {/* Persistent Tablet Navigation Rail (~72px) */}
          <aside className="w-[72px] shrink-0 bg-white border-r border-stone-200 flex flex-col items-center py-4 space-y-2 sticky top-16 h-[calc(100vh-4rem)] z-20">
            {navItems.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={item.label}
                  className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all ${
                    isActive
                      ? 'bg-[#245F83] text-white shadow-xs'
                      : 'text-[#5B6169] hover:bg-[#F7F6F4] hover:text-[#1C1E21]'
                  }`}
                >
                  {item.icon}
                  <span className="text-[9px] font-semibold mt-0.5 leading-none">
                    {item.shortLabel}
                  </span>
                </button>
              );
            })}
          </aside>

          {/* Tablet Main Content Area */}
          <main className="flex-1 p-6 overflow-y-auto">
            {renderActiveView(activeTab, setActiveTab, currentMember)}
          </main>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DESKTOP LAYOUT (>= 1024px): 220-240px Sidebar (Collapsible to ~72px)     */}
      {/* Contextual right rail where appropriate                                   */}
      {/* ========================================================================= */}
      {isDesktop && (
        <div className="flex-1 flex w-full">
          {/* Desktop Left Sidebar: 220-240px or ~72px collapsed */}
          <aside
            className={`shrink-0 bg-white border-r border-stone-200 transition-all duration-200 flex flex-col sticky top-16 h-[calc(100vh-4rem)] z-20 ${
              isSidebarCollapsed ? 'w-[72px] items-center' : 'w-[230px]'
            }`}
          >
            {/* Sidebar Header & Toggle */}
            <div className={`p-4 border-b border-stone-100 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
              {!isSidebarCollapsed && (
                <div>
                  <div className="text-xs font-bold text-stone-900 tracking-tight">Parent Console</div>
                  <div className="text-[11px] text-stone-500">{parentName}&apos;s View</div>
                </div>
              )}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>

            {/* Navigation List */}
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
              {navItems.map(item => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={item.label}
                    className={`w-full flex items-center rounded-xl transition-all ${
                      isSidebarCollapsed ? 'justify-center h-12 w-12 mx-auto' : 'px-3 py-2.5 space-x-3'
                    } ${
                      isActive
                        ? 'bg-[#245F83] text-white font-semibold shadow-xs'
                        : 'text-[#5B6169] hover:bg-[#F7F6F4] hover:text-[#1C1E21]'
                    }`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!isSidebarCollapsed && (
                      <span className="text-xs tracking-tight">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Sidebar Footer Context */}
            {!isSidebarCollapsed && (
              <div className="p-3 border-t border-stone-100 bg-stone-50/70 m-2 rounded-xl text-[11px] text-stone-500">
                <div className="flex items-center space-x-1.5 font-bold text-stone-700 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Authority Node</span>
                </div>
                <div>Full Google Sheet write privileges active.</div>
              </div>
            )}
          </aside>

          {/* Desktop Main Content Workspace */}
          <main className="flex-1 p-6 overflow-y-auto min-w-0">
            {renderActiveView(activeTab, setActiveTab, currentMember)}
          </main>

          {/* Contextual Desktop Right Rail (Calendar / Tasks) */}
          {showRightRail && (activeTab === 'CALENDAR' || activeTab === 'TASKS') && (
            <aside className="w-[280px] shrink-0 border-l border-stone-200 bg-white/70 p-5 space-y-5 hidden xl:block sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Family Pulse</h3>
                <button
                  onClick={() => setShowRightRail(false)}
                  className="text-stone-400 hover:text-stone-600 text-xs"
                >
                  Hide
                </button>
              </div>

              {/* Members Quick Status */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Family Members</h4>
                <div className="space-y-2">
                  {members.map(m => (
                    <div key={m.Member_ID} className="flex items-center justify-between p-2 rounded-xl bg-stone-50 border border-stone-100">
                      <div className="flex items-center space-x-2">
                        <FamilyAvatar
                          member={m}
                          size="xs"
                          shape="squircle"
                          showBorder={false}
                        />
                        <div>
                          <div className="text-xs font-semibold text-stone-900">{m.First_Name}</div>
                          <div className="text-[10px] text-stone-500">{m.Role}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">Active</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Summary Card */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900">
                <div className="flex items-center space-x-1.5 text-xs font-bold mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>Family Tip</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Chores marked as completed by children show up in Chores & Approvals awaiting parent authorization.
                </p>
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
};

function renderActiveView(
  tab: AdultTab,
  setActiveTab: (t: AdultTab) => void,
  currentMember?: import('../../types').FamilyMember
) {
  switch (tab) {
    case 'OVERVIEW':
      return <TodayHomeView onNavigate={setActiveTab} />;
    case 'CALENDAR':
      return <CalendarView />;
    case 'TASKS':
      return <TasksView />;
    case 'LISTS':
      return <ListsView />;
    case 'CHAT':
      return <ChatView />;
    case 'PHOTOS':
      return <MediaGalleryView />;
    case 'PROFILES':
      return <FamilyProfilesView />;
    case 'DIAGNOSTICS':
      return <DiagnosticsView />;
    default:
      return null;
  }
}
