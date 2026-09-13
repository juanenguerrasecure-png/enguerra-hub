import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthUserSession, FamilyMember, DeviceShell, BootstrapResponse } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  session: AuthUserSession | null;
  members: FamilyMember[];
  activeShell: DeviceShell;
  deviceMode: 'DESKTOP' | 'TABLET' | 'MOBILE' | 'HUB';
  systemInfo: BootstrapResponse['system'] | null;
  loading: boolean;
  hubLocked: boolean;
  login: (memberId: string, pin: string, deviceType?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchProfile: (member: FamilyMember) => void;
  switchDeviceMode: (mode: 'DESKTOP' | 'TABLET' | 'MOBILE' | 'HUB') => void;
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
  const [deviceMode, setDeviceMode] = useState<'DESKTOP' | 'TABLET' | 'MOBILE' | 'HUB'>('DESKTOP');
  const [hubLocked, setHubLocked] = useState<boolean>(true);

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

  const switchDeviceMode = (mode: 'DESKTOP' | 'TABLET' | 'MOBILE' | 'HUB') => {
    setDeviceMode(mode);
    if (mode === 'HUB') {
      setHubLocked(true);
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
        systemInfo,
        loading,
        hubLocked,
        login,
        logout,
        switchProfile,
        switchDeviceMode,
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
