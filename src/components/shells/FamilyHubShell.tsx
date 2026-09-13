import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
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
  Play,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Image as ImageIcon
} from 'lucide-react';

export const FamilyHubShell: React.FC = () => {
  const { session, members, hubLocked, unlockHub, lockHub, openPinModal } = useAuth();
  const [hubMode, setHubMode] = useState<'AMBIENT' | 'FAMILY_HOME' | 'TIMER'>('FAMILY_HOME');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [hubData, setHubData] = useState<any>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Kitchen Timer
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Hub Data
  const loadHub = async () => {
    try {
      const data = await api.getHubData();
      setHubData(data);
    } catch (err) {
      console.error('Failed to load hub data:', err);
    }
  };

  useEffect(() => {
    loadHub();
  }, [hubLocked]);

  // Ambient Photo Rotation
  useEffect(() => {
    if (hubMode === 'AMBIENT' && hubData?.ambientPhotos?.length > 0) {
      const photoTimer = setInterval(() => {
        setPhotoIndex(prev => (prev + 1) % hubData.ambientPhotos.length);
      }, 12000);
      return () => clearInterval(photoTimer);
    }
  }, [hubMode, hubData]);

  // Kitchen Timer Tick
  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(s => s - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerActive) {
      setTimerActive(false);
      alert('Timer Finished! ⏰');
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  const startTimer = (mins: number) => {
    setTimerSeconds(mins * 60);
    setTimerActive(true);
    setHubMode('TIMER');
  };

  const currentPhoto = hubData?.ambientPhotos?.[photoIndex];

  return (
    <div className="space-y-6">
      {/* Hub Top Appliance Banner */}
      <div className="bg-stone-900 text-white p-5 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-stone-950 font-bold">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold tracking-tight">Family Hub Appliance Mode</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-800 text-amber-400 border border-stone-700">
                Kitchen Refrigerator Display
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Optimized for high-density kitchen wall displays & touch terminals
            </p>
          </div>
        </div>

        {/* State Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setHubMode(hubMode === 'AMBIENT' ? 'FAMILY_HOME' : 'AMBIENT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              hubMode === 'AMBIENT'
                ? 'bg-amber-500 text-stone-950'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <ImageIcon className="w-4 h-4 inline mr-1.5" />
            <span>{hubMode === 'AMBIENT' ? 'Exit Ambient' : 'Ambient Screensaver'}</span>
          </button>

          {/* Parent Unlock / Lock */}
          {hubLocked ? (
            <button
              onClick={() => {
                const parent = members.find(m => m.Role === 'OWNER' || m.Role === 'ADMIN');
                if (parent) openPinModal(parent);
              }}
              className="px-3.5 py-2 rounded-xl bg-orange-700 hover:bg-orange-800 text-white text-xs font-bold transition-colors flex items-center space-x-1.5"
            >
              <Lock className="w-4 h-4" />
              <span>Unlock Parent Mode</span>
            </button>
          ) : (
            <button
              onClick={lockHub}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors flex items-center space-x-1.5"
            >
              <Unlock className="w-4 h-4" />
              <span>Parent Unlocked (Lock Now)</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode: AMBIENT Screensaver */}
      {hubMode === 'AMBIENT' ? (
        <div
          onClick={() => setHubMode('FAMILY_HOME')}
          className="relative min-h-[600px] rounded-3xl overflow-hidden shadow-2xl bg-stone-950 flex flex-col justify-between p-8 sm:p-12 cursor-pointer select-none"
        >
          {/* Background Photo */}
          {currentPhoto ? (
            <img
              src={api.getMediaStreamUrl(currentPhoto.Media_ID)}
              alt="Ambient Memory"
              className="absolute inset-0 w-full h-full object-cover opacity-40 blur-xs transition-all duration-1000 scale-105"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-stone-900 to-amber-950 opacity-80" />
          )}

          {/* Top Info: Weather & Date */}
          <div className="relative z-10 flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <Sun className="w-8 h-8 text-amber-400" />
              <div>
                <div className="text-2xl font-bold">64°F Sunny</div>
                <div className="text-xs text-stone-300">New York, NY</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              <div className="text-xs text-amber-300">Enguerra of NY Family Home</div>
            </div>
          </div>

          {/* Center Giant Clock */}
          <div className="relative z-10 text-center my-auto">
            <div className="text-7xl sm:text-9xl font-black text-white tracking-tight drop-shadow-lg font-mono">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <p className="text-stone-300 text-sm mt-3 animate-pulse">
              Tap anywhere to open Family Command Center
            </p>
          </div>

          {/* Photo Caption Footer */}
          <div className="relative z-10 text-center text-xs text-stone-300 bg-black/40 backdrop-blur-md py-2 px-4 rounded-full max-w-md mx-auto">
            {currentPhoto?.Caption || 'Enguerra Family Memories • Private Google Drive Storage'}
          </div>
        </div>
      ) : (
        /* Mode: FAMILY_HOME Interactive Touch View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Col 1: Today's Family Agenda */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
                <h3 className="text-base font-bold text-stone-900 flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-orange-700" />
                  <span>Today's Family Schedule</span>
                </h3>
                <span className="text-xs font-semibold text-stone-500">
                  {currentTime.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>

              <div className="space-y-3">
                {hubData?.todaysEvents?.length === 0 ? (
                  <div className="py-8 text-center text-xs text-stone-400">No events scheduled today</div>
                ) : (
                  hubData?.todaysEvents?.map((evt: any) => (
                    <div
                      key={evt.Event_ID}
                      className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-stone-900">{evt.Title}</h4>
                        <span className="text-xs font-bold text-orange-800">
                          {new Date(evt.Start_Time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {evt.Location && (
                        <p className="text-xs text-stone-500 mt-1">{evt.Location}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Kitchen Timers */}
            <div className="mt-6 pt-4 border-t border-stone-100">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
                <Timer className="w-4 h-4 text-orange-700" />
                <span>Kitchen Cooking Timers</span>
              </div>

              {timerActive ? (
                <div className="p-3 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-between">
                  <span className="text-2xl font-mono font-black">
                    {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                  </span>
                  <button
                    onClick={() => setTimerActive(false)}
                    className="p-1.5 rounded-xl bg-stone-950 text-white"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {[3, 5, 15, 30].map(m => (
                    <button
                      key={m}
                      onClick={() => startTimer(m)}
                      className="py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition-colors"
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Col 2: Daily Chores Checklist */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <h3 className="text-base font-bold text-stone-900 flex items-center space-x-2">
                <CheckSquare className="w-5 h-5 text-orange-700" />
                <span>Daily Chores & Tasks</span>
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                {hubData?.pendingTasks?.length || 0} Open
              </span>
            </div>

            <div className="space-y-3">
              {hubData?.pendingTasks?.length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-400">All tasks completed!</div>
              ) : (
                hubData?.pendingTasks?.slice(0, 6).map((task: any) => {
                  const assigned = members.find(m => m.Member_ID === task.Assigned_To);
                  return (
                    <div
                      key={task.Task_ID}
                      className="p-3.5 rounded-2xl border border-stone-200 flex items-center justify-between"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-stone-900">{task.Title}</h4>
                        <span className="text-xs text-stone-500">
                          Assigned to <strong>{assigned?.Display_Name || 'Family'}</strong> • +{task.Points} pts
                        </span>
                      </div>
                      <button
                        onClick={async () => {
                          await api.updateTaskStatus(task.Task_ID, 'COMPLETED');
                          loadHub();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800"
                      >
                        Done
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Col 3: Kitchen Grocery Board & Family Avatars */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
                <h3 className="text-base font-bold text-stone-900 flex items-center space-x-2">
                  <ShoppingCart className="w-5 h-5 text-orange-700" />
                  <span>Kitchen Grocery Board</span>
                </h3>
              </div>

              <p className="text-xs text-stone-500 mb-4">
                Family shopping lists are directly synced with Dad and Mom's phones.
              </p>

              <div className="space-y-2">
                {hubData?.groceryLists?.map((list: any) => (
                  <div
                    key={list.List_ID}
                    className="p-3 rounded-2xl bg-orange-50/50 border border-orange-200/60 flex items-center justify-between"
                  >
                    <span className="text-xs font-bold text-stone-900">{list.Title}</span>
                    <span className="text-[10px] uppercase font-bold text-orange-700 bg-white px-2 py-0.5 rounded-full border border-orange-200">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Member Presence */}
            <div className="mt-6 pt-4 border-t border-stone-100">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
                Family Members
              </div>
              <div className="flex items-center space-x-2">
                {members.map(m => (
                  <div
                    key={m.Member_ID}
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-xs"
                    style={{ backgroundColor: m.Color }}
                    title={m.Display_Name}
                  >
                    {m.First_Name.charAt(0)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
