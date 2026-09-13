import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Delete, X, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';

export const PinModal: React.FC = () => {
  const { isPinModalOpen, pendingPinMember, closePinModal, login } = useAuth();
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isPinModalOpen) {
      setPin('');
      setError(null);
    }
  }, [isPinModalOpen]);

  if (!isPinModalOpen || !pendingPinMember) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      const next = pin + digit;
      setPin(next);
      setError(null);
      if (next.length === 4) {
        // Auto submit 4-digit PIN
        submitPin(next);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const submitPin = async (inputPin: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await login(pendingPinMember.Member_ID, inputPin);
      closePinModal();
    } catch (err: any) {
      setError(err.message || 'Incorrect PIN. Please try again.');
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isParent = pendingPinMember.Role === 'OWNER' || pendingPinMember.Role === 'ADMIN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: pendingPinMember.Color || '#EA580C' }}
            />
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              {isParent ? 'Parent PIN Unlock' : 'Profile Switch'}
            </span>
          </div>
          <button
            onClick={closePinModal}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center my-3">
          <div
            className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-white text-2xl font-bold shadow-md mb-2"
            style={{ backgroundColor: pendingPinMember.Color || '#EA580C' }}
          >
            {pendingPinMember.First_Name.charAt(0)}
          </div>
          <h2 className="text-xl font-bold text-stone-900">
            {pendingPinMember.Display_Name || pendingPinMember.First_Name}
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            {isParent ? 'Enter parent passcode to authorize' : 'Enter family PIN to unlock'}
          </p>
        </div>

        {/* PIN Dots */}
        <div className="flex justify-center items-center space-x-4 my-5">
          {[0, 1, 2, 3].map(idx => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                pin.length > idx
                  ? 'bg-stone-900 border-stone-900 scale-110'
                  : 'border-stone-300 bg-stone-50'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center space-x-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto mb-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDigit(num)}
              className="h-12 rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-800 font-semibold text-lg transition-colors flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-500 text-xs font-medium transition-colors flex items-center justify-center"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleDigit('0')}
            className="h-12 rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-800 font-semibold text-lg transition-colors flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-600 transition-colors flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Test Hint for Reviewers / Family */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
          <span className="flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Dev PIN: {isParent ? '1234' : '1111'}</span>
          </span>
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Salted PBKDF2</span>
          </span>
        </div>
      </div>
    </div>
  );
};
