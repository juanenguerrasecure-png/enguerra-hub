import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/common/Header';
import { PinModal } from './components/common/PinModal';
import { ParentShell } from './components/shells/ParentShell';
import { KidsOlderShell } from './components/shells/KidsOlderShell';
import { KidsToddlerShell } from './components/shells/KidsToddlerShell';
import { FamilyHubShell } from './components/shells/FamilyHubShell';
import { RefreshCw, Smartphone, Tablet } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeShell, deviceMode, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-500 text-xs">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin text-orange-700" />
          <span>Bootstrapping Enguerra of NY operating system...</span>
        </div>
      </div>
    );
  }

  // Device simulation wrapper
  const isSimulatingMobile = deviceMode === 'MOBILE';
  const isSimulatingTablet = deviceMode === 'TABLET';

  return (
    <div className="min-h-screen bg-stone-50/70 text-stone-900 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isSimulatingMobile ? (
          <div className="max-w-md mx-auto bg-white rounded-3xl p-4 shadow-2xl border-4 border-stone-800">
            <div className="w-20 h-1 bg-stone-800 rounded-full mx-auto mb-4" />
            {renderShell(activeShell)}
          </div>
        ) : isSimulatingTablet ? (
          <div className="max-w-3xl mx-auto bg-white rounded-3xl p-6 shadow-2xl border-4 border-stone-800">
            <div className="w-24 h-1 bg-stone-800 rounded-full mx-auto mb-4" />
            {renderShell(activeShell)}
          </div>
        ) : (
          renderShell(activeShell)
        )}
      </main>

      <footer className="py-4 border-t border-stone-200 bg-white text-center text-xs text-stone-400">
        Enguerra of NY Family Application • Google Sheets Database • Google Drive Private Storage
      </footer>

      <PinModal />
    </div>
  );
};

function renderShell(shell: string) {
  switch (shell) {
    case 'PARENT':
      return <ParentShell />;
    case 'KIDS_OLDER':
      return <KidsOlderShell />;
    case 'KIDS_TODDLER':
      return <KidsToddlerShell />;
    case 'FAMILY_HUB':
      return <FamilyHubShell />;
    default:
      return <ParentShell />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
