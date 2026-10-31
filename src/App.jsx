import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import {
  BrowserRouter as Router,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

import PageNotFound from "./lib/PageNotFound";
import { AuthProvider } from "@/lib/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";
import { AppProvider } from "@/lib/store";

import AppShell from "@/components/shell/AppShell";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import ActivityPage from "@/pages/Activity";
import ActivityDetail from "@/pages/ActivityDetail";
import Trajectory from "@/pages/Trajectory";
import Health from "@/pages/Health";
import Energy from "@/pages/Energy";
import Device from "@/pages/Device";
import Biomechanics from "@/pages/Biomechanics";
import Intelligence from "@/pages/Intelligence";
import Goals from "@/pages/Goals";
import Community from "@/pages/Community";
import Safety from "@/pages/Safety";
import Docs from "@/pages/Docs";
import Profile from "@/pages/Profile";

function AppProviderLayout() {
  return (
    <AppProvider>
      <Outlet />
    </AppProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />

          <Routes>
            {/* Rotas públicas: não montam o AppProvider. */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Rotas privadas: exigem autenticação Supabase. */}
            <Route
              element={
                <ProtectedRoute
                  unauthenticatedElement={<Navigate to="/login" replace />}
                />
              }
            >
              <Route element={<AppProviderLayout />}>
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
              </Route>
            </Route>

            <Route path="*" element={<PageNotFound />} />
          </Routes>

          <Toaster />
        </Router>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
