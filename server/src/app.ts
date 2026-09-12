import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import './db/index.js'; // initialize schema on boot
import { initMealPool, scheduleMealPoolRefresh } from './services/mealPool.js';
import { initExercisePool, scheduleExercisePoolRefresh } from './services/exercisePool.js';
import { attachUser } from './auth/middleware.js';
import authRouter from './routes/auth.js';
import aiRouter from './routes/ai.js';
import profileRouter from './routes/profile.js';
import foodsRouter from './routes/foods.js';
import logRouter from './routes/log.js';
import waterRouter from './routes/water.js';
import templatesRouter from './routes/templates.js';
import recipesRouter from './routes/recipes.js';
import suggestionsRouter from './routes/suggestions.js';
import workoutsRouter from './routes/workouts.js';
import exercisesRouter from './routes/exercises.js';
import dashboardRouter from './routes/dashboard.js';
import progressRouter, { logWeightHandler } from './routes/progress.js';
import checkinRouter from './routes/checkin.js';
import supplementsRouter from './routes/supplements.js';
import importRouter from './routes/import.js';
import groceryRouter from './routes/grocery.js';
import { isVercel, uploadsDir } from './runtimePaths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
let readyPromise: Promise<void> | null = null;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Resolve the authenticated user (if a Bearer token is present) for every route.
app.use(attachUser);

// Serve uploaded progress photos.
app.use('/uploads', express.static(uploadsDir(path.resolve(__dirname, '../uploads'))));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
// Food search/lookup is exposed under both /api/foods (legacy) and /api/food (spec 5.2).
app.use('/api/foods', foodsRouter);
app.use('/api/food', foodsRouter);
app.use('/api/log', logRouter);
app.use('/api/water', waterRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/suggestions', suggestionsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/workouts', workoutsRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/progress', progressRouter);
app.post('/api/weight', logWeightHandler); // spec 5.2 alias for logging a weigh-in
app.use('/api/checkin', checkinRouter);
app.use('/api/supplements', supplementsRouter);
app.use('/api/import', importRouter);
app.use('/api/grocery', groceryRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export function prepareApp(): Promise<void> {
  readyPromise ??= (async () => {
    if (isVercel) return;

    await initMealPool();
    scheduleMealPoolRefresh();
    await initExercisePool();
    scheduleExercisePoolRefresh();
  })();

  return readyPromise;
}

export default app;
