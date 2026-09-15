import type {
  GenerateGroceryInput,
  GroceryMealDetailResponse,
  GroceryPlanRecord,
  MealSwapAlternative,
} from './groceryTypes';
import type { NutritionTargets, Profile, ProfileInput, ProgressPhoto } from './types';
import type {
  DaySummary,
  FoodItem,
  FuelScore,
  LogEntry,
  LogSummary,
  MealSlot,
  MealTemplate,
  NutritionPer100g,
  Recipe,
  RecipeIngredient,
  ScoredFood,
  SuggestionResponse,
  TemplateItem,
} from './foodTypes';
import type {
  CustomSplitConfig,
  CustomSplitRecord,
} from './customSplitTypes';
import type {
  CheckinRecord,
  DashboardResponse,
  LoggingStreakResponse,
  ProgressSummary,
  WeightPoint,
  WeightRange,
  WeightSeriesResponse,
} from './progressTypes';
import type {
  LoggedSet,
  PlanExercise,
  PlanInput,
  WorkoutLog,
  WorkoutPlanRecord,
  WorkoutSchedulePreferences,
  WorkoutStats,
  WorkoutType,
} from './workoutTypes';
import {
  demoAddEntry,
  demoAddSupplement,
  demoCheckin,
  demoDashboard,
  demoDay,
  demoFinishWorkout,
  demoGenerateGroceryPlan,
  demoGrocerySwapAlternatives,
  demoLogSummary,
  demoLogWeight,
  demoLoggingStreak,
  demoPhotos,
  demoPreviewTargets,
  demoProfile,
  demoProgressSummary,
  demoRecipes,
  demoSaveProfile,
  demoSearchFoods,
  demoSuggestions,
  demoSupplements,
  demoSwapGroceryMeal,
  demoTemplates,
  demoWeightSeries,
  demoWorkoutLogs,
  demoWorkoutPlan,
  demoWorkoutPlanFromInput,
  demoWorkoutStats,
} from './demoData';

const TOKEN_KEY = 'fueliq.token';
const GUEST_TOKEN = 'demo:max';
const LOCAL_TOKEN_PREFIX = 'local:';
const LOCAL_USERS_KEY = 'fueliq.local.users';
const LAST_USERNAME_KEY = 'fueliq.username';
const GUEST_GROCERY_PLAN_KEY = 'fueliq.demo.groceryPlan';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

export function isStaticPagesBuildWithoutApi(): boolean {
  return window.location.hostname.endsWith('github.io') && API_BASE_URL === '';
}

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' && input.startsWith('/api') ? apiUrl(input) : input;
  return globalThis.fetch(url, init);
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export const auth = {
  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  set(token: string | null) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  },
  get isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  },
  get isGuest(): boolean {
    return localStorage.getItem(TOKEN_KEY) === GUEST_TOKEN;
  },
  get isLocal(): boolean {
    return localStorage.getItem(TOKEN_KEY)?.startsWith(LOCAL_TOKEN_PREFIX) ?? false;
  },
  startGuestSession() {
    localStorage.setItem(TOKEN_KEY, GUEST_TOKEN);
  },
  startLocalSession(username: string) {
    const normalized = normalizeUsername(username);
    localStorage.setItem(TOKEN_KEY, `${LOCAL_TOKEN_PREFIX}${encodeURIComponent(normalized)}`);
    localStorage.setItem(LAST_USERNAME_KEY, normalized);
  },
};

function headers(
  extra?: Record<string, string>,
  opts?: { withAuth?: boolean },
): HeadersInit {
  const base: Record<string, string> = { ...extra };
  if (opts?.withAuth !== false) {
    const token = auth.token;
    if (token) base.Authorization = `Bearer ${token}`;
  }
  return base;
}

function getGuestGroceryPlan(): GroceryPlanRecord | null {
  const raw = localStorage.getItem(GUEST_GROCERY_PLAN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GroceryPlanRecord;
  } catch {
    localStorage.removeItem(GUEST_GROCERY_PLAN_KEY);
    return null;
  }
}

function setGuestGroceryPlan(plan: GroceryPlanRecord | null): void {
  if (plan) localStorage.setItem(GUEST_GROCERY_PLAN_KEY, JSON.stringify(plan));
  else localStorage.removeItem(GUEST_GROCERY_PLAN_KEY);
}

interface LocalUserRecord {
  username: string;
  passwordHash: string;
  createdAt: string;
  profile?: Profile;
}

function getLocalUsers(): Record<string, LocalUserRecord> {
  const raw = localStorage.getItem(LOCAL_USERS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, LocalUserRecord>;
  } catch {
    localStorage.removeItem(LOCAL_USERS_KEY);
    return {};
  }
}

