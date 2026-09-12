/**
 * AI workout plan generator (spec section 3.2).
 *
 * Uses the Anthropic Claude API when ANTHROPIC_API_KEY is set, with a
 * deterministic split-based generator as a fallback so the feature always works.
 */
import { parseClaudePlan } from '../domain/workoutSchema.js';
import {
  estimateCalorieBurn,
  focusToType,
  type DayPlan,
  type Equipment,
  type PlanExercise,
  type PlanInput,
  type WorkoutPlan,
} from '../domain/workout.js';

export interface GenContext {
  age: number;
  sex: string;
  weightKg: number;
  weightLbs: number;
  heightLabel: string;
  goal: string;
  calories: number;
  protein: number;
  dietPrefs: string;
}

const GOAL_LABEL: Record<string, string> = {
  lose_fat: 'lose fat',
  maintain: 'maintain weight',
  build_muscle: 'build muscle',
  endurance: 'improve endurance',
  recomp: 'recomposition (lose fat + gain muscle)',
};

export function buildPrompt(ctx: GenContext, input: PlanInput): { system: string; user: string } {
  const system =
    'You are an expert personal trainer and sports nutritionist. ' +
    'Generate a detailed weekly workout plan in JSON format only.';
  const user =
    `Generate a ${input.daysPerWeek}-day/week workout plan for a ${ctx.age}-year-old ${ctx.sex} ` +
    `who weighs ${Math.round(ctx.weightLbs)}lbs, is ${ctx.heightLabel}, wants to ${
      GOAL_LABEL[ctx.goal] ?? ctx.goal
    }, has ${input.equipment.join(', ')} available, is at ${input.fitnessLevel} level, ` +
    `has ${input.durationMin} min per session, eats ${ctx.calories} calories/day with ${ctx.protein}g protein. ` +
    `Dietary preferences: ${ctx.dietPrefs || 'none'}. Limitations: ${input.limitations || 'none'}.\n\n` +
    `Return JSON with this structure:\n` +
    `{"plan_name": string, "weekly_schedule": [{"day": "Monday", "focus": "Push / Upper / Legs / Cardio / Rest", ` +
    `"estimated_duration_min": number, "estimated_calories_burned": number, "exercises": [{"name": string, ` +
    `"sets": number, "reps": string, "rest_seconds": number, "notes": string, "muscle_groups": string[]}]}], ` +
    `"nutrition_notes": string, "progression_tips": string}`;
  return { system, user };
}

async function generateWithClaude(ctx: GenContext, input: PlanInput): Promise<WorkoutPlan | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const pkg = '@anthropic-ai/sdk';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import(pkg);
    const Anthropic = mod.default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const { system, user } = buildPrompt(ctx, input);

    const msg = await client.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 3000,
      system,
      messages: [{ role: 'user', content: user }],
    });

    const text: string = msg.content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('');
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    return parseClaudePlan(JSON.parse(text.slice(start, end + 1)));
  } catch (err) {
    console.warn('Claude workout generation failed, using local generator:', err);
    return null;
  }
}

// --- Deterministic fallback generator -------------------------------------

interface LibExercise {
  name: string;
  category: 'push' | 'pull' | 'legs' | 'core' | 'cardio';
  muscleGroups: string[];
  equipment: Equipment[]; // any one satisfies; 'bodyweight' is always available
  compound?: boolean;
}

