import { useEffect, type ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { UserRole } from './contract/types';
import { useAuthStore } from './core/authStore';
import AppShell from './pages/AppShell';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import { homePathFor } from './pages/paths';
import { AlertOverlay, startAlertEngine } from './segments/alerts';
import { AnalysisPage, startTripRecorder } from './segments/analysis';
import { LinkPanel, ParentDashboard, startChildCareSync } from './segments/childcare';

function RoleHome() {
  const role = useAuthStore((s) => s.role);
  return <Navigate to={homePathFor(role)} replace />;
}

function RequireRole({ allow, children }: { allow: UserRole[]; children: ReactElement }) {
  const role = useAuthStore((s) => s.role);
  return role && allow.includes(role) ? children : <Navigate to={homePathFor(role)} replace />;
}

export default function App() {
  useEffect(() => {
    void useAuthStore.getState().init();
    // each segment's listeners start once; they only talk through the event bus
    const stops = [startAlertEngine(), startChildCareSync(), startTripRecorder()];
    return () => stops.forEach((stop) => stop());
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppShell />}>
          <Route index element={<RoleHome />} />
          <Route path="trip" element={<HomePage />} />
          <Route path="analysis" element={<AnalysisPage />} />
          <Route
            path="link"
            element={
              <RequireRole allow={['child']}>
                <LinkPanel />
              </RequireRole>
            }
          />
          <Route
            path="dashboard"
            element={
            <RequireRole allow={['adult']}>
              <ParentDashboard />
            </RequireRole>
            }
            
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AlertOverlay />
    </BrowserRouter>
  );
}