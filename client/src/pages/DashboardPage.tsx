import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TodayDataProvider,
  TodayHero,
  TodayHighlights,
} from '../components/dashboard/TodayContainer';
import { DailyTrackerCard } from '../components/dashboard/DailyTrackerCard';
import { LoggingStreakCard } from '../components/dashboard/LoggingStreakCard';
import { UpcomingStrip } from '../components/dashboard/UpcomingStrip';
import { NextBestAction } from '../components/dashboard/NextBestAction';
import { AppShell } from '../components/layout/AppShell';
import { Spinner } from '../components/Spinner';
import { api, ApiError } from '../lib/api';
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

    const timeoutId = window.setTimeout(() => {
      setLoading(false);
      setData((prev) => prev ?? emptyDashboard());
    }, 5000);

    try {
      const profile = await api.getProfile();
      if (!profile) {
        navigate('/onboarding', { replace: true });
        return;
      }
      const dashboard = await api.getDashboard();
      setData(dashboard);
    } catch (e) {
      if (e instanceof ApiError && e.status >= 500) {
        setError(e.message || 'Something went wrong loading your dashboard.');
        return;
      }
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
    <AppShell title="Dashboard" mobileTitle={title} maxWidth="max-w-5xl">
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
        <TodayDataProvider date={data.date} refreshKey={todayRefresh}>
          <section className="flex flex-col gap-8 pb-4 lg:gap-10">
            <TodayHero date={data.date} className="-mt-2 lg:mt-0" />

            <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch">
              <div className="grouped-section mb-0 flex flex-col">
                <h2 className="grouped-header">Meals</h2>
                <DailyTrackerCard
                  date={data.date}
                  onUpdate={handleMealLogged}
                  className="h-full"
                />
              </div>

              <NextBestAction
                date={data.date}
                day={data.day}
                workout={data.todaysWorkout}
                className="h-full"
              />
            </div>

            <TodayHighlights
              date={data.date}
              goal={data.day.goal}
              onMealLogged={handleMealLogged}
            />

            <div className="grouped-section">
              <h2 className="grouped-header">Activity</h2>
              <div className="space-y-4">
                <LoggingStreakCard refreshKey={trackerRefresh} />
                <UpcomingStrip />
              </div>
            </div>
          </section>
        </TodayDataProvider>
      ) : null}
    </AppShell>
  );
}
