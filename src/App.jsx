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
import AdminPage from './pages/AdminPage';
import ConfirmationPage from './pages/ConfirmationPage';
import PaymentCallbackPage from './pages/PaymentCallbackPage';

import './index.css';

import { MusicProvider } from './contexts/MusicContext';
import { UserProvider } from './contexts/UserContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ThemeOverlay from './components/game/ThemeOverlay';
import ProtectedRoute from './components/common/ProtectedRoute';
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

// Wrapper component to activate inactivity timeout globally
const InactivityGuard = ({ children }) => {
  useInactivityTimeout();
  return children;
};

function App() {
  return (
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
                      {/* Public routes - no auth required */}
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/ConfirmationPage" element={<ConfirmationPage />} />
                      <Route path="/payment-callback" element={<PaymentCallbackPage />} />

                      {/* Protected routes - require authentication */}
                      <Route path="/play" element={<ProtectedRoute><PlayPage /></ProtectedRoute>} />
                      <Route path="/tower/:id" element={<ProtectedRoute><TowerView /></ProtectedRoute>} />
                      <Route path="/tower-tydorin" element={<ProtectedRoute><TowerTydorinView /></ProtectedRoute>} />
                      <Route path="/gamecode-tydorin/:floor/:towerId" element={<ProtectedRoute><GameCodeTydorin /></ProtectedRoute>} />
                      <Route path="/tower-shadow" element={<ProtectedRoute><TowerShadowView /></ProtectedRoute>} />
                      <Route path="/gamecode-shadow/:floor/:towerId" element={<ProtectedRoute><GameCodeShadow /></ProtectedRoute>} />
                      <Route path="/gamecode/:floor/:towerId" element={<ProtectedRoute><GameCode /></ProtectedRoute>} />
                      <Route path="/arena-battle/:battleId" element={<ProtectedRoute><ArenaBattle /></ProtectedRoute>} />
                      <Route path="/grand-arena/:battleId" element={<ProtectedRoute><GrandArena /></ProtectedRoute>} />
                      <Route path="/instructor" element={<ProtectedRoute><InstructorPage /></ProtectedRoute>} />
                      <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
                      <Route path="/tower-prytody" element={<ProtectedRoute><TowerPrytodyView /></ProtectedRoute>} />
                      <Route path="/gamecode-prytody/:floor/:towerId" element={<ProtectedRoute><GameCodePrytody /></ProtectedRoute>} />
                      <Route path="/tower-abyss" element={<ProtectedRoute><TowerAbyssView /></ProtectedRoute>} />
                      <Route path="/gamecode-abyss/:floor/:towerId" element={<ProtectedRoute><GameCodeAbyss /></ProtectedRoute>} />
                      <Route path="/tower-aeterd" element={<ProtectedRoute><TowerAeterdView /></ProtectedRoute>} />
                      <Route path="/gamecode-aeterd/:floor/:towerId" element={<ProtectedRoute><GameCodeAeterd /></ProtectedRoute>} />
                    </Routes>
                  </InactivityGuard>
                </QuestProvider>
              </ThemeProvider>
            </UserProvider>
          </ToastProvider>
        </MusicProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
