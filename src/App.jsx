import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import { AppProvider } from '@/lib/store';
import AppShell from '@/components/shell/AppShell';
import Onboarding from '@/pages/Onboarding';
import Dashboard from '@/pages/Dashboard';
import ActivityPage from '@/pages/Activity';
import ActivityDetail from '@/pages/ActivityDetail';
import Trajectory from '@/pages/Trajectory';
import Health from '@/pages/Health';
import Energy from '@/pages/Energy';
import Device from '@/pages/Device';
import Biomechanics from '@/pages/Biomechanics';
import Intelligence from '@/pages/Intelligence';
import Goals from '@/pages/Goals';
import Community from '@/pages/Community';
import Safety from '@/pages/Safety';
import Docs from '@/pages/Docs';
import Profile from '@/pages/Profile';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  if (authError?.type === 'auth_required') {
    navigateToLogin();
    return null;
  }

  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/atividade" element={<ActivityPage />} />
        <Route path="/atividade/:id" element={<ActivityDetail />} />
        <Route path="/mapa" element={<Trajectory />} />
        <Route path="/saude" element={<Health />} />
        <Route path="/energia" element={<Energy />} />
        <Route path="/biomecanica" element={<Biomechanics />} />
        <Route path="/dispositivo" element={<Device />} />
        <Route path="/inteligencia" element={<Intelligence />} />
        <Route path="/metas" element={<Goals />} />
        <Route path="/comunidade" element={<Community />} />
        <Route path="/seguranca" element={<Safety />} />
        <Route path="/protocolo" element={<Docs />} />
        <Route path="/perfil" element={<Profile />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AppProvider>
            <ScrollToTop />
            <AuthenticatedApp />
          </AppProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App