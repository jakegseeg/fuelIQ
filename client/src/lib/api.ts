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

const TOKEN_KEY = 'fueliq.token';
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

export interface PublicUser {
  id: string;
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
    let body: { error?: string; issues?: unknown } = {};
    try {
      body = await res.json();
    } catch {
      /* ignore non-JSON bodies */
    }
    throw new ApiError(res.status, body.error || res.statusText, body.issues);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // --- Chunk 5: auth ----------------------------------------------------
  async register(email: string, password: string): Promise<PublicUser> {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }, { withAuth: false }),
      body: JSON.stringify({ email, password }),
    });
    const data = await handle<{ token: string; user: PublicUser }>(res);
    auth.set(data.token);
    return data.user;
  },

  async login(email: string, password: string): Promise<PublicUser> {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }, { withAuth: false }),
      body: JSON.stringify({ email, password }),
    });
    const data = await handle<{ token: string; user: PublicUser }>(res);
    auth.set(data.token);
    return data.user;
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
    const res = await apiFetch('/api/auth/me', { headers: headers() });
    if (res.status === 401 || res.status === 404) {
      auth.set(null);
      return null;
    }
    return (await handle<{ user: PublicUser }>(res)).user;
  },

  async coachInsights(): Promise<{ insights: string[] }> {
    const res = await apiFetch('/api/ai/coach/insights', { headers: headers() });
    return handle(res);
  },

  async chat(messages: ChatMessage[]): Promise<{ reply: string }> {
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
    const qs = date ? `?date=${date}` : '';
    const res = await apiFetch(`/api/supplements${qs}`, { headers: headers() });
    return (await handle<{ supplements: SupplementWithStreak[] }>(res)).supplements;
  },

  async addSupplement(name: string, dose?: string, notes?: string): Promise<Supplement> {
    const res = await apiFetch('/api/supplements', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name, dose, notes }),
    });
    return (await handle<{ supplement: Supplement }>(res)).supplement;
  },

  async deleteSupplement(id: number): Promise<void> {
    await handle(await apiFetch(`/api/supplements/${id}`, { method: 'DELETE', headers: headers() }));
  },

  async toggleSupplementLog(id: number, date: string, log: boolean): Promise<SupplementWithStreak[]> {
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
    const res = await apiFetch('/api/import/mfp', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ csv }),
    });
    return handle<MfpImportResult>(res);
  },

  async getProfile(): Promise<Profile | null> {
    const authHeaders = headers();
    const hasAuth = Boolean((authHeaders as Record<string, string>).Authorization);
    console.log('[api] GET /api/profile — Authorization header:', hasAuth ? 'present' : 'missing');
    const res = await apiFetch('/api/profile', { headers: authHeaders });
    console.log('[api] GET /api/profile — status:', res.status);
    if (res.status === 404) return null;
    return handle<Profile>(res);
  },

  async saveProfile(input: ProfileInput): Promise<Profile> {
    const res = await apiFetch('/api/profile', {
      method: 'PUT',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(input),
    });
    return handle<Profile>(res);
  },

  async previewTargets(input: ProfileInput): Promise<NutritionTargets> {
    const res = await apiFetch('/api/profile/preview', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(input),
    });
    return handle<NutritionTargets>(res);
  },

  async getTargets(): Promise<NutritionTargets> {
    const res = await apiFetch('/api/profile/targets', { headers: headers() });
    return handle<NutritionTargets>(res);
  },

  async getWorkoutSchedule(): Promise<WorkoutSchedulePreferences | null> {
    const res = await apiFetch('/api/profile/workout-schedule', { headers: headers() });
    if (res.status === 404) return null;
    return (await handle<{ schedule: WorkoutSchedulePreferences | null }>(res)).schedule;
  },

  async saveWorkoutSchedule(
    schedule: WorkoutSchedulePreferences,
  ): Promise<{ schedule: WorkoutSchedulePreferences; plan: WorkoutPlanRecord | null }> {
    const res = await apiFetch('/api/profile/workout-schedule', {
      method: 'PUT',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(schedule),
    });
    return handle(res);
  },

  async getPantry(): Promise<string[]> {
    const res = await apiFetch('/api/profile/pantry', { headers: headers() });
    return (await handle<{ pantry: string[] }>(res)).pantry;
  },

  async savePantry(pantry: string[]): Promise<string[]> {
    const res = await apiFetch('/api/profile/pantry', {
      method: 'PUT',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ pantry }),
    });
    return (await handle<{ pantry: string[] }>(res)).pantry;
  },

  async listPhotos(): Promise<ProgressPhoto[]> {
    const res = await apiFetch('/api/profile/photos', { headers: headers() });
    return handle<ProgressPhoto[]>(res);
  },

  async uploadPhoto(file: File, weightKg?: number | null): Promise<ProgressPhoto> {
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
    const res = await apiFetch(
      `/api/foods/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      { headers: headers() },
    );
    const data = await handle<{ foods: ScoredFood[] }>(res);
    return data.foods;
  },

  async lookupBarcode(code: string): Promise<ScoredFood | null> {
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
    const res = await apiFetch('/api/foods/score', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ per100, novaGroup, micronutrientCount }),
    });
    return handle<FuelScore>(res);
  },

  async getDay(date: string): Promise<DaySummary> {
    const res = await apiFetch(`/api/log?date=${date}`, { headers: headers() });
    return handle<DaySummary>(res);
  },

  async getLogSummary(date: string): Promise<LogSummary> {
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
    const res = await apiFetch(`/api/log/entry/${id}`, {
      method: 'PATCH',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ quantityG, servingLabel }),
    });
    return handle<{ entry: LogEntry; day: DaySummary }>(res);
  },

  async deleteEntry(id: number, date: string): Promise<DaySummary> {
    const res = await apiFetch(`/api/log/entry/${id}?date=${date}`, {
      method: 'DELETE',
      headers: headers(),
    });
    const data = await handle<{ day: DaySummary }>(res);
    return data.day;
  },

  async recentFoods(): Promise<ScoredFood[]> {
    const res = await apiFetch('/api/log/recent', { headers: headers() });
    return (await handle<{ foods: ScoredFood[] }>(res)).foods;
  },

  async frequentFoods(): Promise<ScoredFood[]> {
    const res = await apiFetch('/api/log/frequent', { headers: headers() });
    return (await handle<{ foods: ScoredFood[] }>(res)).foods;
  },

  async getSuggestions(
    remaining: { protein: number; carbs: number; fat: number },
    goal: string,
  ): Promise<SuggestionResponse> {
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
    const res = await apiFetch(`/api/water?date=${date}`, { headers: headers() });
    return handle(res);
  },

  async addWater(date: string, oz: number): Promise<DaySummary['water'] & { date: string }> {
    const res = await apiFetch('/api/water', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ date, oz }),
    });
    return handle(res);
  },

  // --- Templates --------------------------------------------------------
  async listTemplates(): Promise<MealTemplate[]> {
    const res = await apiFetch('/api/templates', { headers: headers() });
    return (await handle<{ templates: MealTemplate[] }>(res)).templates;
  },

  async createTemplate(name: string, items: TemplateItem[]): Promise<MealTemplate> {
    const res = await apiFetch('/api/templates', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name, items }),
    });
    return (await handle<{ template: MealTemplate }>(res)).template;
  },

  async deleteTemplate(id: number): Promise<void> {
    await handle(
      await apiFetch(`/api/templates/${id}`, { method: 'DELETE', headers: headers() }),
    );
  },

  async logTemplate(id: number, date: string): Promise<DaySummary> {
    const res = await apiFetch(`/api/templates/${id}/log`, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ date }),
    });
    return (await handle<{ day: DaySummary }>(res)).day;
  },

  // --- Recipes ----------------------------------------------------------
  async listRecipes(): Promise<Recipe[]> {
    const res = await apiFetch('/api/recipes', { headers: headers() });
    return (await handle<{ recipes: Recipe[] }>(res)).recipes;
  },

  async createRecipe(
    name: string,
    servings: number,
    ingredients: RecipeIngredient[],
  ): Promise<Recipe> {
    const res = await apiFetch('/api/recipes', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name, servings, ingredients }),
    });
    return (await handle<{ recipe: Recipe }>(res)).recipe;
  },

  async deleteRecipe(id: number): Promise<void> {
    await handle(await apiFetch(`/api/recipes/${id}`, { method: 'DELETE', headers: headers() }));
  },

  // --- Chunk 3: workouts ------------------------------------------------
  async generatePlan(input: PlanInput): Promise<{ plan: WorkoutPlanRecord; source: string }> {
    const res = await apiFetch('/api/workouts/generate-plan', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(input),
    });
    return handle(res);
  },

  async getPlan(): Promise<WorkoutPlanRecord | null> {
    const res = await apiFetch('/api/workouts/plan', { headers: headers() });
    return (await handle<{ plan: WorkoutPlanRecord | null }>(res)).plan;
  },

  async getActivePlan(): Promise<WorkoutPlanRecord | null> {
    const res = await apiFetch('/api/workouts/plan/active', { headers: headers() });
    return (await handle<{ plan: WorkoutPlanRecord | null }>(res)).plan;
  },

  async getGroceryPlan(): Promise<GroceryPlanRecord | null> {
    try {
      const res = await apiFetch('/api/grocery/plan', { headers: headers() });
      if (res.status === 404 || !res.ok) return null;
      return (await handle<{ plan: GroceryPlanRecord | null }>(res)).plan;
    } catch {
      return null;
    }
  },

  async getGroceryMealDetail(mealId: string): Promise<GroceryMealDetailResponse> {
    const res = await apiFetch(`/api/grocery/meals/${encodeURIComponent(mealId)}`, {
      headers: headers(),
    });
    return (await handle<{ meal: GroceryMealDetailResponse }>(res)).meal;
  },

  async generateGroceryPlan(input: GenerateGroceryInput): Promise<GroceryPlanRecord> {
    const res = await apiFetch('/api/grocery/generate', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(input),
    });
    return (await handle<{ plan: GroceryPlanRecord }>(res)).plan;
  },

  async deleteGroceryPlan(): Promise<void> {
    await handle(await apiFetch('/api/grocery/plan', { method: 'DELETE', headers: headers() }));
  },

  async getGrocerySwapAlternatives(
    date: string,
    slot: 'breakfast' | 'lunch' | 'dinner',
  ): Promise<MealSwapAlternative[]> {
    const qs = new URLSearchParams({ date, slot });
    const res = await apiFetch(`/api/grocery/alternatives?${qs}`, { headers: headers() });
    return (await handle<{ alternatives: MealSwapAlternative[] }>(res)).alternatives;
  },

  async swapGroceryMeal(payload: {
    date: string;
    slot: 'breakfast' | 'lunch' | 'dinner';
    mealId: string;
  }): Promise<GroceryPlanRecord> {
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
    const res = await apiFetch('/api/workouts/plan/day/tradeoff', {
      method: 'PATCH',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    return (await handle<{ plan: WorkoutPlanRecord }>(res)).plan;
  },

  async getCustomSplit(): Promise<CustomSplitRecord | null> {
    const res = await apiFetch('/api/workouts/custom-split', { headers: headers() });
    return (await handle<{ split: CustomSplitRecord | null }>(res)).split;
  },

  async saveCustomSplit(config: CustomSplitConfig): Promise<CustomSplitRecord> {
    const res = await apiFetch('/api/workouts/custom-split', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(config),
    });
    return (await handle<{ split: CustomSplitRecord }>(res)).split;
  },

  async regenerateCustomSplit(): Promise<CustomSplitRecord> {
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
    const res = await apiFetch('/api/workouts/logs', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    return handle(res);
  },

  async listWorkoutLogs(): Promise<WorkoutLog[]> {
    const res = await apiFetch('/api/workouts/logs', { headers: headers() });
    return (await handle<{ logs: WorkoutLog[] }>(res)).logs;
  },

  async deleteWorkoutLog(id: number, date: string): Promise<void> {
    await handle(
      await apiFetch(`/api/workouts/logs/${id}?date=${date}`, { method: 'DELETE', headers: headers() }),
    );
  },

  async workoutHistory(): Promise<WorkoutStats> {
    const res = await apiFetch('/api/workouts/history', { headers: headers() });
    return handle<WorkoutStats>(res);
  },

  async exerciseDemo(name: string): Promise<{ name: string; imageUrl: string | null }> {
    const res = await apiFetch(`/api/exercises/demo?name=${encodeURIComponent(name)}`, {
      headers: headers(),
    });
    return handle(res);
  },

  async searchExercises(q: string): Promise<
    { id: number; name: string; primaryMuscles: string[]; categoryName: string }[]
  > {
    const res = await apiFetch(`/api/exercises/search?q=${encodeURIComponent(q)}`, {
      headers: headers(),
    });
    return handle(res);
  },

  // --- Chunk 4: dashboard & progress ------------------------------------
  async getDashboard(date?: string): Promise<DashboardResponse> {
    const qs = date ? `?date=${date}` : '';
    const res = await apiFetch(`/api/dashboard${qs}`, { headers: headers() });
    return handle<DashboardResponse>(res);
  },

  async logWeight(weightKg: number, date?: string): Promise<WeightPoint> {
    const res = await apiFetch('/api/progress/weight', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ weightKg, date }),
    });
    return (await handle<{ point: WeightPoint }>(res)).point;
  },

  async getWeightSeries(range: WeightRange): Promise<WeightSeriesResponse> {
    const res = await apiFetch(`/api/progress/weight?range=${range}`, { headers: headers() });
    return handle<WeightSeriesResponse>(res);
  },

  async getProgressSummary(): Promise<ProgressSummary> {
    const res = await apiFetch('/api/progress/summary', { headers: headers() });
    return handle<ProgressSummary>(res);
  },

  async getLoggingStreak(): Promise<LoggingStreakResponse> {
    const res = await apiFetch('/api/progress/streak', { headers: headers() });
    return handle<LoggingStreakResponse>(res);
  },

  async getCheckin(): Promise<CheckinRecord | null> {
    const res = await apiFetch('/api/checkin', { headers: headers() });
    return (await handle<{ checkin: CheckinRecord | null }>(res)).checkin;
  },

  async generateCheckin(force = false): Promise<CheckinRecord> {
    const res = await apiFetch('/api/checkin/generate', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ force }),
    });
    return (await handle<{ checkin: CheckinRecord }>(res)).checkin;
  },
};
