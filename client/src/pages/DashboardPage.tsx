import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TodayContainer } from '../components/dashboard/TodayContainer';
import { DailyTrackerCard } from '../components/dashboard/DailyTrackerCard';
import { LoggingStreakCard } from '../components/dashboard/LoggingStreakCard';
import { UpcomingStrip } from '../components/dashboard/UpcomingStrip';
import { NextBestAction } from '../components/dashboard/NextBestAction';
import { AppShell } from '../components/layout/AppShell';
import { Spinner } from '../components/Spinner';
import { api, ApiError, auth } from '../lib/api';
import type { DashboardResponse } from '../lib/progressTypes';

function todayISO(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function emptyDashboard(date = todayISO()): DashboardResponse {
  const zero = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  return {
    date,
    hasProfile: true,
    firstName: null,
    day: {
      date,
      meals: [],
      totals: zero,
      target: null,
      remaining: null,
      goal: null,
      caloriesBurned: 0,
      netCalories: 0,
      water: { totalOz: 0, goalOz: 64, entries: [] },
    },
    streak: 0,
    adherence: [],
    todaysWorkout: null,
    nextWorkout: null,
    insight: null,
    checkin: null,
  };
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackerRefresh, setTrackerRefresh] = useState(0);
  const [todayRefresh, setTodayRefresh] = useState(0);

  const handleMealLogged = useCallback(() => {
    setTrackerRefresh((k) => k + 1);
    setTodayRefresh((k) => k + 1);
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    console.log('[Dashboard] starting load — authenticated:', auth.isAuthenticated, 'token:', !!auth.token);

    const timeoutId = window.setTimeout(() => {
      console.warn('[Dashboard] load exceeded 5s — stopping spinner and showing available data');
      setLoading(false);
      setData((prev) => prev ?? emptyDashboard());
    }, 5000);

    try {
      console.log('[Dashboard] fetching profile…');
      const profile = await api.getProfile();
      console.log('[Dashboard] profile fetch complete:', profile ? 'found' : 'null/404');

      if (!profile) {
        console.log('[Dashboard] no profile — redirecting to /onboarding');
        navigate('/onboarding', { replace: true });
        return;
      }

      console.log('[Dashboard] fetching dashboard data…');
      const dashboard = await api.getDashboard();
      console.log('[Dashboard] dashboard fetch complete:', {
        date: dashboard.date,
        hasProfile: dashboard.hasProfile,
        firstName: dashboard.firstName,
      });
      setData(dashboard);
    } catch (e) {
      console.error('[Dashboard] load failed:', e);
      if (e instanceof ApiError && e.status >= 500) {
        setError(e.message || 'Something went wrong loading your dashboard.');
        return;
      }
      console.warn('[Dashboard] non-fatal error — rendering with empty dashboard data');
      setData((prev) => prev ?? emptyDashboard());
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const title = data?.firstName ? `${greeting()}, ${data.firstName}` : greeting();

  return (
    <AppShell title="Dashboard" subtitle="Your day at a glance">
      {loading && !data ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner label="Loading your dashboard…" />
        </div>
      ) : error && !data ? (
        <div className="mx-auto max-w-xl py-16 text-center">
          <h2 className="section-header">Could not load dashboard</h2>
          <p className="mt-2 text-ink-600">{error}</p>
          <button type="button" onClick={() => void loadDashboard()} className="btn-primary mt-6">
            Try again
          </button>
        </div>
      ) : data ? (
        <section className="flex flex-col gap-4 overflow-hidden">
          <header className="flex-none">
            <h2 className="page-title">{title}</h2>
          </header>

          <NextBestAction date={data.date} day={data.day} workout={data.todaysWorkout} />

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2">
            <TodayContainer
              date={data.date}
              goal={data.day.goal}
              className="md:h-full"
              refreshKey={todayRefresh}
              onMealLogged={() => setTrackerRefresh((k) => k + 1)}
            />

            <div className="flex min-h-0 flex-col gap-4 md:h-full">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DailyTrackerCard
                  date={data.date}
                  className="min-h-[180px] w-full md:aspect-square md:min-h-0"
                  onUpdate={handleMealLogged}
                />
                <LoggingStreakCard
                  refreshKey={trackerRefresh}
                  className="min-h-[180px] w-full md:aspect-square md:min-h-0"
                />
              </div>
              <UpcomingStrip className="min-h-[140px] flex-1" />
            </div>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
