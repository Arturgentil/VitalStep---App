import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import NavRail from './NavRail';
import MobileNav from './MobileNav';
import TopBar from './TopBar';
import { useApp } from '@/lib/store';
import DemoNotice from '@/components/sv/DemoNotice';

export default function AppShell() {
  const { profile, profileLoading, demoMode } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!profileLoading && (!profile || profile.onboarded === false)) navigate('/onboarding', { replace: true });
  }, [profile, profileLoading, navigate]);

  return (
    <div className="min-h-screen">
      <NavRail />
      <div className="lg:pl-[248px]">
        <TopBar />
        {demoMode && (
          <div className="mx-auto max-w-[1400px] px-4 pt-3 sm:px-6">
            <DemoNotice />
          </div>
        )}
        <main className="mx-auto max-w-[1400px] px-4 pb-28 pt-4 sm:px-6 lg:pb-12">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}