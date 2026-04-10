import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import PlayPage from './pages/PlayPage';
import TowerView from './pages/TowerView';
import TowerTydorinView from './pages/TowerTydorinView';
import TowerShadowView from './pages/TowerShadowView';
import GameCode from './pages/GameCode';
import GameCodeTydorin from './pages/GameCodeTydorin';
import GameCodeShadow from './pages/GameCodeShadow';
import TowerPrytodyView from './pages/TowerPrytodyView';
import GameCodePrytody from './pages/GameCodePrytody';
import TowerAbyssView from './pages/TowerAbyssView';
import GameCodeAbyss from './pages/GameCodeAbyss';
import TowerAeterdView from './pages/TowerAeterdView';
import GameCodeAeterd from './pages/GameCodeAeterd';
import ArenaBattle from './pages/ArenaBattle';
import GrandArena from './pages/GrandArena';
import InstructorPage from './pages/InstructorPage';
import ConfirmationPage from './pages/ConfirmationPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import PaymentCallbackPage from './pages/PaymentCallbackPage';

import './index.css';

import { MusicProvider } from './contexts/MusicContext';
import { UserProvider } from './contexts/UserContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ThemeOverlay from './components/game/ThemeOverlay';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainMusicPlayer from './components/common/MainMusicPlayer';
import GlobalAudioControl from './components/common/GlobalAudioControl';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

import { QuestProvider } from './contexts/QuestContext';
import useInactivityTimeout from './hooks/useInactivityTimeout';
import SingleTabEnforcer from './components/common/SingleTabEnforcer';

// Component for safely redirecting to an external URL
const ExternalRedirect = ({ to }) => {
  React.useEffect(() => {
    window.location.href = to;
  }, [to]);
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
        <p className="text-cyan-500 font-mono text-xs uppercase tracking-widest animate-pulse">Redirecting to Secure Admin Portal...</p>
      </div>
    </div>
  );
};

import InactivityModal from './components/common/InactivityModal';

// Wrapper component to activate inactivity timeout globally
const InactivityGuard = ({ children }) => {
  const { isLoggedOutDueToInactivity, clearInactivity } = useInactivityTimeout();
  return (
    <>
      {children}
      <InactivityModal isOpen={isLoggedOutDueToInactivity} onClose={clearInactivity} />
    </>
  );
};

function App() {
  return (
    <SingleTabEnforcer>
      <QueryClientProvider client={queryClient}>
      <Router>
        <MusicProvider>
          <ToastProvider>
            <UserProvider>
              <ThemeProvider>
                <QuestProvider>
                  <GlobalAudioControl />
                  <MainMusicPlayer />
                  <ThemeOverlay />
                  <InactivityGuard>
                    <Routes>
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/play" element={<PlayPage />} />
                      <Route path="/tower/:id" element={<TowerView />} />
                      <Route path="/tower-tydorin" element={<TowerTydorinView />} />
                      <Route path="/gamecode-tydorin/:floor/:towerId" element={<GameCodeTydorin />} />
                      <Route path="/tower-shadow" element={<TowerShadowView />} />
                      <Route path="/gamecode-shadow/:floor/:towerId" element={<GameCodeShadow />} />
                      <Route path="/gamecode/:floor/:towerId" element={<GameCode />} />
                      <Route path="/arena-battle/:battleId" element={<ArenaBattle />} />
                      <Route path="/grand-arena/:battleId" element={<GrandArena />} />
                      <Route path="/instructor" element={<InstructorPage />} />
                      <Route path="/ConfirmationPage" element={<ConfirmationPage />} />
                      <Route path="/reset-password" element={<ResetPasswordPage />} />
                      <Route 
                        path="/admin" 
                        element={<ExternalRedirect to="https://code-siege-admin.vercel.app" />} 
                      />
                      <Route path="/tower-prytody" element={<TowerPrytodyView />} />
                      <Route path="/gamecode-prytody/:floor/:towerId" element={<GameCodePrytody />} />
                      <Route path="/tower-abyss" element={<TowerAbyssView />} />
                      <Route path="/gamecode-abyss/:floor/:towerId" element={<GameCodeAbyss />} />
                      <Route path="/tower-aeterd" element={<TowerAeterdView />} />
                      <Route path="/gamecode-aeterd/:floor/:towerId" element={<GameCodeAeterd />} />

                      <Route path="/payment-callback" element={<PaymentCallbackPage />} />
                    </Routes>
                  </InactivityGuard>
                </QuestProvider>
              </ThemeProvider>
            </UserProvider>
          </ToastProvider>
        </MusicProvider>
      </Router>
    </QueryClientProvider>
    </SingleTabEnforcer>
  );
}

export default App;
