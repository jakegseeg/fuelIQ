import type {
  DaySummary,
  FoodItem,
  FuelScore,
  LogEntry,
  LogSummary,
  MacroTotals,
  MealGroup,
  MealSlot,
  MealTemplate,
  Recipe,
  ScoredFood,
  SuggestionResponse,
} from './foodTypes';
import type {
  CheckinRecord,
  DashboardResponse,
  LoggingStreakResponse,
  ProgressSummary,
  WeightPoint,
  WeightRange,
  WeightSeriesResponse,
} from './progressTypes';
import type { NutritionTargets, Profile, ProfileInput, ProgressPhoto } from './types';
import type {
  DayPlan,
  LoggedSet,
  PlanExercise,
  PlanInput,
  WorkoutLog,
  WorkoutPlanRecord,
  WorkoutStats,
  WorkoutType,
} from './workoutTypes';
import type { Supplement, SupplementWithStreak } from './api';

const DAY = 24 * 60 * 60 * 1000;

function todayISO(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekday(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long' });
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const excellentScore: FuelScore = {
  score: 91,
  rating: 'excellent',
  components: [
    { key: 'protein', label: 'Protein', score: 94, detail: 'Strong protein density.' },
    { key: 'fiber', label: 'Fiber', score: 88, detail: 'Solid fiber and whole-food base.' },
  ],
};

const goodScore: FuelScore = {
  score: 82,
  rating: 'good',
  components: [
    { key: 'balance', label: 'Balance', score: 84, detail: 'Balanced macros for training.' },
    { key: 'processing', label: 'Processing', score: 78, detail: 'Mostly minimally processed.' },
  ],
};

const fairScore: FuelScore = {
  score: 68,
  rating: 'fair',
  components: [
    { key: 'sugar', label: 'Sugar', score: 62, detail: 'Moderate added sugar.' },
  ],
};

function food(
  name: string,
  brand: string | null,
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  fuelScore: FuelScore,
): ScoredFood {
  return {
    source: 'custom',
    name,
    brand,
    barcode: null,
    per100: {
      calories,
      protein,
      carbs,
      fat,
      fiber: carbs > 12 ? 4 : 1,
      sugars: carbs > 20 ? 7 : 2,
      addedSugars: 0,
      satFat: Math.round(fat * 0.25 * 10) / 10,
      sodium: 180,
    },
    novaGroup: 1,
    micronutrientCount: fuelScore.rating === 'excellent' ? 8 : 5,
    servingOptions: [
      { label: '1 serving', grams: 100 },
      { label: 'Half serving', grams: 50 },
    ],
    defaultServingG: 100,
    fuelScore,
  };
}

const demoFoods = [
  food('Greek yogurt bowl', 'FuelIQ demo', 132, 15, 11, 3, excellentScore),
  food('Chicken burrito bowl', 'FuelIQ demo', 171, 14, 18, 5, goodScore),
  food('Turkey avocado wrap', 'FuelIQ demo', 194, 13, 16, 8, goodScore),
  food('Salmon rice plate', 'FuelIQ demo', 202, 16, 14, 8, excellentScore),
  food('Protein smoothie', 'FuelIQ demo', 118, 13, 12, 2, goodScore),
  food('Dark chocolate granola bar', 'FuelIQ demo', 420, 7, 58, 16, fairScore),
];

const targets: NutritionTargets = {
  age: 31,
  bmr: 1834,
  tdee: 2843,
  activityMultiplier: 1.55,
  calorieTarget: 2580,
  macros: {
    proteinG: 185,
    fatG: 78,
    carbsG: 284,
    proteinKcal: 740,
    fatKcal: 702,
    carbsKcal: 1138,
  },
  projectedWeeklyChangeKg: -0.18,
};

export const demoProfile: Profile = {
  id: 9001,
  userId: 'demo-max',
  firstName: 'Max',
  dateOfBirth: '1995-04-18',
  biologicalSex: 'male',
  heightCm: 180,
  weightKg: 82.1,
  goal: 'recomp',
  activityLevel: 'moderate',
  dietaryPreferences: ['none'],
  customDietary: 'High-protein, meal-prep friendly',
  targetWeightKg: 80,
  targetDate: addDays(todayISO(), 84),
  units: { weight: 'lbs', height: 'imperial', energy: 'kcal' },
  targets,
  createdAt: addDays(todayISO(), -42),
  updatedAt: todayISO(),
  workoutSchedule: {
    days: [
      { day: 'Monday', available: true, preferredTime: '17:30' },
      { day: 'Tuesday', available: true, preferredTime: '07:15' },
      { day: 'Wednesday', available: true, preferredTime: '17:30' },
      { day: 'Thursday', available: false, preferredTime: null },
      { day: 'Friday', available: true, preferredTime: '16:30' },
      { day: 'Saturday', available: true, preferredTime: '10:00' },
      { day: 'Sunday', available: false, preferredTime: null },
    ],
  },
  pantry: ['eggs', 'Greek yogurt', 'rice', 'chicken breast', 'spinach', 'berries'],
  preferredWorkoutDuration: 50,
  equipmentAvailable: ['full_gym', 'dumbbells', 'barbell', 'cardio_machines'],
  fitnessLevel: 'intermediate',
};

function totalsFor(foodItem: FoodItem, grams: number): MacroTotals {
  const factor = grams / 100;
  return {
    calories: Math.round(foodItem.per100.calories * factor),
    protein: Math.round(foodItem.per100.protein * factor * 10) / 10,
    carbs: Math.round(foodItem.per100.carbs * factor * 10) / 10,
    fat: Math.round(foodItem.per100.fat * factor * 10) / 10,
  };
}

function logEntry(id: number, date: string, meal: MealSlot, item: ScoredFood, grams: number): LogEntry {
  const totals = totalsFor(item, grams);
  return {
    id,
    date,
    meal,
    source: item.source,
    name: item.name,
    brand: item.brand,
    barcode: item.barcode,
    servingLabel: item.servingOptions[0]?.label ?? `${grams} g`,
    quantityG: grams,
    per100: item.per100,
    novaGroup: item.novaGroup,
    micronutrientCount: item.micronutrientCount,
    fuelScore: item.fuelScore,
    calories: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
    createdAt: `${date}T12:00:00.000Z`,
  };
}

function emptyMeal(meal: MealSlot): MealGroup {
  return {
    meal,
    entries: [],
    subtotal: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  };
}

function groupEntries(entries: LogEntry[]): MealGroup[] {
  return (['breakfast', 'lunch', 'dinner', 'snacks'] as MealSlot[]).map((meal) => {
    const mealEntries = entries.filter((entry) => entry.meal === meal);
    if (mealEntries.length === 0) return emptyMeal(meal);
    return {
      meal,
      entries: mealEntries,
      subtotal: mealEntries.reduce(
        (sum, entry) => ({
          calories: sum.calories + entry.calories,
          protein: Math.round((sum.protein + entry.protein) * 10) / 10,
          carbs: Math.round((sum.carbs + entry.carbs) * 10) / 10,
          fat: Math.round((sum.fat + entry.fat) * 10) / 10,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    };
  });
}

function dayEntries(date: string): LogEntry[] {
  const today = todayISO();
  const offset = Math.round((new Date(`${date}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / DAY);
  if (offset > 0) return [];
  return [
    logEntry(1, date, 'breakfast', demoFoods[0], 260),
    logEntry(2, date, 'lunch', demoFoods[1], 310),
    logEntry(3, date, 'dinner', demoFoods[3], offset === 0 ? 0 : 280),
    logEntry(4, date, 'snacks', demoFoods[4], 220),
  ].filter((entry) => entry.quantityG > 0);
}

export function demoDay(date = todayISO()): DaySummary {
  const meals = groupEntries(dayEntries(date));
  const totals = meals.reduce(
    (sum, group) => ({
      calories: sum.calories + group.subtotal.calories,
      protein: Math.round((sum.protein + group.subtotal.protein) * 10) / 10,
      carbs: Math.round((sum.carbs + group.subtotal.carbs) * 10) / 10,
      fat: Math.round((sum.fat + group.subtotal.fat) * 10) / 10,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const target = {
    calories: targets.calorieTarget,
    protein: targets.macros.proteinG,
    carbs: targets.macros.carbsG,
    fat: targets.macros.fatG,
  };
  const caloriesBurned = date === todayISO() ? 335 : 0;
  return {
    date,
    meals,
    totals,
    target,
    remaining: {
      calories: target.calories - totals.calories + caloriesBurned,
      protein: Math.round((target.protein - totals.protein) * 10) / 10,
      carbs: Math.round((target.carbs - totals.carbs) * 10) / 10,
      fat: Math.round((target.fat - totals.fat) * 10) / 10,
    },
    goal: demoProfile.goal,
    caloriesBurned,
    netCalories: totals.calories - caloriesBurned,
    water: { totalOz: date === todayISO() ? 72 : 88, goalOz: 96, entries: [{ id: 1, oz: 24 }, { id: 2, oz: 24 }, { id: 3, oz: date === todayISO() ? 24 : 40 }] },
  };
}

export function demoLogSummary(date = todayISO()): LogSummary {
  const day = demoDay(date);
  return {
    date,
    totals: day.totals,
    target: day.target,
    remaining: day.remaining,
    caloriesBurned: day.caloriesBurned,
    netCalories: day.netCalories,
    water: day.water,
    meals: (['breakfast', 'lunch', 'dinner'] as const).map((meal) => {
      const group = day.meals.find((item) => item.meal === meal);
      return {
        meal,
        logged: (group?.entries.length ?? 0) > 0,
        calories: group?.subtotal.calories ?? 0,
      };
    }),
  };
}

const exercise = (
  name: string,
  sets: number,
  reps: string,
  muscleGroups: string[],
  primaryMuscle = muscleGroups[0],
): PlanExercise => ({
  name,
  sets,
  reps,
  restSeconds: 90,
  notes: 'Controlled tempo; leave 1-2 reps in reserve.',
  muscleGroups,
  primaryMuscle,
  sessionReason: `Supports Max's recomp goal with progressive overload.`,
  repExplanation: 'Moderate rep range balances strength and hypertrophy.',
  movementPattern: primaryMuscle,
});

const weeklySchedule: DayPlan[] = [
  {
    day: 'Monday',
    focus: 'Upper Strength',
    estimatedDurationMin: 52,
    estimatedCaloriesBurned: 335,
    preferredTime: '17:30',
    sessionOverview: 'Heavy upper-body compounds with a short pulling finisher.',
    exercises: [
      exercise('Barbell Bench Press', 4, '5-7', ['chest', 'triceps', 'shoulders'], 'chest'),
      exercise('Chest-Supported Row', 4, '8-10', ['back', 'biceps'], 'back'),
      exercise('Seated Dumbbell Press', 3, '8-10', ['shoulders', 'triceps'], 'shoulders'),
      exercise('Cable Face Pull', 3, '12-15', ['rear delts', 'upper back'], 'rear delts'),
    ],
  },
  {
    day: 'Tuesday',
    focus: 'Zone 2 Cardio',
    estimatedDurationMin: 35,
    estimatedCaloriesBurned: 290,
    preferredTime: '07:15',
    exercises: [exercise('Incline Treadmill Walk', 1, '35 min', ['cardio'], 'cardio')],
  },
  {
    day: 'Wednesday',
    focus: 'Lower Strength',
    estimatedDurationMin: 55,
    estimatedCaloriesBurned: 410,
    preferredTime: '17:30',
    exercises: [
      exercise('Back Squat', 4, '5-7', ['quads', 'glutes'], 'quads'),
      exercise('Romanian Deadlift', 3, '8-10', ['hamstrings', 'glutes'], 'hamstrings'),
      exercise('Walking Lunge', 3, '10 each leg', ['quads', 'glutes'], 'quads'),
      exercise('Standing Calf Raise', 3, '12-15', ['calves'], 'calves'),
    ],
  },
  {
    day: 'Thursday',
    focus: 'Recovery',
    estimatedDurationMin: 25,
    estimatedCaloriesBurned: 95,
    exercises: [],
  },
  {
    day: 'Friday',
    focus: 'Push + Pull Hypertrophy',
    estimatedDurationMin: 50,
    estimatedCaloriesBurned: 360,
    preferredTime: '16:30',
    exercises: [
      exercise('Incline Dumbbell Press', 3, '8-12', ['chest', 'shoulders'], 'chest'),
      exercise('Lat Pulldown', 3, '10-12', ['back', 'biceps'], 'back'),
      exercise('Cable Lateral Raise', 3, '12-15', ['shoulders'], 'shoulders'),
      exercise('Rope Triceps Pressdown', 3, '10-14', ['triceps'], 'triceps'),
    ],
  },
  {
    day: 'Saturday',
    focus: 'Full Body Conditioning',
    estimatedDurationMin: 45,
    estimatedCaloriesBurned: 430,
    preferredTime: '10:00',
    exercises: [
      exercise('Trap Bar Deadlift', 3, '6-8', ['glutes', 'hamstrings', 'back'], 'glutes'),
      exercise('Goblet Squat', 3, '10-12', ['quads', 'glutes'], 'quads'),
      exercise('Bike Intervals', 1, '10 x 30 sec', ['cardio'], 'cardio'),
    ],
  },
  {
    day: 'Sunday',
    focus: 'Rest Day',
    estimatedDurationMin: 0,
    estimatedCaloriesBurned: 0,
    exercises: [],
  },
];

export const demoWorkoutPlan: WorkoutPlanRecord = {
  id: 7001,
  input: {
    daysPerWeek: 5,
    equipment: ['full_gym', 'dumbbells', 'barbell', 'cardio_machines'],
    durationMin: 50,
    limitations: 'Keep Thursday lighter for work schedule.',
    fitnessLevel: 'intermediate',
  },
  source: 'smart',
  createdAt: addDays(todayISO(), -8),
  plan: {
    planName: "Max's Recomp Week",
    weeklySchedule,
    nutritionNotes: 'Prioritize protein at breakfast and post-workout carbs on strength days.',
    progressionTips: 'Add 5 lb when all working sets hit the top of the rep range with clean form.',
  },
};

export const demoWorkoutLogs: WorkoutLog[] = [
  {
    id: 8101,
    date: addDays(todayISO(), -1),
    focus: 'Upper Strength',
    type: 'weight_training',
    durationMin: 51,
    caloriesBurned: 340,
    sets: [
      { exercise: 'Barbell Bench Press', muscleGroups: ['chest'], weightKg: 92.5, reps: 6 },
      { exercise: 'Chest-Supported Row', muscleGroups: ['back'], weightKg: 62.5, reps: 9 },
    ],
    totalSets: 14,
    createdAt: `${addDays(todayISO(), -1)}T18:24:00.000Z`,
    notes: 'Bench moved well.',
    logSource: 'plan',
  },
  {
    id: 8102,
    date: addDays(todayISO(), -3),
    focus: 'Lower Strength',
    type: 'weight_training',
    durationMin: 57,
    caloriesBurned: 415,
    sets: [
      { exercise: 'Back Squat', muscleGroups: ['quads', 'glutes'], weightKg: 125, reps: 5 },
      { exercise: 'Romanian Deadlift', muscleGroups: ['hamstrings'], weightKg: 100, reps: 8 },
    ],
    totalSets: 13,
    createdAt: `${addDays(todayISO(), -3)}T18:11:00.000Z`,
    logSource: 'plan',
  },
];

export function demoDashboard(date = todayISO()): DashboardResponse {
  const day = demoDay(date);
  const todayName = weekday(date);
  const todayWorkout = weeklySchedule.find((plan) => plan.day === todayName) ?? null;
  return {
    date,
    hasProfile: true,
    firstName: 'Max',
    day,
    streak: 8,
    adherence: Array.from({ length: 7 }, (_, index) => {
      const itemDate = addDays(date, index - 6);
      const calories = [2490, 2635, 2560, 2710, 2425, 2605, day.totals.calories][index];
      return {
        date: itemDate,
        calories,
        target: targets.calorieTarget,
        pct: Math.round((calories / targets.calorieTarget) * 100),
        status: Math.abs(calories - targets.calorieTarget) < 180 ? 'green' : 'yellow',
      };
    }),
    todaysWorkout: todayWorkout,
    nextWorkout: { date: addDays(date, 1), day: weekday(addDays(date, 1)), focus: 'Zone 2 Cardio' },
    insight: {
      source: 'local',
      content: 'Max is close on calories and protein. Dinner should lean high-protein with moderate carbs.',
    },
    checkin: demoCheckin,
  };
}

export function demoLoggingStreak(): LoggingStreakResponse {
  const today = todayISO();
  return {
    streak: 8,
    week: Array.from({ length: 7 }, (_, index) => {
      const date = addDays(today, index - 6);
      return {
        date,
        day: new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' }),
        logged: index !== 1,
        isToday: date === today,
      };
    }),
  };
}

export function demoWeightSeries(range: WeightRange): WeightSeriesResponse {
  const count = range === '7' ? 7 : range === '30' ? 30 : range === '90' ? 90 : 45;
  const start = 84.2;
  const series = Array.from({ length: count }, (_, index) => {
    const progress = index / Math.max(1, count - 1);
    const weightKg = start - progress * 2.1 + Math.sin(index / 3) * 0.18;
    return {
      date: addDays(todayISO(), index - count + 1),
      weightKg: Math.round(weightKg * 10) / 10,
      avg7: Math.round((weightKg + 0.08) * 10) / 10,
    };
  });
  return {
    series,
    goalWeightKg: demoProfile.targetWeightKg,
    startWeightKg: series[0]?.weightKg ?? null,
    latestWeightKg: series.at(-1)?.weightKg ?? null,
  };
}

export function demoProgressSummary(): ProgressSummary {
  const today = todayISO();
  return {
    hasProfile: true,
    calories: Array.from({ length: 14 }, (_, index) => {
      const calories = 2480 + Math.round(Math.sin(index) * 140);
      return {
        date: addDays(today, index - 13),
        calories,
        target: targets.calorieTarget,
        pct: Math.round((calories / targets.calorieTarget) * 100),
        status: Math.abs(calories - targets.calorieTarget) <= 175 ? 'green' : 'yellow',
      };
    }),
    macros: {
      days: Array.from({ length: 14 }, (_, index) => ({
        date: addDays(today, index - 13),
        protein: 170 + (index % 4) * 6,
        carbs: 250 + (index % 5) * 8,
        fat: 70 + (index % 3) * 4,
      })),
      avgSplit: { protein: 30, carbs: 43, fat: 27 },
      targetSplit: { protein: 29, carbs: 44, fat: 27 },
    },
    fuelScore: {
      days: Array.from({ length: 14 }, (_, index) => ({
        date: addDays(today, index - 13),
        avg: 72 + Math.round(index * 1.2 + Math.sin(index) * 2),
      })),
      improvementPct: 18,
      baseline: 72,
      current: 85,
    },
    volumeByMuscle: [
      { muscleGroup: 'Chest', volume: 11240, sets: 18 },
      { muscleGroup: 'Back', volume: 13680, sets: 22 },
      { muscleGroup: 'Quads', volume: 15400, sets: 17 },
      { muscleGroup: 'Hamstrings', volume: 9400, sets: 11 },
      { muscleGroup: 'Shoulders', volume: 6820, sets: 14 },
    ],
    cardioByWeek: [
      { week: '3 wk ago', minutes: 85 },
      { week: '2 wk ago', minutes: 105 },
      { week: 'Last week', minutes: 122 },
      { week: 'This week', minutes: 70 },
    ],
  };
}

export const demoCheckin: CheckinRecord = {
  weekStart: addDays(todayISO(), -6),
  source: 'local',
  createdAt: todayISO(),
  content:
    'Max is trending well: weight is slowly moving down while training volume is holding steady. Keep breakfast protein consistent and aim for one more high-fiber carb at lunch.',
};

export function demoWorkoutStats(): WorkoutStats {
  return {
    totalSessions: 24,
    weeklyStreak: 5,
    thisWeekSessions: 3,
    volumeByMuscle: demoProgressSummary().volumeByMuscle,
    personalRecords: [
      { exercise: 'Back Squat', weightKg: 125, reps: 5, date: addDays(todayISO(), -3) },
      { exercise: 'Barbell Bench Press', weightKg: 92.5, reps: 6, date: addDays(todayISO(), -1) },
    ],
  };
}

export function demoSupplements(): SupplementWithStreak[] {
  return [
    { id: 1, name: 'Creatine monohydrate', dose: '5 g', notes: 'Daily', createdAt: addDays(todayISO(), -20), streak: 12, loggedToday: true },
    { id: 2, name: 'Vitamin D3', dose: '2000 IU', notes: 'With breakfast', createdAt: addDays(todayISO(), -18), streak: 6, loggedToday: false },
  ];
}

export function demoSearchFoods(query: string, limit = 20): ScoredFood[] {
  const q = query.trim().toLowerCase();
  const results = demoFoods.filter((item) => item.name.toLowerCase().includes(q) || item.brand?.toLowerCase().includes(q));
  return clone((results.length ? results : demoFoods).slice(0, limit));
}

export function demoSuggestions(): SuggestionResponse {
  return {
    source: 'local',
    suggestions: demoFoods.slice(0, 3).map((item, index) => ({
      food: item,
      suggestedServingG: [180, 220, 160][index],
      fuelScore: item.fuelScore,
      estimated: totalsFor(item, [180, 220, 160][index]),
      reason: ['Closes Max’s protein gap.', 'Balanced carbs for training recovery.', 'Easy snack with strong fuel score.'][index],
    })),
  };
}

export function demoAddEntry(date: string, meal: MealSlot, foodItem: FoodItem, quantityG: number): { entry: LogEntry; day: DaySummary } {
  const score = 'fuelScore' in foodItem ? (foodItem as ScoredFood).fuelScore : goodScore;
  const entry = logEntry(Date.now(), date, meal, { ...foodItem, fuelScore: score } as ScoredFood, quantityG);
  const day = demoDay(date);
  const group = day.meals.find((item) => item.meal === meal);
  group?.entries.push(entry);
  if (group) {
    group.subtotal = {
      calories: group.subtotal.calories + entry.calories,
      protein: Math.round((group.subtotal.protein + entry.protein) * 10) / 10,
      carbs: Math.round((group.subtotal.carbs + entry.carbs) * 10) / 10,
      fat: Math.round((group.subtotal.fat + entry.fat) * 10) / 10,
    };
  }
  day.totals = {
    calories: day.totals.calories + entry.calories,
    protein: Math.round((day.totals.protein + entry.protein) * 10) / 10,
    carbs: Math.round((day.totals.carbs + entry.carbs) * 10) / 10,
    fat: Math.round((day.totals.fat + entry.fat) * 10) / 10,
  };
  if (day.target) {
    day.remaining = {
      calories: day.target.calories - day.totals.calories + day.caloriesBurned,
      protein: Math.round((day.target.protein - day.totals.protein) * 10) / 10,
      carbs: Math.round((day.target.carbs - day.totals.carbs) * 10) / 10,
      fat: Math.round((day.target.fat - day.totals.fat) * 10) / 10,
    };
  }
  return { entry, day };
}

export function demoSaveProfile(input: ProfileInput): Profile {
  return { ...demoProfile, ...input, updatedAt: todayISO() };
}

export function demoPreviewTargets(): NutritionTargets {
  return clone(targets);
}

export function demoWorkoutPlanFromInput(input: PlanInput): WorkoutPlanRecord {
  return { ...demoWorkoutPlan, input: clone(input), createdAt: todayISO() };
}

export function demoFinishWorkout(payload: {
  date: string;
  focus: string;
  type?: WorkoutType;
  durationMin: number;
  sets: LoggedSet[];
  caloriesBurned?: number;
  notes?: string;
  logSource?: 'plan' | 'custom' | 'cardio';
}): { log: WorkoutLog; day: DaySummary } {
  const log: WorkoutLog = {
    id: Date.now(),
    date: payload.date,
    focus: payload.focus,
    type: payload.type ?? 'weight_training',
    durationMin: payload.durationMin,
    caloriesBurned: payload.caloriesBurned ?? 320,
    sets: payload.sets,
    totalSets: payload.sets.length,
    createdAt: new Date().toISOString(),
    notes: payload.notes,
    logSource: payload.logSource ?? 'plan',
  };
  const day = demoDay(payload.date);
  day.caloriesBurned += log.caloriesBurned;
  day.netCalories = day.totals.calories - day.caloriesBurned;
  return { log, day };
}

export const demoPhotos: ProgressPhoto[] = [];
export const demoTemplates: MealTemplate[] = [];
export const demoRecipes: Recipe[] = [];

export function demoAddSupplement(name: string, dose?: string, notes?: string): Supplement {
  return { id: Date.now(), name, dose: dose ?? null, notes: notes ?? null, createdAt: todayISO() };
}

export function demoLogWeight(weightKg: number, date = todayISO()): WeightPoint {
  return { date, weightKg, avg7: weightKg };
}
