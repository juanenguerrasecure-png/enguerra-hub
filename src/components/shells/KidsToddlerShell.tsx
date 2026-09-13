import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  Heart,
  Smile,
  Sun,
  Moon,
  BookOpen,
  Music,
  Star,
  Check
} from 'lucide-react';

interface ToddlerRoutine {
  id: string;
  title: string;
  icon: string;
  color: string;
  done: boolean;
}

export const KidsToddlerShell: React.FC = () => {
  const { session } = useAuth();
  const [routines, setRoutines] = useState<ToddlerRoutine[]>([
    { id: '1', title: 'Brush Teeth 🪥', icon: 'Smile', color: '#0EA5E9', done: false },
    { id: '2', title: 'Pick Up Toys 🧸', icon: 'Heart', color: '#F59E0B', done: false },
    { id: '3', title: 'Story Time 📖', icon: 'BookOpen', color: '#8B5CF6', done: false },
    { id: '4', title: 'Pajamas & Bed 🌙', icon: 'Moon', color: '#EC4899', done: false },
  ]);
  const [stars, setStars] = useState<number>(3);
  const [celebrateText, setCelebrateText] = useState<string | null>(null);

  const toggleRoutine = (id: string) => {
    setRoutines(prev =>
      prev.map(r => {
        if (r.id === id) {
          const newDone = !r.done;
          if (newDone) {
            setStars(s => s + 1);
            setCelebrateText(`Great job, Adine! ⭐ +1 Star`);
            setTimeout(() => setCelebrateText(null), 2500);
          }
          return { ...r, done: newDone };
        }
        return r;
      })
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Cheerful Toddler Header */}
      <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-3xl p-6 sm:p-8 text-white text-center shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-center space-x-2 mb-1">
          <Smile className="w-8 h-8 text-yellow-300 animate-bounce" />
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Adine's Fun Day!</h2>
        </div>
        <p className="text-sm font-medium text-pink-100">Tap your pictures to earn stars!</p>

        {/* Big Star Meter */}
        <div className="mt-4 inline-flex items-center space-x-2 bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/30">
          <Star className="w-6 h-6 text-yellow-300 fill-yellow-300 animate-pulse" />
          <span className="text-2xl font-black text-white">{stars}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-pink-100">Stars Earned</span>
        </div>
      </div>

      {celebrateText && (
        <div className="p-4 rounded-2xl bg-amber-400 text-stone-900 text-center font-black text-xl shadow-lg animate-in zoom-in duration-200">
          {celebrateText}
        </div>
      )}

      {/* Big Touch Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {routines.map(routine => (
          <button
            key={routine.id}
            type="button"
            onClick={() => toggleRoutine(routine.id)}
            className={`p-6 sm:p-8 rounded-3xl border-4 text-left transition-all duration-200 flex items-center justify-between shadow-md active:scale-95 ${
              routine.done
                ? 'bg-emerald-50 border-emerald-400 opacity-90'
                : 'bg-white border-stone-200 hover:border-pink-300'
            }`}
          >
            <div className="flex items-center space-x-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl shadow-md shrink-0"
                style={{ backgroundColor: routine.color }}
              >
                {routine.done ? <Check className="w-9 h-9 stroke-[3]" /> : <Star className="w-8 h-8" />}
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-stone-900 leading-tight">
                  {routine.title}
                </h3>
                <span className="text-xs font-bold text-stone-500 mt-1 inline-block">
                  {routine.done ? 'Finished! Good girl!' : 'Tap when ready!'}
                </span>
              </div>
            </div>

            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${
                routine.done ? 'bg-emerald-500 text-white' : 'border-2 border-stone-300 text-stone-300'
              }`}
            >
              {routine.done && <Check className="w-6 h-6 stroke-[3]" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
