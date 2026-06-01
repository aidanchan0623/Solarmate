import { useEffect, useState } from 'react';
import { getConsumerProfile, getCurrentUser, getProsumerProfile, getStoredToken, setStoredToken } from './api/client';
import OnboardingModal from './components/OnboardingModal';
import AdminDashboard from './pages/admin/AdminDashboard';
import ConsumerDashboard from './pages/consumer/ConsumerDashboard';
import Login from './pages/Login';
import ProsumerDashboard from './pages/prosumer/ProsumerDashboard';

const dashboardByRole = {
  prosumer: ProsumerDashboard,
  consumer: ConsumerDashboard,
  admin: AdminDashboard
};

export default function App() {
  const [session, setSession] = useState({ user: null, profile: null });
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (!getStoredToken()) {
        setCheckingSession(false);
        return;
      }
      try {
        const user = await getCurrentUser();
        if (cancelled) return;
        const profile = await fetchProfile(user);
        if (!cancelled) setSession({ user, profile });
      } catch {
        setStoredToken(null);
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function fetchProfile(user) {
    if (user.role === 'prosumer') return getProsumerProfile();
    if (user.role === 'consumer') return getConsumerProfile();
    return null;
  }

  async function handleLogin(user) {
    const profile = await fetchProfile(user);
    setSession({ user, profile });
  }

  function handleLogout() {
    setStoredToken(null);
    setSession({ user: null, profile: null });
  }

  function handleOnboardingComplete(profile) {
    setSession((current) => ({
      user: current.user ? { ...current.user, has_completed_onboarding: true } : current.user,
      profile
    }));
  }

  function handleProfileUpdate(profile) {
    setSession((current) => ({
      ...current,
      user: current.user ? { ...current.user, has_completed_onboarding: true } : current.user,
      profile
    }));
  }

  if (checkingSession) {
    return (
      <main className="login-page">
        <section className="login-hero">
          <div className="brand-block">
            <div className="logo-mark" />
            <div>
              <strong>SolarMate</strong>
              <span>Loading secure session...</span>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!session.user) {
    return <Login onLogin={handleLogin} />;
  }

  const Dashboard = dashboardByRole[session.user.role];

  return (
    <>
      <Dashboard
        onProfileUpdate={handleProfileUpdate}
        onLogout={handleLogout}
        profile={session.profile}
        user={session.user}
        username={session.user.username}
      />
      <OnboardingModal
        onComplete={handleOnboardingComplete}
        onLogout={handleLogout}
        open={session.user.role !== 'admin' && !session.user.has_completed_onboarding}
        user={session.user}
      />
    </>
  );
}
