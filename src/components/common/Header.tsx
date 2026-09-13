import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Smartphone,
  Tablet,
  Monitor,
  Tv,
  Lock,
  ChevronDown,
  Cloud,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    session,
    members,
    activeShell,
    deviceMode,
    systemInfo,
    switchProfile,
    switchDeviceMode,
    lockHub,
  } = useAuth();

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const currentMember = session?.member;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Crest */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-orange-700 text-white flex items-center justify-center font-serif text-lg font-bold shadow-xs">
            EN
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-stone-900 tracking-tight">Enguerra of NY</h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-600 border border-stone-200">
                {systemInfo?.appEnv || 'DEV'}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 hidden sm:block">
              Family Operating System • Authoritative Sheets & Drive
            </p>
          </div>
        </div>

        {/* Device Mode Switcher */}
        <div className="hidden md:flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 text-stone-600 text-xs">
          <button
            onClick={() => switchDeviceMode('DESKTOP')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
              deviceMode === 'DESKTOP' ? 'bg-white text-stone-900 shadow-xs' : 'hover:text-stone-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop</span>
          </button>
          <button
            onClick={() => switchDeviceMode('TABLET')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
              deviceMode === 'TABLET' ? 'bg-white text-stone-900 shadow-xs' : 'hover:text-stone-900'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
            <span>iPad</span>
          </button>
          <button
            onClick={() => switchDeviceMode('MOBILE')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
              deviceMode === 'MOBILE' ? 'bg-white text-stone-900 shadow-xs' : 'hover:text-stone-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>iPhone</span>
          </button>
          <button
            onClick={() => switchDeviceMode('HUB')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
              deviceMode === 'HUB' ? 'bg-amber-600 text-white shadow-xs' : 'hover:text-stone-900'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Family Hub</span>
          </button>
        </div>

        {/* Right Action: Sync Status & Active Member Switcher */}
        <div className="flex items-center space-x-3">
          {/* Google Sync Status Pill */}
          <div
            className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
            style={{
              borderColor: systemInfo?.googleConnected.sheets ? '#A7F3D0' : '#E2E8F0',
              backgroundColor: systemInfo?.googleConnected.sheets ? '#ECFDF5' : '#F8FAFC',
              color: systemInfo?.googleConnected.sheets ? '#065F46' : '#475569',
            }}
            title={systemInfo?.googleConnected.storageMode}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span className="text-[11px]">
              {systemInfo?.googleConnected.sheets ? 'Live Google Cloud' : 'Local Sheets Store'}
            </span>
          </div>

          {/* Profile Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileDropdownOpen(prev => !prev)}
              className="flex items-center space-x-2 p-1.5 pr-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-xs"
                style={{ backgroundColor: currentMember?.Color || '#EA580C' }}
              >
                {currentMember?.First_Name.charAt(0) || 'E'}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-stone-900 leading-tight">
                  {currentMember?.First_Name || 'Select Member'}
                </div>
                <div className="text-[10px] text-stone-500 uppercase tracking-wider">
                  {activeShell === 'FAMILY_HUB' ? 'Hub Mode' : currentMember?.Role || 'GUEST'}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-stone-400" />
            </button>

            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-stone-200 py-2 z-50 animate-in fade-in zoom-in duration-150">
                <div className="px-3 py-1.5 border-b border-stone-100 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                  Switch Family Member
                </div>
                <div className="py-1">
                  {members.map(m => (
                    <button
                      key={m.Member_ID}
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        switchProfile(m);
                      }}
                      className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: m.Color }}
                        >
                          {m.First_Name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-stone-800">{m.Display_Name}</div>
                          <div className="text-[10px] text-stone-400 uppercase">{m.Role}</div>
                        </div>
                      </div>
                      {currentMember?.Member_ID === m.Member_ID && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="border-t border-stone-100 pt-1.5 px-2">
                  <button
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      switchDeviceMode('HUB');
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-700 hover:bg-amber-50 flex items-center space-x-2"
                  >
                    <Tv className="w-4 h-4" />
                    <span>Switch to Family Hub Shell</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
