import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import './index.css';
import { AppNotifications } from './components/AppNotifications';
import { RequireAuth } from './components/auth/RequireAuth';
import { GuestOnly } from './components/auth/GuestOnly';
import { RootRedirect } from './pages/RootRedirect';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { Onboarding } from './pages/Onboarding';
import { ProfilePage } from './pages/ProfilePage';
import { LogPage } from './pages/LogPage';
import { WorkoutsPage } from './pages/WorkoutsPage';
import { WorkoutsCustomPage } from './pages/WorkoutsCustomPage';
import { WorkoutsLogPage } from './pages/WorkoutsLogPage';
import { ActiveWorkoutPage } from './pages/ActiveWorkoutPage';
import { WorkoutHistoryPage } from './pages/WorkoutHistoryPage';
import { GroceryPage } from './pages/GroceryPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProgressPage } from './pages/ProgressPage';
import { CoachPage } from './pages/CoachPage';

const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  {
    path: '/login',
    element: (
      <GuestOnly>
        <LoginPage />
      </GuestOnly>
    ),
  },
  {
    path: '/signup',
    element: (
      <GuestOnly>
        <SignupPage />
      </GuestOnly>
    ),
  },
  {
    element: <RequireAuth />,
    children: [
      { path: '/onboarding', element: <Onboarding /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/grocery', element: <GroceryPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/log', element: <LogPage /> },
      { path: '/workouts', element: <WorkoutsPage /> },
      { path: '/workouts/custom', element: <WorkoutsCustomPage /> },
      { path: '/workouts/log', element: <WorkoutsLogPage /> },
      { path: '/workouts/active', element: <ActiveWorkoutPage /> },
      { path: '/workouts/history', element: <WorkoutHistoryPage /> },
      { path: '/progress', element: <ProgressPage /> },
      { path: '/coach', element: <CoachPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
], {
  basename: import.meta.env.BASE_URL,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppNotifications />
    <RouterProvider router={router} />
  </React.StrictMode>,
);