function saveLocalUsers(users: Record<string, LocalUserRecord>): void {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

async function localPasswordHash(username: string, password: string): Promise<string> {
  const input = `${normalizeUsername(username)}:${password}`;
  if (!globalThis.crypto?.subtle) return input;
  const data = new TextEncoder().encode(input);
  const hash = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function currentLocalUsername(): string | null {
  const token = auth.token;
  if (token?.startsWith(LOCAL_TOKEN_PREFIX)) {
    return decodeURIComponent(token.slice(LOCAL_TOKEN_PREFIX.length));
  }
  return localStorage.getItem(LAST_USERNAME_KEY);
}

async function rememberLocalCredentials(
  username: string,
  password: string,
  createdAt = new Date().toISOString(),
): Promise<void> {
  const normalized = normalizeUsername(username);
  const users = getLocalUsers();
  users[normalized] = {
    ...users[normalized],
    username: normalized,
    passwordHash: await localPasswordHash(normalized, password),
    createdAt: users[normalized]?.createdAt ?? createdAt,
  };
  saveLocalUsers(users);
  localStorage.setItem(LAST_USERNAME_KEY, normalized);
}

async function localLogin(username: string, password: string): Promise<PublicUser | null> {
  const normalized = normalizeUsername(username);
  const record = getLocalUsers()[normalized];
  if (!record) return null;
  if (record.passwordHash !== (await localPasswordHash(normalized, password))) return null;
  auth.startLocalSession(normalized);
  return { id: `local-${normalized}`, username: normalized, email: normalized, createdAt: record.createdAt };
}

function getLocalProfile(): Profile | null {
  const username = currentLocalUsername();
  if (!username) return null;
  return getLocalUsers()[normalizeUsername(username)]?.profile ?? null;
}

function saveLocalProfile(profile: Profile): void {
  const username = currentLocalUsername();
  if (!username) return;
  const normalized = normalizeUsername(username);
  const users = getLocalUsers();
  const existing = users[normalized];
  if (!existing) return;
  users[normalized] = { ...existing, profile };
  saveLocalUsers(users);
}

export interface PublicUser {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Supplement {
  id: number;
  name: string;
  dose: string | null;
  notes: string | null;
  createdAt: string;
}

export interface SupplementWithStreak extends Supplement {
  streak: number;
  loggedToday: boolean;
}

export interface MfpImportResult {
  imported: number;
  skipped: number;
  dateRange: { from: string | null; to: string | null };
  avgFuelScore: number | null;
  errors: string[];
}

export class ApiError extends Error {
  status: number;
  issues?: unknown;
  constructor(status: number, message: string, issues?: unknown) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

function errorMessage(body: { error?: unknown }): string | null {
  if (typeof body.error === 'string') return body.error;
  if (
    body.error &&
    typeof body.error === 'object' &&
    'message' in body.error &&
    typeof body.error.message === 'string'
  ) {
    return body.error.message;
  }
  return null;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 401) {
      auth.set(null);
      const path = window.location.pathname;
      const appBase = import.meta.env.BASE_URL;
      if (!path.startsWith(`${appBase}login`) && !path.startsWith(`${appBase}signup`)) {
        window.location.assign(`${appBase}login`);
      }
    }
    let body: { error?: unknown; issues?: unknown } = {};
    try {
      body = await res.json();
    } catch {
      /* ignore non-JSON bodies */
    }
    throw new ApiError(res.status, errorMessage(body) || res.statusText, body.issues);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // --- Chunk 5: auth ----------------------------------------------------
  async viewAsGuest(): Promise<PublicUser> {
    auth.startGuestSession();
    return {
      id: demoProfile.userId,
      username: 'max',
      email: 'max',
      createdAt: demoProfile.createdAt,
    };
  },

  async register(username: string, password: string): Promise<PublicUser> {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }, { withAuth: false }),
      body: JSON.stringify({ username, password }),
    });
    const data = await handle<{ token: string; user: PublicUser }>(res);
    await rememberLocalCredentials(username, password, data.user.createdAt);
    auth.set(data.token);
    return data.user;
  },

  async login(username: string, password: string): Promise<PublicUser> {
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: headers({ 'Content-Type': 'application/json' }, { withAuth: false }),
        body: JSON.stringify({ username, password }),
      });
      const data = await handle<{ token: string; user: PublicUser }>(res);
      await rememberLocalCredentials(username, password, data.user.createdAt);
      auth.set(data.token);
      return data.user;
    } catch (err) {
      const localUser = await localLogin(username, password);
      if (localUser) return localUser;
      throw err;
    }
  },

  async logout(): Promise<void> {
    try {
      if (auth.token) {
        await apiFetch('/api/auth/logout', { method: 'POST', headers: headers() });
      }
    } finally {
      auth.set(null);
    }
  },

  async me(): Promise<PublicUser | null> {
    if (!auth.isAuthenticated) return null;
    if (auth.isGuest) {
      return {
        id: demoProfile.userId,
        username: 'max',
        email: 'max',
        createdAt: demoProfile.createdAt,
      };
    }
    const res = await apiFetch('/api/auth/me', { headers: headers() });
    if (res.status === 401 || res.status === 404) {
      auth.set(null);
      return null;
    }
    return (await handle<{ user: PublicUser }>(res)).user;
  },

  async coachInsights(): Promise<{ insights: string[] }> {
    if (auth.isGuest) {
      return {
        insights: [
          'Max is close to target calories today.',
          'Dinner should prioritize lean protein and colorful carbs.',
          'Training volume is trending up without a weight spike.',
        ],
      };
    }
    const res = await apiFetch('/api/ai/coach/insights', { headers: headers() });
    return handle(res);
  },

  async chat(messages: ChatMessage[]): Promise<{ reply: string }> {
    if (auth.isGuest) {
      const latest = messages.at(-1)?.content.toLowerCase() ?? '';
      return {
        reply: latest.includes('workout')
          ? "For Max, I would keep today's session around 50 minutes: press, row, shoulder work, then face pulls. The goal is steady progressive overload without draining recovery."
          : "Looking at Max's demo day, he is in a good spot: protein is strong, water is on pace, and dinner can finish the day cleanly with salmon, rice, and vegetables.",
      };
    }
    const res = await apiFetch('/api/ai/chat', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ messages }),
    });
    return handle(res);
  },

  /** SSE stream: yields text deltas for a smoother reply animation. */
  async chatStream(
    messages: ChatMessage[],
    onDelta: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    if (auth.isGuest) {
      const fallback = await api.chat(messages);
      onDelta(fallback.reply);
      return;
    }
    const res = await apiFetch('/api/ai/chat/stream', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ messages }),
      signal,
    });
    if (!res.ok) {
      const fallback = await api.chat(messages);
      onDelta(fallback.reply);
      return;
    }
    const reader = res.body?.getReader();
    if (!reader) {
      const fallback = await api.chat(messages);
      onDelta(fallback.reply);
      return;
    }
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const payload = JSON.parse(line.slice(6)) as {
            type: string;
            text?: string;
            reply?: string;
            message?: string;
          };
          if (payload.type === 'delta' && payload.text) onDelta(payload.text);
          if (payload.type === 'error') throw new Error(payload.message ?? 'Stream error');
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
  },

  // --- Chunk 7: supplements ---------------------------------------------
  async listSupplements(date?: string): Promise<SupplementWithStreak[]> {
    if (auth.isGuest) return demoSupplements();
    const qs = date ? `?date=${date}` : '';
    const res = await apiFetch(`/api/supplements${qs}`, { headers: headers() });
    return (await handle<{ supplements: SupplementWithStreak[] }>(res)).supplements;
  },

  async addSupplement(name: string, dose?: string, notes?: string): Promise<Supplement> {
    if (auth.isGuest) return demoAddSupplement(name, dose, notes);
    const res = await apiFetch('/api/supplements', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name, dose, notes }),
    });
    return (await handle<{ supplement: Supplement }>(res)).supplement;
  },

  async deleteSupplement(id: number): Promise<void> {
    if (auth.isGuest) return;
    await handle(await apiFetch(`/api/supplements/${id}`, { method: 'DELETE', headers: headers() }));
  },

  async toggleSupplementLog(id: number, date: string, log: boolean): Promise<SupplementWithStreak[]> {
    if (auth.isGuest) {
      return demoSupplements().map((item) =>
        item.id === id ? { ...item, loggedToday: log, streak: log ? Math.max(item.streak, 1) : item.streak } : item,
      );
    }
    if (log) {
      const res = await apiFetch(`/api/supplements/${id}/log`, {
        method: 'POST',
        headers: headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ date }),
      });
      return (await handle<{ supplements: SupplementWithStreak[] }>(res)).supplements;
    }
    const res = await apiFetch(`/api/supplements/${id}/log?date=${date}`, {
      method: 'DELETE',
      headers: headers(),
    });
    return (await handle<{ supplements: SupplementWithStreak[] }>(res)).supplements;
  },

  // --- Chunk 7: MFP import ----------------------------------------------
  async importMfpCsv(csv: string): Promise<MfpImportResult> {
    if (auth.isGuest) {
      return { imported: 8, skipped: 1, dateRange: { from: '2026-09-01', to: '2026-09-07' }, avgFuelScore: 81, errors: [] };
    }
    const res = await apiFetch('/api/import/mfp', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ csv }),
    });
    return handle<MfpImportResult>(res);
  },

  async getProfile(): Promise<Profile | null> {
    if (auth.isGuest) return demoProfile;
    if (auth.isLocal) return getLocalProfile();
    const authHeaders = headers();
    const hasAuth = Boolean((authHeaders as Record<string, string>).Authorization);
    console.log('[api] GET /api/profile — Authorization header:', hasAuth ? 'present' : 'missing');
    const res = await apiFetch('/api/profile', { headers: authHeaders });
    console.log('[api] GET /api/profile — status:', res.status);
    if (res.status === 404) {
      const localProfile = getLocalProfile();
      const username = currentLocalUsername();
      if (localProfile && username) {
        auth.startLocalSession(username);
        return localProfile;
      }
      return null;
    }
    const profile = await handle<Profile>(res);
    saveLocalProfile(profile);
    return profile;
  },

  async saveProfile(input: ProfileInput): Promise<Profile> {
    if (auth.isGuest) return demoSaveProfile(input);
    if (auth.isLocal) {
      const profile = demoSaveProfile(input);
      saveLocalProfile(profile);
      return profile;
    }
    const res = await apiFetch('/api/profile', {
      method: 'PUT',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(input),
    });
    const profile = await handle<Profile>(res);
    saveLocalProfile(profile);
    return profile;
  },

  async previewTargets(input: ProfileInput): Promise<NutritionTargets> {
    if (auth.isGuest) return demoPreviewTargets();
    const res = await apiFetch('/api/profile/preview', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(input),
    });
    return handle<NutritionTargets>(res);
  },

  async getTargets(): Promise<NutritionTargets> {
    if (auth.isGuest) return demoProfile.targets;
    if (auth.isLocal) return getLocalProfile()?.targets ?? demoProfile.targets;
    const res = await apiFetch('/api/profile/targets', { headers: headers() });
    return handle<NutritionTargets>(res);
  },

  async getWorkoutSchedule(): Promise<WorkoutSchedulePreferences | null> {
    if (auth.isGuest) return demoProfile.workoutSchedule ?? null;
    if (auth.isLocal) return getLocalProfile()?.workoutSchedule ?? null;
    const res = await apiFetch('/api/profile/workout-schedule', { headers: headers() });
    if (res.status === 404) return null;
    return (await handle<{ schedule: WorkoutSchedulePreferences | null }>(res)).schedule;
  },

  async saveWorkoutSchedule(
    schedule: WorkoutSchedulePreferences,
  ): Promise<{ schedule: WorkoutSchedulePreferences; plan: WorkoutPlanRecord | null }> {
    if (auth.isGuest) return { schedule, plan: demoWorkoutPlan };
    const res = await apiFetch('/api/profile/workout-schedule', {
      method: 'PUT',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(schedule),
    });
    return handle(res);
  },

  async getPantry(): Promise<string[]> {
    if (auth.isGuest) return demoProfile.pantry ?? [];
    if (auth.isLocal) return getLocalProfile()?.pantry ?? [];
    const res = await apiFetch('/api/profile/pantry', { headers: headers() });
    return (await handle<{ pantry: string[] }>(res)).pantry;
  },

  async savePantry(pantry: string[]): Promise<string[]> {
    if (auth.isGuest) return pantry;
    if (auth.isLocal) {
      const profile = getLocalProfile();
      if (profile) saveLocalProfile({ ...profile, pantry });
      return pantry;
    }
    const res = await apiFetch('/api/profile/pantry', {
      method: 'PUT',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ pantry }),
    });
    return (await handle<{ pantry: string[] }>(res)).pantry;
  },

  async listPhotos(): Promise<ProgressPhoto[]> {
    if (auth.isGuest) return demoPhotos;
    const res = await apiFetch('/api/profile/photos', { headers: headers() });
    return handle<ProgressPhoto[]>(res);
  },

  async uploadPhoto(file: File, weightKg?: number | null): Promise<ProgressPhoto> {
    if (auth.isGuest) {
      return { id: Date.now(), url: URL.createObjectURL(file), weightKg: weightKg ?? null, takenAt: new Date().toISOString() };
    }
    const form = new FormData();
    form.append('photo', file);
    if (weightKg != null) form.append('weightKg', String(weightKg));
    const res = await apiFetch('/api/profile/photos', {
      method: 'POST',
      headers: headers(),
      body: form,
    });
    return handle<ProgressPhoto>(res);
  },

  // --- Chunk 2: food logging -------------------------------------------
  async searchFoods(query: string, limit = 20): Promise<ScoredFood[]> {
    if (auth.isGuest) return demoSearchFoods(query, limit);
    const res = await apiFetch(
      `/api/foods/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      { headers: headers() },
    );
    const data = await handle<{ foods: ScoredFood[] }>(res);
    return data.foods;
  },

  async lookupBarcode(code: string): Promise<ScoredFood | null> {
    if (auth.isGuest) return demoSearchFoods(code, 1)[0] ?? null;
    const res = await apiFetch(`/api/foods/barcode/${encodeURIComponent(code)}`, {
      headers: headers(),
    });
    if (res.status === 404) return null;
    const data = await handle<{ food: ScoredFood }>(res);
    return data.food;
  },

  async scoreFood(
    per100: NutritionPer100g,
    novaGroup: number | null,
    micronutrientCount: number,
  ): Promise<FuelScore> {
    if (auth.isGuest) return demoSearchFoods('', 1)[0].fuelScore;
    const res = await apiFetch('/api/foods/score', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ per100, novaGroup, micronutrientCount }),
    });
    return handle<FuelScore>(res);
  },

  async getDay(date: string): Promise<DaySummary> {
    if (auth.isGuest) return demoDay(date);
    const res = await apiFetch(`/api/log?date=${date}`, { headers: headers() });
    return handle<DaySummary>(res);
  },

  async getLogSummary(date: string): Promise<LogSummary> {
    if (auth.isGuest) return demoLogSummary(date);
    const res = await apiFetch(`/api/log/summary?date=${date}`, { headers: headers() });
    return handle<LogSummary>(res);
  },

  async addEntry(
    date: string,
    meal: MealSlot,
    food: FoodItem,
    quantityG: number,
    servingLabel?: string,
  ): Promise<{ entry: LogEntry; day: DaySummary }> {
    if (auth.isGuest) return demoAddEntry(date, meal, food, quantityG);
    const res = await apiFetch('/api/log/entry', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ date, meal, food, quantityG, servingLabel }),
    });
    return handle<{ entry: LogEntry; day: DaySummary }>(res);
  },

  async updateEntry(
    id: number,
    quantityG: number,
    servingLabel?: string,
  ): Promise<{ entry: LogEntry; day: DaySummary }> {
    if (auth.isGuest) {
      const day = demoDay(new Date().toISOString().slice(0, 10));
      const entry = day.meals.flatMap((meal) => meal.entries).find((item) => item.id === id) ?? day.meals[0].entries[0];
      return { entry: { ...entry, quantityG, servingLabel: servingLabel ?? entry.servingLabel }, day };
    }
    const res = await apiFetch(`/api/log/entry/${id}`, {
      method: 'PATCH',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ quantityG, servingLabel }),
    });
    return handle<{ entry: LogEntry; day: DaySummary }>(res);
  },

  async deleteEntry(id: number, date: string): Promise<DaySummary> {
    if (auth.isGuest) {
      const day = demoDay(date);
      day.meals.forEach((meal) => {
        meal.entries = meal.entries.filter((entry) => entry.id !== id);
      });
      return day;
    }
    const res = await apiFetch(`/api/log/entry/${id}?date=${date}`, {
      method: 'DELETE',
      headers: headers(),
    });
    const data = await handle<{ day: DaySummary }>(res);
    return data.day;
  },

  async recentFoods(): Promise<ScoredFood[]> {
    if (auth.isGuest) return demoSearchFoods('', 6);
    const res = await apiFetch('/api/log/recent', { headers: headers() });
    return (await handle<{ foods: ScoredFood[] }>(res)).foods;
  },

  async frequentFoods(): Promise<ScoredFood[]> {
    if (auth.isGuest) return demoSearchFoods('', 6);
    const res = await apiFetch('/api/log/frequent', { headers: headers() });
    return (await handle<{ foods: ScoredFood[] }>(res)).foods;
  },

  async getSuggestions(
    remaining: { protein: number; carbs: number; fat: number },
    goal: string,
  ): Promise<SuggestionResponse> {
    if (auth.isGuest) return demoSuggestions();
    const params = new URLSearchParams({
      remaining_protein: String(Math.round(remaining.protein)),
      remaining_carbs: String(Math.round(remaining.carbs)),
      remaining_fat: String(Math.round(remaining.fat)),
      goal,
    });
    const res = await apiFetch(`/api/suggestions?${params}`, { headers: headers() });
    return handle<SuggestionResponse>(res);
  },

  // --- Water ------------------------------------------------------------
  async getWater(date: string): Promise<{ date: string; totalOz: number; entries: { id: number; oz: number }[] }> {
    if (auth.isGuest) {
      const day = demoDay(date);
      return { date, ...day.water };
    }
    const res = await apiFetch(`/api/water?date=${date}`, { headers: headers() });
    return handle(res);
  },

  async addWater(date: string, oz: number): Promise<DaySummary['water'] & { date: string }> {
    if (auth.isGuest) {
      const day = demoDay(date);
      return {
        date,
        totalOz: day.water.totalOz + oz,
        goalOz: day.water.goalOz,
        entries: [...day.water.entries, { id: Date.now(), oz }],
      };
    }
    const res = await apiFetch('/api/water', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ date, oz }),
    });
    return handle(res);
  },

  // --- Templates --------------------------------------------------------
  async listTemplates(): Promise<MealTemplate[]> {
    if (auth.isGuest) return demoTemplates;
    const res = await apiFetch('/api/templates', { headers: headers() });
    return (await handle<{ templates: MealTemplate[] }>(res)).templates;
  },

  async createTemplate(name: string, items: TemplateItem[]): Promise<MealTemplate> {
    if (auth.isGuest) {
      return {
        id: Date.now(),
        name,
        items,
        totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        createdAt: new Date().toISOString(),
      };
    }
    const res = await apiFetch('/api/templates', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name, items }),
    });
    return (await handle<{ template: MealTemplate }>(res)).template;
  },

  async deleteTemplate(id: number): Promise<void> {
    if (auth.isGuest) return;
    await handle(
      await apiFetch(`/api/templates/${id}`, { method: 'DELETE', headers: headers() }),
    );
  },

  async logTemplate(id: number, date: string): Promise<DaySummary> {
    if (auth.isGuest) return demoDay(date);
    const res = await apiFetch(`/api/templates/${id}/log`, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ date }),
    });
    return (await handle<{ day: DaySummary }>(res)).day;
  },

  // --- Recipes ----------------------------------------------------------
  async listRecipes(): Promise<Recipe[]> {
    if (auth.isGuest) return demoRecipes;
    const res = await apiFetch('/api/recipes', { headers: headers() });
    return (await handle<{ recipes: Recipe[] }>(res)).recipes;
  },

  async createRecipe(
    name: string,
    servings: number,
    ingredients: RecipeIngredient[],
  ): Promise<Recipe> {
    if (auth.isGuest) {
      return {
        id: Date.now(),
        name,
        servings,
        ingredients,
        perServing: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        createdAt: new Date().toISOString(),
      };
    }
    const res = await apiFetch('/api/recipes', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name, servings, ingredients }),
    });
    return (await handle<{ recipe: Recipe }>(res)).recipe;
  },

  async deleteRecipe(id: number): Promise<void> {
    if (auth.isGuest) return;
    await handle(await apiFetch(`/api/recipes/${id}`, { method: 'DELETE', headers: headers() }));
  },

  // --- Chunk 3: workouts ------------------------------------------------
  async generatePlan(input: PlanInput): Promise<{ plan: WorkoutPlanRecord; source: string }> {
    if (auth.isGuest) return { plan: demoWorkoutPlanFromInput(input), source: 'demo' };
    const res = await apiFetch('/api/workouts/generate-plan', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(input),
    });
    return handle(res);
  },

  async getPlan(): Promise<WorkoutPlanRecord | null> {
    if (auth.isGuest) return demoWorkoutPlan;
    const res = await apiFetch('/api/workouts/plan', { headers: headers() });
    return (await handle<{ plan: WorkoutPlanRecord | null }>(res)).plan;
  },

  async getActivePlan(): Promise<WorkoutPlanRecord | null> {
    if (auth.isGuest) return demoWorkoutPlan;
    const res = await apiFetch('/api/workouts/plan/active', { headers: headers() });
    return (await handle<{ plan: WorkoutPlanRecord | null }>(res)).plan;
  },

  async getGroceryPlan(): Promise<GroceryPlanRecord | null> {
    if (auth.isGuest) return getGuestGroceryPlan();
    try {
      const res = await apiFetch('/api/grocery/plan', { headers: headers() });
      if (res.status === 404 || !res.ok) return null;
      return (await handle<{ plan: GroceryPlanRecord | null }>(res)).plan;
    } catch {
      return null;
    }
  },

  async getGroceryMealDetail(mealId: string): Promise<GroceryMealDetailResponse> {
    if (auth.isGuest) throw new ApiError(404, 'No demo meal detail available.');
    const res = await apiFetch(`/api/grocery/meals/${encodeURIComponent(mealId)}`, {
      headers: headers(),
    });
    return (await handle<{ meal: GroceryMealDetailResponse }>(res)).meal;
  },

  async generateGroceryPlan(input: GenerateGroceryInput): Promise<GroceryPlanRecord> {
    if (auth.isGuest) {
      const plan = demoGenerateGroceryPlan(input);
      setGuestGroceryPlan(plan);
      return plan;
    }
    const res = await apiFetch('/api/grocery/generate', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(input),
    });
    return (await handle<{ plan: GroceryPlanRecord }>(res)).plan;
  },

  async deleteGroceryPlan(): Promise<void> {
    if (auth.isGuest) {
      setGuestGroceryPlan(null);
      return;
    }
    await handle(await apiFetch('/api/grocery/plan', { method: 'DELETE', headers: headers() }));
  },

  async getGrocerySwapAlternatives(
    date: string,
    slot: 'breakfast' | 'lunch' | 'dinner',
  ): Promise<MealSwapAlternative[]> {
    if (auth.isGuest) return demoGrocerySwapAlternatives();
    const qs = new URLSearchParams({ date, slot });
    const res = await apiFetch(`/api/grocery/alternatives?${qs}`, { headers: headers() });
    return (await handle<{ alternatives: MealSwapAlternative[] }>(res)).alternatives;
  },

  async swapGroceryMeal(payload: {
    date: string;
    slot: 'breakfast' | 'lunch' | 'dinner';
    mealId: string;
  }): Promise<GroceryPlanRecord> {
    if (auth.isGuest) {
      const plan = demoSwapGroceryMeal(getGuestGroceryPlan(), payload.date, payload.slot, payload.mealId);
      setGuestGroceryPlan(plan);
      return plan;
    }
    const res = await apiFetch('/api/grocery/swap', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    return (await handle<{ plan: GroceryPlanRecord }>(res)).plan;
  },

  async swapPlanExercise(payload: {
    dayIndex: number;
    exerciseIndex: number;
    exercise: PlanExercise;
  }): Promise<WorkoutPlanRecord> {
    if (auth.isGuest) return demoWorkoutPlan;
    const res = await apiFetch('/api/workouts/plan/exercise', {
      method: 'PATCH',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    return (await handle<{ plan: WorkoutPlanRecord }>(res)).plan;
  },

  async applyDayTradeoff(payload: {
    dayIndex: number;
    mode: 'default' | 'shorter_rest' | 'fewer_sets';
  }): Promise<WorkoutPlanRecord> {
    if (auth.isGuest) return demoWorkoutPlan;
    const res = await apiFetch('/api/workouts/plan/day/tradeoff', {
      method: 'PATCH',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    return (await handle<{ plan: WorkoutPlanRecord }>(res)).plan;
  },

  async getCustomSplit(): Promise<CustomSplitRecord | null> {
    if (auth.isGuest) return null;
    const res = await apiFetch('/api/workouts/custom-split', { headers: headers() });
    return (await handle<{ split: CustomSplitRecord | null }>(res)).split;
  },

  async saveCustomSplit(config: CustomSplitConfig): Promise<CustomSplitRecord> {
    if (auth.isGuest) {
      return {
        id: 1,
        split: { config, generatedPlan: demoWorkoutPlan.plan },
        createdAt: new Date().toISOString(),
      };
    }
    const res = await apiFetch('/api/workouts/custom-split', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(config),
    });
    return (await handle<{ split: CustomSplitRecord }>(res)).split;
  },

  async regenerateCustomSplit(): Promise<CustomSplitRecord> {
    if (auth.isGuest) {
      return {
        id: 1,
        split: {
          config: { days: [], defaultDurationMin: 45, preset: 'custom' },
          generatedPlan: demoWorkoutPlan.plan,
        },
        createdAt: new Date().toISOString(),
      };
    }
    const res = await apiFetch('/api/workouts/custom-split/regenerate', {
      method: 'POST',
      headers: headers(),
    });
    return (await handle<{ split: CustomSplitRecord }>(res)).split;
  },

  async swapCustomSplitExercise(payload: {
    dayIndex: number;
    exerciseIndex: number;
    exercise: PlanExercise;
  }): Promise<CustomSplitRecord> {
    if (auth.isGuest) {
      return {
        id: 1,
        split: {
          config: { days: [], defaultDurationMin: 45, preset: 'custom' },
          generatedPlan: demoWorkoutPlan.plan,
        },
        createdAt: new Date().toISOString(),
      };
    }
    const res = await apiFetch('/api/workouts/custom-split/exercise', {
      method: 'PATCH',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    return (await handle<{ split: CustomSplitRecord }>(res)).split;
  },

  async applyCustomSplitDayTradeoff(payload: {
    dayIndex: number;
    mode: 'default' | 'shorter_rest' | 'fewer_sets';
  }): Promise<CustomSplitRecord> {
    if (auth.isGuest) {
      return {
        id: 1,
        split: {
          config: { days: [], defaultDurationMin: 45, preset: 'custom' },
          generatedPlan: demoWorkoutPlan.plan,
        },
        createdAt: new Date().toISOString(),
      };
    }
    const res = await apiFetch('/api/workouts/custom-split/day/tradeoff', {
      method: 'PATCH',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    return (await handle<{ split: CustomSplitRecord }>(res)).split;
  },

  async getExerciseSwapAlternatives(
    rotationGroup: string,
    exclude: string[] = [],
  ): Promise<PlanExercise[]> {
    if (auth.isGuest) return demoWorkoutPlan.plan.weeklySchedule.flatMap((day) => day.exercises).slice(0, 6);
    const qs = new URLSearchParams({ rotationGroup, exclude: exclude.join(',') });
    const res = await apiFetch(`/api/exercises/swap-alternatives?${qs}`, { headers: headers() });
    return handle<PlanExercise[]>(res);
  },

  async finishWorkout(payload: {
    date: string;
    focus: string;
    type?: WorkoutType;
    durationMin: number;
    sets: LoggedSet[];
    caloriesBurned?: number;
    notes?: string;
    logSource?: 'plan' | 'custom' | 'cardio';
  }): Promise<{ log: WorkoutLog; day: DaySummary }> {
    if (auth.isGuest) return demoFinishWorkout(payload);
    const res = await apiFetch('/api/workouts/logs', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    return handle(res);
  },

  async listWorkoutLogs(): Promise<WorkoutLog[]> {
    if (auth.isGuest) return demoWorkoutLogs;
    const res = await apiFetch('/api/workouts/logs', { headers: headers() });
    return (await handle<{ logs: WorkoutLog[] }>(res)).logs;
  },

  async deleteWorkoutLog(id: number, date: string): Promise<void> {
    if (auth.isGuest) return;
    await handle(
      await apiFetch(`/api/workouts/logs/${id}?date=${date}`, { method: 'DELETE', headers: headers() }),
    );
  },

  async workoutHistory(): Promise<WorkoutStats> {
    if (auth.isGuest) return demoWorkoutStats();
    const res = await apiFetch('/api/workouts/history', { headers: headers() });
    return handle<WorkoutStats>(res);
  },

  async exerciseDemo(name: string): Promise<{ name: string; imageUrl: string | null }> {
    if (auth.isGuest) return { name, imageUrl: null };
    const res = await apiFetch(`/api/exercises/demo?name=${encodeURIComponent(name)}`, {
      headers: headers(),
    });
    return handle(res);
  },

  async searchExercises(q: string): Promise<
    { id: number; name: string; primaryMuscles: string[]; categoryName: string }[]
  > {
    if (auth.isGuest) {
      return demoWorkoutPlan.plan.weeklySchedule
        .flatMap((day) => day.exercises)
        .filter((exercise) => exercise.name.toLowerCase().includes(q.toLowerCase()))
        .map((exercise, index) => ({
          id: index + 1,
          name: exercise.name,
          primaryMuscles: exercise.muscleGroups,
          categoryName: exercise.primaryMuscle ?? 'Strength',
        }));
    }
    const res = await apiFetch(`/api/exercises/search?q=${encodeURIComponent(q)}`, {
      headers: headers(),
    });
    return handle(res);
  },

  // --- Chunk 4: dashboard & progress ------------------------------------
  async getDashboard(date?: string): Promise<DashboardResponse> {
    if (auth.isGuest) return demoDashboard(date);
    const qs = date ? `?date=${date}` : '';
    const res = await apiFetch(`/api/dashboard${qs}`, { headers: headers() });
    return handle<DashboardResponse>(res);
  },

  async logWeight(weightKg: number, date?: string): Promise<WeightPoint> {
    if (auth.isGuest) return demoLogWeight(weightKg, date);
    const res = await apiFetch('/api/progress/weight', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ weightKg, date }),
    });
    return (await handle<{ point: WeightPoint }>(res)).point;
  },

  async getWeightSeries(range: WeightRange): Promise<WeightSeriesResponse> {
    if (auth.isGuest) return demoWeightSeries(range);
    const res = await apiFetch(`/api/progress/weight?range=${range}`, { headers: headers() });
    return handle<WeightSeriesResponse>(res);
  },

  async getProgressSummary(): Promise<ProgressSummary> {
    if (auth.isGuest) return demoProgressSummary();
    const res = await apiFetch('/api/progress/summary', { headers: headers() });
    return handle<ProgressSummary>(res);
  },

  async getLoggingStreak(): Promise<LoggingStreakResponse> {
    if (auth.isGuest) return demoLoggingStreak();
    const res = await apiFetch('/api/progress/streak', { headers: headers() });
    return handle<LoggingStreakResponse>(res);
  },

  async getCheckin(): Promise<CheckinRecord | null> {
    if (auth.isGuest) return demoCheckin;
    const res = await apiFetch('/api/checkin', { headers: headers() });
    return (await handle<{ checkin: CheckinRecord | null }>(res)).checkin;
  },

  async generateCheckin(force = false): Promise<CheckinRecord> {
    if (auth.isGuest) return demoCheckin;
    const res = await apiFetch('/api/checkin/generate', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ force }),
    });
    return (await handle<{ checkin: CheckinRecord }>(res)).checkin;
  },
};
