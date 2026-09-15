import React, { useState, useEffect, useCallback } from 'react';
import { TaskItem, TaskResponsibility, TaskHistoryEntry, FamilyMember } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { CanonicalTaskStatus } from './tasks/taskConstants';
import { AdultMobileTasksView } from './tasks/AdultMobileTasksView';
import { AdultTabletTasksView } from './tasks/AdultTabletTasksView';
import { AdultDesktopTasksView } from './tasks/AdultDesktopTasksView';
import { KidsTaskPresentation } from './tasks/KidsTaskPresentation';
import { HubTaskModuleFocus } from './tasks/HubTaskModuleFocus';
import { TaskEditorModal } from './tasks/TaskEditorModal';
import { ResponsibilityEditorModal } from './tasks/ResponsibilityEditorModal';
import {
  Smartphone,
  Tablet,
  Monitor,
  Sparkles,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export type TaskViewPresentation = 'AUTO' | 'MOBILE' | 'TABLET' | 'DESKTOP' | 'KIDS';

export interface TasksViewProps {
  variant?: 'ADULT' | 'KIDS' | 'HUB';
  onBack?: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  variant = 'ADULT',
  onBack,
}) => {
  const { session, members, loading: authLoading, hubLocked, unlockHub, lockHub, openPinModal } = useAuth();

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [responsibilities, setResponsibilities] = useState<TaskResponsibility[]>([]);
  const [history, setHistory] = useState<TaskHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Layout mode
  const [presentationMode, setPresentationMode] = useState<TaskViewPresentation>('AUTO');
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  // Selected member filter
  const [selectedMemberId, setSelectedMemberId] = useState<string>('ALL');

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [isResponsibilityModalOpen, setIsResponsibilityModalOpen] = useState(false);
  const [editingResponsibility, setEditingResponsibility] = useState<TaskResponsibility | null>(null);

  // Resize listener
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentMember: FamilyMember = session?.member || members[0] || {
    Member_ID: 'MEM_DEFAULT',
    Family_ID: 'FAM_DEFAULT',
    First_Name: 'Parent',
    Last_Name: 'User',
    Display_Name: 'Parent',
    Role: 'OWNER',
    Color: '#164E35',
    Created_At: new Date().toISOString(),
    Updated_At: new Date().toISOString(),
  };

  const isChild = currentMember.Role === 'CHILD' || session?.isChild;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Server enforces child filtering automatically, but we also pass memberId
      const targetMemberId = isChild ? currentMember.Member_ID : undefined;
      const [tList, rList, hList] = await Promise.all([
        api.getTasks(targetMemberId),
        api.getResponsibilities(targetMemberId),
        api.getTaskHistory(undefined, targetMemberId),
      ]);

      setTasks(tList || []);
      setResponsibilities(rList || []);
      setHistory(hList || []);
    } catch (err: any) {
      console.error('Failed to load tasks data:', err);
      setError(err.message || 'Could not load chores & responsibilities');
    } finally {
      setLoading(false);
    }
  }, [isChild, currentMember.Member_ID]);

  useEffect(() => {
    if (!authLoading && session) {
      loadData();
    }
  }, [authLoading, session, loadData]);

  // Handle task status update
  const handleStatusUpdate = async (taskId: string, status: CanonicalTaskStatus, note?: string) => {
    try {
      await api.updateTaskStatus(taskId, status, note);
      // Refresh list to keep canonical server state authoritative
      await loadData();
    } catch (err: any) {
      console.error('Error updating task status:', err);
      alert(err.message || 'Failed to update task');
    }
  };

  // Handle complete responsibility occurrence
  const handleCompleteResponsibility = async (respId: string, dateStr: string) => {
    try {
      await api.completeResponsibilityOccurrence(respId, dateStr);
      await loadData();
    } catch (err: any) {
      console.error('Error completing responsibility occurrence:', err);
      alert(err.message || 'Failed to complete routine occurrence');
    }
  };

  // Handle save task
  const handleSaveTask = async (taskData: Partial<TaskItem>) => {
    if (editingTask) {
      await api.updateTask(editingTask.Task_ID, taskData);
    } else {
      await api.createTask({
        ...taskData,
        Created_By: currentMember.Member_ID,
      });
    }
    await loadData();
  };

  // Handle delete task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.deleteTask(taskId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    }
  };

  // Handle save recurring responsibility
  const handleSaveResponsibility = async (respData: Partial<TaskResponsibility>) => {
    if (editingResponsibility) {
      await api.updateResponsibility(editingResponsibility.Responsibility_ID, respData);
    } else {
      await api.createResponsibility(respData);
    }
    await loadData();
  };

  // Determine active view mode
  const effectiveMode: 'MOBILE' | 'TABLET' | 'DESKTOP' | 'KIDS' = (() => {
    if (variant === 'HUB') return 'DESKTOP';
    if (variant === 'KIDS' || isChild) return 'KIDS';
    if (presentationMode !== 'AUTO') return presentationMode;
    if (windowWidth < 768) return 'MOBILE';
    if (windowWidth < 1200) return 'TABLET';
    return 'DESKTOP';
  })();

  if (loading && tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-stone-400 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-700" />
        <p className="text-xs font-semibold">Loading family chores & responsibilities...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Layout Switcher for Parents (allows previewing all 4 views smoothly) */}
      {!isChild && variant !== 'HUB' && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1 text-xs text-stone-500">
            <span className="font-semibold text-stone-700">Display Layout:</span>
            <div className="inline-flex rounded-xl bg-stone-100 p-0.5 border border-stone-200">
              <button
                type="button"
                onClick={() => setPresentationMode('AUTO')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  presentationMode === 'AUTO'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Automatically adapt to screen size"
              >
                Auto ({windowWidth < 768 ? 'Mobile' : windowWidth < 1200 ? 'Tablet' : 'Desktop'})
              </button>
              <button
                type="button"
                onClick={() => setPresentationMode('MOBILE')}
                className={`p-1.5 rounded-lg transition-colors ${
                  presentationMode === 'MOBILE'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
                title="Adult Mobile View"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPresentationMode('TABLET')}
                className={`p-1.5 rounded-lg transition-colors ${
                  presentationMode === 'TABLET'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
                title="Adult Tablet View"
              >
                <Tablet className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPresentationMode('DESKTOP')}
                className={`p-1.5 rounded-lg transition-colors ${
                  presentationMode === 'DESKTOP'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
                title="Adult Desktop View"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPresentationMode('KIDS')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                  presentationMode === 'KIDS'
                    ? 'bg-amber-400 text-stone-950 shadow-xs'
                    : 'text-amber-700 hover:text-amber-900'
                }`}
                title="Kids Task Presentation Preview"
              >
                <Sparkles className="w-3 h-3" />
                <span>Kids View</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadData()}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            title="Refresh from Google Sheets"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadData()}
            className="font-bold underline hover:text-rose-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Render the appropriate view */}
      {variant === 'HUB' ? (
        <HubTaskModuleFocus
          tasks={tasks}
          responsibilities={responsibilities}
          members={members}
          currentMember={currentMember}
          hubLocked={hubLocked}
          onUnlockHub={unlockHub}
          onLockHub={lockHub}
          onOpenPinModal={openPinModal}
          onBack={onBack || (() => {})}
          onStatusUpdate={handleStatusUpdate}
          onCompleteResponsibility={handleCompleteResponsibility}
          onOpenNewTask={() => {
            setEditingTask(null);
            setIsTaskModalOpen(true);
          }}
          onOpenNewResponsibility={() => {
            setEditingResponsibility(null);
            setIsResponsibilityModalOpen(true);
          }}
        />
      ) : effectiveMode === 'KIDS' ? (
        <KidsTaskPresentation
          tasks={tasks}
          responsibilities={responsibilities}
          currentMember={currentMember}
          onStatusUpdate={handleStatusUpdate}
          onCompleteResponsibility={handleCompleteResponsibility}
        />
      ) : effectiveMode === 'MOBILE' ? (
        <AdultMobileTasksView
          tasks={tasks}
          responsibilities={responsibilities}
          members={members}
          currentMember={currentMember}
          onStatusUpdate={handleStatusUpdate}
          onCompleteResponsibility={handleCompleteResponsibility}
          onOpenNewTask={() => {
            setEditingTask(null);
            setIsTaskModalOpen(true);
          }}
          onOpenNewResponsibility={() => {
            setEditingResponsibility(null);
            setIsResponsibilityModalOpen(true);
          }}
          onEditTask={task => {
            setEditingTask(task);
            setIsTaskModalOpen(true);
          }}
          onDeleteTask={handleDeleteTask}
          selectedMemberId={selectedMemberId}
          onSelectMember={setSelectedMemberId}
        />
      ) : effectiveMode === 'TABLET' ? (
        <AdultTabletTasksView
          tasks={tasks}
          responsibilities={responsibilities}
          members={members}
          currentMember={currentMember}
          onStatusUpdate={handleStatusUpdate}
          onCompleteResponsibility={handleCompleteResponsibility}
          onOpenNewTask={() => {
            setEditingTask(null);
            setIsTaskModalOpen(true);
          }}
          onOpenNewResponsibility={() => {
            setEditingResponsibility(null);
            setIsResponsibilityModalOpen(true);
          }}
          onEditTask={task => {
            setEditingTask(task);
            setIsTaskModalOpen(true);
          }}
          onDeleteTask={handleDeleteTask}
          selectedMemberId={selectedMemberId}
          onSelectMember={setSelectedMemberId}
        />
      ) : (
        <AdultDesktopTasksView
          tasks={tasks}
          responsibilities={responsibilities}
          history={history}
          members={members}
          currentMember={currentMember}
          onStatusUpdate={handleStatusUpdate}
          onCompleteResponsibility={handleCompleteResponsibility}
          onOpenNewTask={() => {
            setEditingTask(null);
            setIsTaskModalOpen(true);
          }}
          onOpenNewResponsibility={() => {
            setEditingResponsibility(null);
            setIsResponsibilityModalOpen(true);
          }}
          onEditTask={task => {
            setEditingTask(task);
            setIsTaskModalOpen(true);
          }}
          onDeleteTask={handleDeleteTask}
          selectedMemberId={selectedMemberId}
          onSelectMember={setSelectedMemberId}
        />
      )}

      {/* Task Create / Edit Modal */}
      <TaskEditorModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        members={members}
        onSave={handleSaveTask}
        initialTask={editingTask}
        currentUserId={currentMember.Member_ID}
      />

      {/* Responsibility Create / Edit Modal */}
      <ResponsibilityEditorModal
        isOpen={isResponsibilityModalOpen}
        onClose={() => {
          setIsResponsibilityModalOpen(false);
          setEditingResponsibility(null);
        }}
        members={members}
        onSave={handleSaveResponsibility}
        initialResponsibility={editingResponsibility}
      />
    </div>
  );
};
