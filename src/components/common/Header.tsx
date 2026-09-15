import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FamilyAvatar } from '../ui/FamilyAvatar';
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
  AlertCircle,
  Sparkles,
  ArrowLeftRight,
  Maximize2
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    session,
    members,
    activeShell,
    deviceMode,
    detectedType,
    isAutoDetect,
    systemInfo,
    switchProfile,
    switchDeviceMode,
    enableAutoDetect,
    toggleHubMode,
    lockHub,
  } = useAuth();

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  
  // Production environment check
  const isProduction = import.meta.env.PROD || systemInfo?.appEnv === 'PROD';
  
  // Developer viewport simulator toggle (strictly disabled in production)
  const [showDevSimulator, setShowDevSimulator] = useState(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('simulator') === 'true') return true;
    return localStorage.getItem('enguerra_dev_simulator') === 'true';
  });

  const currentMember = session?.member;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand & Crest */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[#1C1E21] text-white flex items-center justify-center text-sm font-black tracking-wider shadow-xs">
            EN
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-[#1C1E21] tracking-tight">Enguerra of NY</h1>
              {!isProduction && (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  {systemInfo?.appEnv || 'DEV'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-500 hidden sm:block">
              Our Family. One App. A Brighter Everyday.
            </p>
          </div>
        </div>

        {/* Center Actions: Alternate HUB Access & (Optional Dev Simulator) */}
        <div className="flex items-center space-x-2">
          {/* Manual Device Simulator: strictly hidden in production, and hidden by default in DEV */}
          {!isProduction && showDevSimulator && (
            <div className="flex items-center bg-stone-100/90 p-1 rounded-xl border border-stone-200 text-stone-600 text-xs">
              <button
                onClick={enableAutoDetect}
                title={`Auto-detecting screen size (${detectedType})`}
                className={`flex items-center space-x-1 px-2 py-1 rounded-lg font-semibold transition-all ${
                  isAutoDetect && deviceMode !== 'HUB'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[10px] uppercase font-bold">Auto ({detectedType.slice(0, 3)})</span>
              </button>

              <button
                onClick={() => switchDeviceMode('DESKTOP')}
                title="Force Desktop Layout"
                className={`flex items-center space-x-1 px-2 py-1 rounded-lg font-medium transition-all ${
                  !isAutoDetect && deviceMode === 'DESKTOP'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'hover:text-stone-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">Desktop</span>
              </button>

              <button
                onClick={() => switchDeviceMode('TABLET')}
                title="Force Tablet Layout"
                className={`flex items-center space-x-1 px-2 py-1 rounded-lg font-medium transition-all ${
                  !isAutoDetect && deviceMode === 'TABLET'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'hover:text-stone-900'
                }`}
              >
                <Tablet className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">Tablet</span>
              </button>

              <button
                onClick={() => switchDeviceMode('MOBILE')}
                title="Force Mobile Layout"
                className={`flex items-center space-x-1 px-2 py-1 rounded-lg font-medium transition-all ${
                  !isAutoDetect && deviceMode === 'MOBILE'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'hover:text-stone-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">Mobile</span>
              </button>
            </div>
          )}

          {/* Alternate HUB Access (Direct 1-click toggle between Family Hub and personal view) */}
          <button
            onClick={toggleHubMode}
            title={deviceMode === 'HUB' ? 'Exit Family Hub and return to personal member view' : 'Switch to Family Hub Kiosk (Fridge/Wall Display)'}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs border ${
              deviceMode === 'HUB'
                ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-500 ring-2 ring-amber-400/50'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
            }`}
          >
            <Tv className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">
              {deviceMode === 'HUB' ? 'Exit Hub' : 'Family Hub'}
            </span>
            <span className="text-[10px] uppercase font-black px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-900">
              {deviceMode === 'HUB' ? 'ACTIVE' : 'KIOSK'}
            </span>
          </button>
        </div>

        {/* Right Action: Sync Status & Active Member Switcher */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Google Sync Status Pill */}
          <div
            className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
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
              <FamilyAvatar
                member={currentMember}
                size="sm"
                shape="squircle"
                showBorder={false}
              />
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-stone-900 leading-tight">
                  {currentMember?.First_Name || 'Select Member'}
                </div>
                <div className="text-[10px] text-stone-500 uppercase tracking-wider">
                  {deviceMode === 'HUB' ? 'Hub Mode' : currentMember?.Role || 'GUEST'}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-stone-400" />
            </button>

            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white shadow-xl border border-stone-200 py-2 z-50 animate-in fade-in zoom-in duration-150">
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
                        <FamilyAvatar
                          member={m}
                          size="xs"
                          shape="squircle"
                          showBorder={false}
                        />
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
                      toggleHubMode();
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-800 hover:bg-amber-50 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <Tv className="w-4 h-4 text-amber-600" />
                      <span>{deviceMode === 'HUB' ? 'Exit Family Hub' : 'Alternate HUB Access'}</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 uppercase">
                      Fridge
                    </span>
                  </button>
                </div>

                {!isProduction && (
                  <div className="border-t border-stone-100 pt-1.5 px-2">
                    <button
                      onClick={() => {
                        const nextState = !showDevSimulator;
                        setShowDevSimulator(nextState);
                        localStorage.setItem('enguerra_dev_simulator', String(nextState));
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-500 hover:bg-stone-50 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <Smartphone className="w-3.5 h-3.5 text-stone-400" />
                        <span>Dev Simulator Toolbar</span>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        showDevSimulator ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-500'
                      }`}>
                        {showDevSimulator ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