const LIB: LibExercise[] = [
  // Push
  { name: 'Barbell Bench Press', category: 'push', muscleGroups: ['Chest', 'Triceps', 'Shoulders'], equipment: ['barbell', 'full_gym'], compound: true },
  { name: 'Dumbbell Bench Press', category: 'push', muscleGroups: ['Chest', 'Triceps'], equipment: ['dumbbells', 'full_gym'], compound: true },
  { name: 'Push-up', category: 'push', muscleGroups: ['Chest', 'Triceps', 'Core'], equipment: ['bodyweight'], compound: true },
  { name: 'Overhead Press', category: 'push', muscleGroups: ['Shoulders', 'Triceps'], equipment: ['barbell', 'dumbbells', 'full_gym'], compound: true },
  { name: 'Lateral Raise', category: 'push', muscleGroups: ['Shoulders'], equipment: ['dumbbells', 'resistance_bands', 'full_gym'] },
  { name: 'Triceps Pushdown', category: 'push', muscleGroups: ['Triceps'], equipment: ['machines', 'resistance_bands', 'full_gym'] },
  // Pull
  { name: 'Pull-up', category: 'pull', muscleGroups: ['Back', 'Biceps'], equipment: ['bodyweight'], compound: true },
  { name: 'Barbell Row', category: 'pull', muscleGroups: ['Back', 'Biceps'], equipment: ['barbell', 'full_gym'], compound: true },
  { name: 'Lat Pulldown', category: 'pull', muscleGroups: ['Back', 'Biceps'], equipment: ['machines', 'full_gym'], compound: true },
  { name: 'Dumbbell Row', category: 'pull', muscleGroups: ['Back', 'Biceps'], equipment: ['dumbbells', 'full_gym'], compound: true },
  { name: 'Face Pull', category: 'pull', muscleGroups: ['Rear Delts', 'Back'], equipment: ['machines', 'resistance_bands', 'full_gym'] },
  { name: 'Biceps Curl', category: 'pull', muscleGroups: ['Biceps'], equipment: ['dumbbells', 'barbell', 'resistance_bands', 'full_gym'] },
  // Legs
  { name: 'Back Squat', category: 'legs', muscleGroups: ['Quads', 'Glutes'], equipment: ['barbell', 'full_gym'], compound: true },
  { name: 'Goblet Squat', category: 'legs', muscleGroups: ['Quads', 'Glutes'], equipment: ['dumbbells', 'bodyweight'], compound: true },
  { name: 'Romanian Deadlift', category: 'legs', muscleGroups: ['Hamstrings', 'Glutes'], equipment: ['barbell', 'dumbbells', 'full_gym'], compound: true },
  { name: 'Walking Lunge', category: 'legs', muscleGroups: ['Quads', 'Glutes'], equipment: ['bodyweight', 'dumbbells'] },
  { name: 'Leg Press', category: 'legs', muscleGroups: ['Quads', 'Glutes'], equipment: ['machines', 'full_gym'], compound: true },
  { name: 'Leg Curl', category: 'legs', muscleGroups: ['Hamstrings'], equipment: ['machines', 'full_gym'] },
  { name: 'Calf Raise', category: 'legs', muscleGroups: ['Calves'], equipment: ['bodyweight', 'dumbbells', 'machines', 'full_gym'] },
  // Core
  { name: 'Plank', category: 'core', muscleGroups: ['Core'], equipment: ['bodyweight'] },
  { name: 'Hanging Leg Raise', category: 'core', muscleGroups: ['Core'], equipment: ['bodyweight'] },
  { name: 'Russian Twist', category: 'core', muscleGroups: ['Core', 'Obliques'], equipment: ['bodyweight', 'dumbbells'] },
  // Cardio
  { name: 'Treadmill Intervals', category: 'cardio', muscleGroups: ['Full Body'], equipment: ['cardio_machines'] },
  { name: 'Stationary Bike', category: 'cardio', muscleGroups: ['Legs'], equipment: ['cardio_machines'] },
  { name: 'Rowing Machine', category: 'cardio', muscleGroups: ['Full Body'], equipment: ['cardio_machines'] },
  { name: 'Burpees', category: 'cardio', muscleGroups: ['Full Body'], equipment: ['bodyweight'] },
  { name: 'Jump Rope', category: 'cardio', muscleGroups: ['Calves', 'Full Body'], equipment: ['bodyweight'] },
  { name: 'Mountain Climbers', category: 'cardio', muscleGroups: ['Core', 'Full Body'], equipment: ['bodyweight'] },
];

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Even-ish spread of N training days across the 7-day week. */
function trainingDayIndices(days: number): number[] {
  const picks: number[] = [];
  for (let i = 0; i < days; i++) picks.push(Math.round((i * 7) / days) % 7);
  return [...new Set(picks)].slice(0, days);
}

function splitForDays(days: number, goal: string): string[] {
  if (goal === 'endurance') {
    const base = ['Cardio', 'Full Body', 'Cardio', 'Full Body', 'Cardio', 'Cardio', 'Full Body'];
    return base.slice(0, days);
  }
  const splits: Record<number, string[]> = {
    1: ['Full Body'],
    2: ['Upper Body', 'Lower Body'],
    3: ['Push', 'Pull', 'Legs'],
    4: ['Upper Body', 'Lower Body', 'Push', 'Pull'],
    5: ['Push', 'Pull', 'Legs', 'Upper Body', 'Lower Body'],
    6: ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs'],
    7: ['Push', 'Pull', 'Legs', 'Upper Body', 'Lower Body', 'Cardio', 'Core & Mobility'],
  };
  return splits[days] ?? splits[3];
}

function categoriesForFocus(focus: string): LibExercise['category'][] {
  const f = focus.toLowerCase();
  if (f.includes('push')) return ['push'];
  if (f.includes('pull')) return ['pull'];
  if (f.includes('leg') || f.includes('lower')) return ['legs'];
  if (f.includes('upper')) return ['push', 'pull'];
  if (f.includes('cardio')) return ['cardio'];
  if (f.includes('core') || f.includes('mobility')) return ['core', 'cardio'];
  return ['push', 'pull', 'legs', 'core']; // full body
}

