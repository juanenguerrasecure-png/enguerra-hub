import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthUserSession, FamilyMember, DeviceShell, BootstrapResponse } from '../types';
import { api } from '../lib/api';

export type DeviceMode = 'DESKTOP' | 'TABLET' | 'MOBILE' | 'HUB';

function getDetectedDevice(): 'DESKTOP' | 'TABLET' | 'MOBILE' {
  if (typeof window === 'undefined') return 'DESKTOP';
  const width = window.innerWidth;
  if (width < 640) return 'MOBILE';
  if (width < 1024) return 'TABLET';
  return 'DESKTOP';
}

interface AuthContextType {
  session: AuthUserSession | null;
  members: FamilyMember[];
  activeShell: DeviceShell;
  deviceMode: DeviceMode;
  detectedType: 'DESKTOP' | 'TABLET' | 'MOBILE';
  isAutoDetect: boolean;
  systemInfo: BootstrapResponse['system'] | null;
  loading: boolean;
  hubLocked: boolean;
  login: (memberId: string, pin: string, deviceType?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchProfile: (member: FamilyMember) => void;
  switchDeviceMode: (mode: DeviceMode) => void;
  enableAutoDetect: () => void;
  toggleHubMode: () => void;
  unlockHub: (pin: string) => Promise<boolean>;
  lockHub: () => void;
  isPinModalOpen: boolean;
  pendingPinMember: FamilyMember | null;
  openPinModal: (member: FamilyMember, onSuccess?: () => void) => void;
  closePinModal: () => void;
  refreshBootstrap: () => Promise<void>;
  updateMemberProfile: (memberId: string, updates: Partial<FamilyMember> & { pin?: string }) => Promise<FamilyMember>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthUserSession | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [systemInfo, setSystemInfo] = useState<BootstrapResponse['system'] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Device auto-detection state
  const [detectedType, setDetectedType] = useState<'DESKTOP' | 'TABLET' | 'MOBILE'>(getDetectedDevice);
  const [isAutoDetect, setIsAutoDetect] = useState<boolean>(() => {
    const saved = localStorage.getItem('enguerra_auto_detect');
    return saved !== null ? saved === 'true' : true;
  });
  const [deviceMode, setDeviceMode] = useState<DeviceMode>(() => {
    const savedMode = localStorage.getItem('enguerra_device_mode') as DeviceMode | null;
    const initialAuto = localStorage.getItem('enguerra_auto_detect');
    if (initialAuto === 'false' && savedMode) {
      return savedMode;
    }
    return getDetectedDevice();
  });
  const [hubLocked, setHubLocked] = useState<boolean>(true);

  // Resize & orientation listener for auto-detection
  useEffect(() => {
    const handleResize = () => {
      const detected = getDetectedDevice();
      setDetectedType(detected);
      if (isAutoDetect && deviceMode !== 'HUB') {
        setDeviceMode(detected);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [isAutoDetect, deviceMode]);

  // PIN modal state
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingPinMember, setPendingPinMember] = useState<FamilyMember | null>(null);
  const [pinCallback, setPinCallback] = useState<(() => void) | null>(null);

  const refreshBootstrap = useCallback(async () => {
    try {
      const data = await api.getBootstrap();
      setMembers(data.familyMembers);
      setSystemInfo(data.system);
      if (data.session) {
        api.setSessionId(data.session.sessionId);
        setSession(data.session);
      } else if (data.familyMembers.length > 0 && !session) {
        // Default to Dad (Owner) in DEV preview if no session exists yet
        const defaultMember = data.familyMembers.find(m => m.Role === 'OWNER') || data.familyMembers[0];
        try {
          const res = await api.login(defaultMember.Member_ID, '1234', 'BROWSER');
          setSession(res.session);
        } catch {
          // If login fails, user can authenticate via modal
        }
      }
    } catch (err) {
      console.error('[AuthContext] Bootstrap error:', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refreshBootstrap();
  }, []);

  const login = async (memberId: string, pin: string, deviceType: string = 'BROWSER') => {
    const res = await api.login(memberId, pin, deviceType);
    setSession(res.session);
    if (res.session.deviceType === 'HUB') {
      setDeviceMode('HUB');
    }
  };

  const logout = async () => {
    await api.logout();
    setSession(null);
  };

  const openPinModal = (member: FamilyMember, onSuccess?: () => void) => {
    setPendingPinMember(member);
    setPinCallback(() => onSuccess || null);
    setIsPinModalOpen(true);
  };

  const closePinModal = () => {
    setIsPinModalOpen(false);
    setPendingPinMember(null);
    setPinCallback(null);
  };

  const switchProfile = (targetMember: FamilyMember) => {
    // If target member is a child, we can allow immediate switch or prompt
    // For parents, require PIN verification
    openPinModal(targetMember, async () => {
      if (pinCallback) pinCallback();
    });
  };

  const enableAutoDetect = () => {
    setIsAutoDetect(true);
    localStorage.setItem('enguerra_auto_detect', 'true');
    const detected = getDetectedDevice();
    setDetectedType(detected);
    setDeviceMode(detected);
  };

  const switchDeviceMode = (mode: DeviceMode) => {
    setDeviceMode(mode);
    setIsAutoDetect(false);
    localStorage.setItem('enguerra_auto_detect', 'false');
    localStorage.setItem('enguerra_device_mode', mode);
    if (mode === 'HUB') {
      setHubLocked(true);
    }
  };

  const toggleHubMode = () => {
    if (deviceMode === 'HUB') {
      // Exit HUB mode: return to auto-detected mode
      enableAutoDetect();
    } else {
      // Enter HUB mode
      switchDeviceMode('HUB');
    }
  };

  const unlockHub = async (pin: string): Promise<boolean> => {
    // Parent PIN verification to unlock full refrigerator management
    const parent = members.find(m => m.Role === 'OWNER' || m.Role === 'ADMIN');
    if (!parent) return false;
    try {
      await api.login(parent.Member_ID, pin, 'HUB');
      setHubLocked(false);
      return true;
    } catch {
      return false;
    }
  };

  const lockHub = () => {
    setHubLocked(true);
  };

  const updateMemberProfile = async (
    memberId: string,
    updates: Partial<FamilyMember> & { pin?: string }
  ): Promise<FamilyMember> => {
    const res = await api.updateMemberProfile(memberId, updates);
    const updated = res.member;

    // Update members state
    setMembers(prev => prev.map(m => (m.Member_ID === memberId ? updated : m)));

    // If currently logged in as this member, update active session member
    if (session && session.member.Member_ID === memberId) {
      setSession(prev => (prev ? { ...prev, member: updated } : null));
    }

    return updated;
  };

  // Determine active shell
  let activeShell: DeviceShell = 'PARENT';
  if (deviceMode === 'HUB') {
    activeShell = 'FAMILY_HUB';
  } else if (session) {
    activeShell = session.shell;
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        members,
        activeShell,
        deviceMode,
        detectedType,
        isAutoDetect,
        systemInfo,
        loading,
        hubLocked,
        login,
        logout,
        switchProfile,
        switchDeviceMode,
        enableAutoDetect,
        toggleHubMode,
        unlockHub,
        lockHub,
        isPinModalOpen,
        pendingPinMember,
        openPinModal,
        closePinModal,
        refreshBootstrap,
        updateMemberProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
