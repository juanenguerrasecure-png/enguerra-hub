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
  const { activeShell, deviceMode, detectedType, isAutoDetect, loading } = useAuth();
  const [showSimulatedBezel, setShowSimulatedBezel] = React.useState(true);

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

  // Determine if device needs a phone or tablet preview frame (only when simulating on a larger desktop screen)
  const isSimulatingMobile = deviceMode === 'MOBILE' && detectedType === 'DESKTOP' && showSimulatedBezel;
  const isSimulatingTablet = deviceMode === 'TABLET' && detectedType === 'DESKTOP' && showSimulatedBezel;
  const isHubMode = deviceMode === 'HUB';

  return (
    <div className={`min-h-screen flex flex-col ${
      isHubMode ? 'bg-slate-950 text-white' : 'bg-stone-50/80 text-stone-900'
    }`}>
      <Header />

      <main className={`flex-1 w-full mx-auto py-4 sm:py-6 ${
        isHubMode ? 'max-w-7xl px-2 sm:px-4' : 'max-w-7xl px-4 sm:px-6 lg:px-8'
      }`}>
        {/* If simulating mobile on desktop, offer quick bezel toggle */}
        {(deviceMode === 'MOBILE' || deviceMode === 'TABLET') && detectedType === 'DESKTOP' && (
          <div className="flex items-center justify-center mb-4">
            <button
              onClick={() => setShowSimulatedBezel(!showSimulatedBezel)}
              className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 bg-stone-200/70 hover:bg-stone-200 px-3 py-1 rounded-full transition-colors"
            >
              {showSimulatedBezel ? 'Switch to Full Width View' : 'Show Device Frame Preview'}
            </button>
          </div>
        )}

        {isSimulatingMobile ? (
          <div className="max-w-md mx-auto bg-[#FAF8F5] rounded-[2.5rem] p-3 shadow-2xl border-4 border-stone-800 ring-1 ring-black/10">
            {/* iPhone Dynamic Island / Speaker notch */}
            <div className="w-24 h-4 bg-stone-800 rounded-full mx-auto mb-3 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-stone-900 mr-2" />
              <div className="w-8 h-1 bg-stone-700 rounded-full" />
            </div>
            {renderShell(activeShell)}
          </div>
        ) : isSimulatingTablet ? (
          <div className="max-w-4xl mx-auto bg-[#FAF8F5] rounded-3xl p-5 shadow-2xl border-4 border-stone-800 ring-1 ring-black/10">
            <div className="w-28 h-1.5 bg-stone-800 rounded-full mx-auto mb-4" />
            {renderShell(activeShell)}
          </div>
        ) : (
          renderShell(activeShell)
        )}
      </main>

      {!isHubMode && (
        <footer className="py-4 border-t border-stone-200 bg-white text-center text-xs text-stone-400">
          Enguerra of NY Family Application • Google Sheets Database • Google Drive Private Storage
        </footer>
      )}

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