function expandEquipment(equip: Equipment[]): Set<Equipment> {
  const set = new Set<Equipment>(equip);
  set.add('bodyweight');
  if (set.has('full_gym')) {
    (['dumbbells', 'barbell', 'machines', 'cardio_machines', 'resistance_bands'] as Equipment[]).forEach(
      (e) => set.add(e),
    );
  }
  return set;
}

function repScheme(goal: string, level: string, cardio: boolean): { sets: number; reps: string; rest: number } {
  if (cardio) return { sets: 1, reps: `${goal === 'endurance' ? 30 : 20} minutes`, rest: 0 };
  let sets = 3;
  let reps = '10-12';
  let rest = 60;
  if (goal === 'build_muscle') { sets = 4; reps = '8-12'; rest = 90; }
  else if (goal === 'lose_fat') { sets = 3; reps = '12-15'; rest = 45; }
  else if (goal === 'recomp') { sets = 3; reps = '10-12'; rest = 60; }
  else if (goal === 'endurance') { sets = 3; reps = '15-20'; rest = 30; }
  if (level === 'beginner') sets = Math.max(2, sets - 1);
  if (level === 'advanced' && goal === 'build_muscle') sets += 1;
  return { sets, reps, rest };
}

export function generateLocalPlan(ctx: GenContext, input: PlanInput): WorkoutPlan {
  const equip = expandEquipment(input.equipment);
  const available = LIB.filter((e) => e.equipment.some((eq) => equip.has(eq)));
  const focuses = splitForDays(input.daysPerWeek, ctx.goal);
  const trainingDays = trainingDayIndices(input.daysPerWeek);
  const exPerDay = Math.min(8, Math.max(3, Math.round(input.durationMin / 9)));

  const schedule: DayPlan[] = DAY_NAMES.map((day, idx) => {
    const trainingSlot = trainingDays.indexOf(idx);
    if (trainingSlot === -1) {
      return {
        day,
        focus: 'Rest',
        estimatedDurationMin: 0,
        estimatedCaloriesBurned: 0,
        exercises: [],
      };
    }
    const focus = focuses[trainingSlot % focuses.length];
    const cats = categoriesForFocus(focus);
    const isCardio = cats.length === 1 && cats[0] === 'cardio';

    // Round-robin across the focus categories for balance.
    const pools = cats.map((c) => available.filter((e) => e.category === c));
    const chosen: LibExercise[] = [];
    let i = 0;
    while (chosen.length < exPerDay && pools.some((p) => p.length > 0)) {
      const pool = pools[i % pools.length];
      const ex = pool.shift();
      if (ex && !chosen.includes(ex)) chosen.push(ex);
      i++;
      if (i > 50) break;
    }
    // Add a core finisher for non-cardio strength days.
    if (!isCardio && chosen.length < exPerDay) {
      const core = available.find((e) => e.category === 'core' && !chosen.includes(e));
      if (core) chosen.push(core);
    }

    const exercises: PlanExercise[] = chosen.map((e) => {
      const cardio = e.category === 'cardio';
      const { sets, reps, rest } = repScheme(ctx.goal, input.fitnessLevel, cardio);
      return {
        name: e.name,
        sets,
        reps,
        restSeconds: rest,
        notes: e.compound ? 'Compound lift — prioritize form and progressive overload.' : '',
        muscleGroups: e.muscleGroups,
      };
    });

    const type = focusToType(focus);
    return {
      day,
      focus,
      estimatedDurationMin: input.durationMin,
      estimatedCaloriesBurned: estimateCalorieBurn(type, ctx.weightKg, input.durationMin),
      exercises,
    };
  });

  const goalLabel = GOAL_LABEL[ctx.goal] ?? ctx.goal;
  return {
    planName: `${input.daysPerWeek}-Day ${capitalize(goalLabel)} Plan`,
    weeklySchedule: schedule,
    nutritionNotes:
      `Your target of ${ctx.calories} kcal/day with ${ctx.protein}g protein supports this plan. ` +
      `Prioritize protein around training, and time most carbs near your sessions for energy and recovery.`,
    progressionTips:
      `Add a small amount of weight or 1–2 reps whenever you complete all sets at the top of the rep range. ` +
      `Deload every 6–8 weeks if fatigue accumulates, and keep at least one full rest day per week.`,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function generatePlan(
  ctx: GenContext,
  input: PlanInput,
): Promise<{ plan: WorkoutPlan; source: 'claude' | 'local' }> {
  const claude = await generateWithClaude(ctx, input);
  if (claude && claude.weeklySchedule.length > 0) return { plan: claude, source: 'claude' };
  return { plan: generateLocalPlan(ctx, input), source: 'local' };
}
