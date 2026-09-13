import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CalendarView } from '../modules/CalendarView';
import { TasksView } from '../modules/TasksView';
import { ListsView } from '../modules/ListsView';
import { ChatView } from '../modules/ChatView';
import { MediaGalleryView } from '../modules/MediaGalleryView';
import { DiagnosticsView } from '../modules/DiagnosticsView';
import { FamilyProfilesView } from '../modules/FamilyProfilesView';
import {
  LayoutDashboard,
  Calendar as CalendarIcon,
  CheckSquare,
  ShoppingCart,
  MessageSquare,
  Image as ImageIcon,
  Activity,
  ShieldCheck,
  Sparkles,
  Award,
  Users
} from 'lucide-react';

export const ParentShell: React.FC = () => {
  const { session, members } = useAuth();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CALENDAR' | 'TASKS' | 'LISTS' | 'CHAT' | 'PHOTOS' | 'PROFILES' | 'DIAGNOSTICS'>('OVERVIEW');

  const parentName = session?.member.First_Name || 'Parent';

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center space-x-1 overflow-x-auto bg-stone-100 p-1.5 rounded-2xl border border-stone-200">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'OVERVIEW'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('CALENDAR')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'CALENDAR'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Calendar</span>
        </button>

        <button
          onClick={() => setActiveTab('TASKS')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'TASKS'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Chores & Approvals</span>
        </button>

        <button
          onClick={() => setActiveTab('LISTS')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'LISTS'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Lists</span>
        </button>

        <button
          onClick={() => setActiveTab('CHAT')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'CHAT'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Family Chat</span>
        </button>

        <button
          onClick={() => setActiveTab('PHOTOS')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'PHOTOS'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Memories</span>
        </button>

        <button
          onClick={() => setActiveTab('PROFILES')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'PROFILES'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Users className="w-4 h-4 text-orange-700" />
          <span>Family Profiles</span>
        </button>

        <button
          onClick={() => setActiveTab('DIAGNOSTICS')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'DIAGNOSTICS'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Activity className="w-4 h-4 text-stone-600" />
          <span>Diagnostics</span>
        </button>
      </div>

      {/* Main Tab Render */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Welcome Card */}
          <div className="bg-gradient-to-r from-orange-900 via-orange-800 to-amber-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
            <div className="relative z-10 max-w-xl">
              <div className="flex items-center space-x-2 text-xs font-semibold text-orange-200 uppercase tracking-wider mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Parent Administrator Shell</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Good morning, {parentName}!
              </h2>
              <p className="text-sm text-orange-100 mt-2 leading-relaxed">
                Welcome to the Enguerra of NY family command center. All records are continuously synchronized with your authoritative Google Sheets and private Google Drive storage.
              </p>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => setActiveTab('TASKS')}
              className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-orange-600 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="p-2 rounded-xl bg-orange-100 text-orange-700">
                  <CheckSquare className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Chore Approvals
                </span>
              </div>
              <h3 className="text-base font-bold text-stone-900">Review Kid Chores</h3>
              <p className="text-xs text-stone-500 mt-1">
                Approve completed tasks for Amber, Alexa, and Adine to award family points.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('CALENDAR')}
              className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-orange-600 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <CalendarIcon className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Calendar
                </span>
              </div>
              <h3 className="text-base font-bold text-stone-900">Family Schedule</h3>
              <p className="text-xs text-stone-500 mt-1">
                Manage upcoming doctor appointments, school sports, and private parent events.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('PHOTOS')}
              className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-orange-600 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <ImageIcon className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Drive Storage
                </span>
              </div>
              <h3 className="text-base font-bold text-stone-900">Photo Memories</h3>
              <p className="text-xs text-stone-500 mt-1">
                Curate albums and select moments to display on the kitchen Family Hub.
              </p>
            </div>
            <div
              onClick={() => setActiveTab('PROFILES')}
              className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-orange-600 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="p-2 rounded-xl bg-orange-100 text-orange-700">
                  <Users className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                  OWNER Controls
                </span>
              </div>
              <h3 className="text-base font-bold text-stone-900">Family Profiles</h3>
              <p className="text-xs text-stone-500 mt-1">
                Edit member names, roles, birthdays, theme colors, and reset PINs with legacy parity.
              </p>
            </div>
          </div>

          {/* Embedded Views */}
          <div className="space-y-6">
            <TasksView />
          </div>
        </div>
      )}

      {activeTab === 'CALENDAR' && <CalendarView />}
      {activeTab === 'TASKS' && <TasksView />}
      {activeTab === 'LISTS' && <ListsView />}
      {activeTab === 'CHAT' && <ChatView />}
      {activeTab === 'PHOTOS' && <MediaGalleryView />}
      {activeTab === 'PROFILES' && <FamilyProfilesView />}
      {activeTab === 'DIAGNOSTICS' && <DiagnosticsView />}
    </div>
  );
};
