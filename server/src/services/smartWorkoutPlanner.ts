/**
 * Smart workout programming layer — goal-specific splits, rotation, time scaling,
 * and non-redundant exercise selection on top of the wger exercise pool.
 */
import { advanceRotationsIfDue, getRotationIndex } from '../db/exerciseRotationsRepo.js';
import type { Goal } from '../domain/types.js';
import type { ExerciseRecord, TrainingGoal } from '../domain/exerciseTypes.js';
import { resolveMuscleTargetLabel } from '../domain/exerciseMuscleTargets.js';
import {
  estimateCalorieBurn,
  focusToType,
  type DayPlan,
  type Equipment,
  type ExerciseTimeBreakdown,
  type FitnessLevel,
  type PlanExercise,
  type PlanInput,
  type TimeTradeoffMode,
  type WorkoutPlan,
} from '../domain/workout.js';
import {
  getAllExercises,
  getExercisesByRotationGroup,
  getSmartExercisesForFocus,
} from './exercisePool.js';
import type { GenContext } from './workoutPlan.js';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const REP_EXPLANATION: Record<TrainingGoal, string> = {
  muscle_gain:
    'Hypertrophy range — this rep range maximizes time under tension and metabolic stress, the two primary drivers of muscle growth.',
  fat_loss:
    'Higher reps, shorter rest keeps your heart rate elevated — burning more calories during AND after the session.',
  endurance:
    'Higher reps with controlled rest build muscular endurance and work capacity.',
  maintain:
    'Moderate reps and rest preserve strength and muscle without excessive fatigue.',
  recomp:
    'Balanced rep range supports muscle retention while keeping training density high enough for fat loss.',
};

const QUAD_ROTATION_GROUPS = new Set([
  'quad-dominant-heavy',
  'quad-dominant-machine',
  'quad-isolation',
  'quad-unilateral',
  'inner-quad-glute',
]);

const LEG_SLOT_ORDER = [
  'quad-dominant-heavy',
  'quad-dominant-machine',
  'hamstring-dominant-hinge',
  'glute-dominant',
  'hamstring-isolation',
  'quad-isolation',
  'quad-unilateral',
  'calf-isolation',
  'inner-quad-glute',
];

interface LegSlot {
  rotationGroup: string;
  namePrefer?: RegExp;
  fallbackGroup?: string;
}

function isLegFocus(focus: string): boolean {
  const f = focus.toLowerCase();
  return f.includes('leg') || f.includes('lower');
}

function legDaySlots(durationMin: number): LegSlot[] {
  if (durationMin <= 30) {
    return [
      { rotationGroup: 'quad-dominant-heavy', fallbackGroup: 'quad-dominant-machine' },
      { rotationGroup: 'hamstring-dominant-hinge' },
      { rotationGroup: 'glute-dominant' },
    ];
  }
  if (durationMin <= 45) {
    return [
      { rotationGroup: 'quad-dominant-heavy', fallbackGroup: 'quad-dominant-machine' },
      { rotationGroup: 'hamstring-dominant-hinge' },
      { rotationGroup: 'glute-dominant' },
      { rotationGroup: 'hamstring-isolation' },
      { rotationGroup: 'calf-isolation', namePrefer: /standing|calf raise/i },
    ];
  }
  return [
    { rotationGroup: 'quad-dominant-heavy', fallbackGroup: 'quad-dominant-machine' },
    { rotationGroup: 'hamstring-dominant-hinge' },
    { rotationGroup: 'glute-dominant' },
    { rotationGroup: 'hamstring-isolation' },
    { rotationGroup: 'calf-isolation', namePrefer: /standing|calf raise/i },
    { rotationGroup: 'quad-isolation' },
    { rotationGroup: 'calf-isolation', namePrefer: /seated/i },
    { rotationGroup: 'quad-unilateral' },
  ];
}

/** Order: primary compounds → secondary compounds → isolation → core. */
function exerciseOrderPriority(record: ExerciseRecord): number {
  const pattern = record.smartData?.movementPattern ?? 'isolation';
  const group = record.smartData?.rotationGroup ?? '';
  if (group.startsWith('core-')) return 4;
  if (pattern === 'isolation') return 3;
  if (pattern === 'squat' || pattern === 'hinge' || pattern === 'push' || pattern === 'pull') return 1;
  return 2;
}

function sortExerciseRecords(records: ExerciseRecord[], focus: string): ExerciseRecord[] {
  if (isLegFocus(focus)) {
    return [...records].sort((a, b) => {
      const ga = a.smartData?.rotationGroup ?? '';
      const gb = b.smartData?.rotationGroup ?? '';
      const ia = LEG_SLOT_ORDER.indexOf(ga);
      const ib = LEG_SLOT_ORDER.indexOf(gb);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }
  return [...records].sort((a, b) => exerciseOrderPriority(a) - exerciseOrderPriority(b));
}

function sortPlanExercises(exercises: PlanExercise[], focus: string): PlanExercise[] {
  if (isLegFocus(focus)) {
    return [...exercises].sort((a, b) => {
      const ia = LEG_SLOT_ORDER.indexOf(a.rotationGroup ?? '');
      const ib = LEG_SLOT_ORDER.indexOf(b.rotationGroup ?? '');
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }
  const priority = (ex: PlanExercise) => {
    const group = ex.rotationGroup ?? '';
    if (group.startsWith('core-')) return 4;
    if (ex.movementPattern === 'isolation') return 3;
    if (['squat', 'hinge', 'push', 'pull'].includes(ex.movementPattern ?? '')) return 1;
    return 2;
  };
  return [...exercises].sort((a, b) => priority(a) - priority(b));
}
const COMPATIBLE_ROTATION_PAIRS = new Set([
  'horizontal-push-heavy|chest-isolation-mid',
  'chest-isolation-mid|horizontal-push-heavy',
  'upper-chest-compound|chest-isolation-mid',
  'chest-isolation-mid|upper-chest-compound',
]);

export interface SmartPlannerContext extends GenContext {
  trainingGoal: TrainingGoal;
}

export function profileGoalToTrainingGoal(goal: Goal): TrainingGoal {
  const map: Record<Goal, TrainingGoal> = {
    build_muscle: 'muscle_gain',
    lose_fat: 'fat_loss',
    endurance: 'endurance',
    maintain: 'maintain',
    recomp: 'recomp',
  };
  return map[goal] ?? 'maintain';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function goalLabel(goal: TrainingGoal): string {
  const labels: Record<TrainingGoal, string> = {
    muscle_gain: 'muscle gain',
    fat_loss: 'fat loss',
    endurance: 'endurance',
    maintain: 'maintenance',
    recomp: 'recomposition',
  };
  return labels[goal];
}

/** Assign focus labels per training day for a goal. */
function splitForGoal(daysPerWeek: number, goal: TrainingGoal): string[] {
  if (goal === 'fat_loss') {
    const map: Record<number, string[]> = {
      3: ['Full Body A', 'Full Body B', 'Full Body C'],
      4: ['Upper A', 'Lower A', 'Upper B', 'Lower B'],
      5: ['Push', 'Pull', 'Legs', 'Upper', 'Lower'],
      6: ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs'],
    };
    return map[daysPerWeek] ?? map[4];
  }
  if (goal === 'endurance') {
    const map: Record<number, string[]> = {
      3: ['Full Body A', 'Full Body B', 'Full Body C'],
      4: ['Upper A', 'Lower A', 'Upper B', 'Lower B'],
      5: ['Push', 'Pull', 'Legs', 'Upper', 'Lower'],
      6: ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs'],
    };
    return map[daysPerWeek] ?? map[3];
  }
  // muscle_gain + maintain + recomp
  const map: Record<number, string[]> = {
    1: ['Full Body A'],
    2: ['Upper A', 'Lower A'],
    3: ['Full Body A', 'Full Body B', 'Full Body C'],
    4: ['Upper A', 'Lower A', 'Upper B', 'Lower B'],
    5: ['Push', 'Pull', 'Legs', 'Upper', 'Lower'],
    6: ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs'],
    7: ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body A', 'Full Body B'],
  };
  return map[daysPerWeek] ?? map[4];
}

/** Pick training day indices avoiding 3+ consecutive training days when possible. */
export function trainingDayIndices(days: number): number[] {
  if (days >= 7) return [0, 1, 2, 3, 4, 5, 6];
  const patterns: Record<number, number[]> = {
    1: [2],
    2: [1, 4],
    3: [0, 2, 4],
    4: [0, 1, 3, 5],
    5: [0, 1, 3, 4, 6],
    6: [0, 1, 3, 4, 5, 6],
  };
  return patterns[days] ?? patterns[4];
}

function focusSlots(focus: string, variantIndex: number): string[] {
  const f = focus.toLowerCase();
  if (f.includes('full body')) {
    const variants = [
      ['quad-dominant-heavy', 'horizontal-push-heavy', 'horizontal-pull-heavy', 'core-stability'],
      ['hamstring-dominant-hinge', 'vertical-push-heavy', 'vertical-pull-bodyweight', 'core-flexion'],
      ['glute-dominant', 'upper-chest-compound', 'horizontal-pull-cable', 'core-rotation'],
    ];
    return variants[variantIndex % variants.length];
  }
  if (f.includes('push')) {
    return [
      'vertical-push-heavy',
      'horizontal-push-heavy',
      'upper-chest-compound',
      'medial-delt-isolation',
      'tricep-isolation',
    ];
  }
  if (f.includes('pull')) {
    return [
      'vertical-pull-bodyweight',
      'horizontal-pull-heavy',
      'horizontal-pull-cable',
      'rear-delt-isolation',
      'bicep-compound',
    ];
  }
  if (f.includes('leg') || f.includes('lower')) {
    return [
      'quad-dominant-heavy',
      'hamstring-dominant-hinge',
      'glute-dominant',
      'quad-unilateral',
      'calf-isolation',
    ];
  }
  if (f.includes('upper')) {
    return [
      'horizontal-push-heavy',
      'horizontal-pull-heavy',
      'vertical-push-heavy',
      'medial-delt-isolation',
      'bicep-compound',
    ];
  }
  return ['quad-dominant-heavy', 'horizontal-push-heavy', 'horizontal-pull-heavy', 'core-stability'];
}

function exerciseBudget(durationMin: number): { max: number; compoundOnly: boolean } {
  if (durationMin <= 20) return { max: 3, compoundOnly: true };
  if (durationMin <= 30) return { max: 4, compoundOnly: false };
  if (durationMin <= 45) return { max: 6, compoundOnly: false };
  if (durationMin <= 60) return { max: 8, compoundOnly: false };
  return { max: 12, compoundOnly: false };
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

function matchesEquipment(record: ExerciseRecord, equip: Set<Equipment>): boolean {
  if (equip.has('full_gym')) return true;
  const wger = record.equipment.map((e) => e.toLowerCase());
  if (wger.length === 0 && equip.has('bodyweight')) return true;

  const checks: [Equipment, string[]][] = [
    ['bodyweight', ['body weight', 'none (bodyweight exercise)', 'none']],
    ['dumbbells', ['dumbbell']],
    ['barbell', ['barbell', 'sz-bar', 'ez bar']],
    ['machines', ['machine', 'cable', 'smith', 'sled']],
    ['cardio_machines', ['machine']],
    ['resistance_bands', ['band']],
  ];

  for (const [key, keywords] of checks) {
    if (!equip.has(key)) continue;
    if (keywords.some((kw) => wger.some((name) => name.includes(kw)))) return true;
  }
  return equip.has('bodyweight') && wger.every((n) => n.includes('none') || n.includes('body'));
}

function matchesFitness(record: ExerciseRecord, level: FitnessLevel): boolean {
  const diff = record.smartData?.difficulty ?? 'intermediate';
  if (level === 'beginner' && diff === 'advanced') return false;
  return true;
}

function matchesLimitations(record: ExerciseRecord, limitations: string): boolean {
  const lim = limitations.toLowerCase();
  if (!lim.trim()) return true;
  if (/knee|joint|shoulder|back|hip/.test(lim) && record.smartData?.jointFriendly === false) {
    if (/knee/.test(lim) && record.smartData.movementPattern === 'squat') return false;
    if (/shoulder/.test(lim) && record.smartData.movementPattern === 'push') return false;
    if (/back/.test(lim) && record.smartData.movementPattern === 'hinge') return false;
  }
  return true;
}

function ratingForGoal(record: ExerciseRecord, goal: TrainingGoal): number {
  const smart = record.smartData;
  if (!smart) return 0;
  if (goal === 'muscle_gain') return smart.hypertrophyRating;
  if (goal === 'fat_loss') return smart.fatLossRating;
  if (goal === 'endurance') return smart.enduranceRating;
  return (smart.hypertrophyRating + smart.fatLossRating) / 2;
}

function isCompound(record: ExerciseRecord): boolean {
  const pattern = record.smartData?.movementPattern;
  return pattern === 'push' || pattern === 'pull' || pattern === 'squat' || pattern === 'hinge';
}

function pickFromRotationGroup(
  userId: string,
  rotationGroup: string,
  pool: ExerciseRecord[],
  goal: TrainingGoal,
  usedNames: Set<string>,
  namePrefer?: RegExp,
): ExerciseRecord | null {
  let candidates = getExercisesByRotationGroup(rotationGroup)
    .filter((r) => r.smartData && pool.some((p) => p.id === r.id))
    .filter((r) => !usedNames.has(r.name.toLowerCase()))
    .sort((a, b) => ratingForGoal(b, goal) - ratingForGoal(a, goal));

  if (namePrefer) {
    const preferred = candidates.filter((r) => namePrefer.test(r.name));
    if (preferred.length > 0) candidates = preferred;
  }

  if (candidates.length === 0) {
    let fallback = pool
      .filter((r) => r.smartData?.rotationGroup === rotationGroup)
      .filter((r) => !usedNames.has(r.name.toLowerCase()))
      .sort((a, b) => ratingForGoal(b, goal) - ratingForGoal(a, goal));
    if (namePrefer) {
      const preferred = fallback.filter((r) => namePrefer.test(r.name));
      if (preferred.length > 0) fallback = preferred;
    }
    if (fallback.length === 0) return null;
    const idx = getRotationIndex(userId, rotationGroup) % fallback.length;
    return fallback[idx];
  }

  const idx = getRotationIndex(userId, rotationGroup) % candidates.length;
  return candidates[idx];
}

function canAddToSession(
  record: ExerciseRecord,
  session: ExerciseRecord[],
): { ok: boolean; reason?: string } {
  const group = record.smartData?.rotationGroup;
  if (!group) return { ok: true };

  for (const existing of session) {
    const existingGroup = existing.smartData?.rotationGroup;
    if (!existingGroup) continue;
    if (existingGroup === group) {
      return {
        ok: false,
        reason: `Same rotation group (${group}) — ${existing.name} already covers this movement slot.`,
      };
    }
    const pairKey = `${existingGroup}|${group}`;
    if (!COMPATIBLE_ROTATION_PAIRS.has(pairKey)) continue;
  }

  const primary = record.smartData?.musclesFocused.primary[0];
  for (const existing of session) {
    const existingPrimary = existing.smartData?.musclesFocused.primary[0];
    if (
      primary &&
      existingPrimary &&
      primary === existingPrimary &&
      record.smartData?.movementPattern === existing.smartData?.movementPattern
    ) {
      return {
        ok: false,
        reason: `Duplicate primary target (${primary}) with same movement pattern.`,
      };
    }
  }
  return { ok: true };
}

function repsMidpoint(reps: string): number {
  const range = reps.match(/(\d+)\s*-\s*(\d+)/);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  if (/amrap/i.test(reps)) return 12;
  if (/sec/i.test(reps)) return 1;
  const n = Number.parseInt(reps, 10);
  return Number.isFinite(n) ? n : 10;
}

const WARMUP_MINUTES = 5;
const TRANSITION_MINUTES_PER_EXERCISE = 2.5;
const REST_REAL_WORLD_FACTOR = 1.2;

function secondsPerRep(goal: TrainingGoal): number {
  if (goal === 'muscle_gain') return 3;
  if (goal === 'fat_loss' || goal === 'endurance') return 2;
  return 2.5;
}

function roundToNearest5(minutes: number): number {
  return Math.round(minutes / 5) * 5;
}

/** Active + rest work time for one exercise (excludes transition). */
function estimateExerciseWorkMinutes(ex: PlanExercise, goal: TrainingGoal): number {
  const mid = repsMidpoint(ex.reps);
  const activeSec = ex.sets * mid * secondsPerRep(goal);
  const restSec = ex.sets * ex.restSeconds * REST_REAL_WORLD_FACTOR;
  return (activeSec + restSec) / 60;
}

/** Per-exercise block including setup/transition (for breakdown display). */
export function estimateExerciseMinutes(ex: PlanExercise, goal: TrainingGoal): number {
  return Math.round((estimateExerciseWorkMinutes(ex, goal) + TRANSITION_MINUTES_PER_EXERCISE) * 10) / 10;
}

export interface SessionTimeEstimate {
  baseMinutes: number;
  lowMinutes: number;
  highMinutes: number;
  midpointMinutes: number;
  timeBreakdown: ExerciseTimeBreakdown[];
}

export function estimateSessionTime(
  exercises: PlanExercise[],
  goal: TrainingGoal,
): SessionTimeEstimate {
  const timeBreakdown = exercises.map((ex) => ({
    exerciseName: ex.name,
    minutes: estimateExerciseMinutes(ex, goal),
  }));
  const workMinutes = exercises.reduce((sum, ex) => sum + estimateExerciseWorkMinutes(ex, goal), 0);
  const transitionMinutes = exercises.length * TRANSITION_MINUTES_PER_EXERCISE;
  const baseMinutes = workMinutes + transitionMinutes + WARMUP_MINUTES;
  const lowMinutes = roundToNearest5(baseMinutes * 0.9);
  const highMinutes = roundToNearest5(baseMinutes * 1.15);
  const midpointMinutes = Math.round((lowMinutes + highMinutes) / 2);
  return {
    baseMinutes,
    lowMinutes,
    highMinutes,
    midpointMinutes,
    timeBreakdown,
  };
}

function sessionHighMinutes(exercises: PlanExercise[], goal: TrainingGoal): number {
  return estimateSessionTime(exercises, goal).highMinutes;
}

function isIsolationExercise(ex: PlanExercise): boolean {
  return ex.movementPattern === 'isolation' || ex.movementPattern === 'carry';
}

function findLastIsolationIndex(list: PlanExercise[]): number {
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (isIsolationExercise(list[i]!)) return i;
  }
  return -1;
}

function trimOverBudgetByTenMinutes(
  exercises: PlanExercise[],
  budgetMin: number,
  goal: TrainingGoal,
): PlanExercise[] {
  let list = [...exercises];
  while (sessionHighMinutes(list, goal) > budgetMin + 10 && list.length > 2) {
    const isoIndex = findLastIsolationIndex(list);
    if (isoIndex === -1) break;
    list = list.filter((_, i) => i !== isoIndex);
  }
  return list;
}

export function planExerciseFromRecord(
  record: ExerciseRecord,
  goal: TrainingGoal,
  isNewRotation = false,
): PlanExercise {
  return recordToPlanExercise(record, goal, isNewRotation);
}

function recordToPlanExercise(
  record: ExerciseRecord,
  goal: TrainingGoal,
  isNewRotation: boolean,
): PlanExercise {
  const smart = record.smartData!;
  const rep = { ...smart.repRangeByGoal[goal] };
  if (goal === 'fat_loss' && rep.rest > 60) rep.rest = 45;
  if (goal === 'endurance' && rep.rest > 60) rep.rest = 60;

  const primaryMuscle = resolveMuscleTargetLabel(record);
  return {
    name: record.name,
    exerciseId: record.id,
    sets: rep.sets,
    reps: rep.reps,
    restSeconds: rep.rest,
    notes: '',
    muscleGroups: [...smart.musclesFocused.primary, ...smart.musclesFocused.secondary].slice(0, 4),
    rotationGroup: smart.rotationGroup,
    primaryMuscle,
    movementPattern: smart.movementPattern,
    repExplanation: REP_EXPLANATION[goal],
    isNewRotation,
  };
}

function describeOrderPlacement(
  record: ExerciseRecord,
  index: number,
  total: number,
): string {
  const pattern = record.smartData?.movementPattern ?? 'movement';
  const group = record.smartData?.rotationGroup ?? '';
  if (index === 0) {
    return `It opens this session while you're freshest — critical for ${pattern} work where load and form matter most.`;
  }
  if (group.startsWith('core-')) {
    return `Scheduled last so core fatigue never limits your compound lifts.`;
  }
  if (pattern === 'isolation') {
    return `Placed after compounds so the target muscle is pre-fatigued and receives isolated volume without compromising earlier heavy sets.`;
  }
  if (pattern === 'hinge' && index === 1) {
    return `Second in the session to counterbalance the quad-dominant opener and train the posterior chain while still fresh enough for load.`;
  }
  return `Positioned mid-session to accumulate quality volume after primary compounds are complete.`;
}

function buildSessionReason(
  record: ExerciseRecord,
  goal: TrainingGoal,
  focus: string,
  orderedSession: PlanExercise[],
  index: number,
): string {
  const smart = record.smartData!;
  const others = orderedSession.filter((_, i) => i !== index);
  const otherNames = others.map((e) => e.name);
  const goalWhy = smart.goalExplanation[goal];
  const unique = smart.uniqueMuscleContribution;
  const placement = describeOrderPlacement(record, index, orderedSession.length);

  const complement =
    otherNames.length > 0
      ? `Where ${otherNames.join(' and ')} cover different angles, this exercise ${unique.charAt(0).toLowerCase()}${unique.slice(1)}`
      : unique;

  return (
    `For ${goalLabel(goal)} on ${focus}, ${goalWhy} ${complement} ${placement}`
  ).replace(/\s+/g, ' ').trim();
}

function buildSessionOverview(
  focus: string,
  goal: TrainingGoal,
  exercises: PlanExercise[],
  daysPerWeek: number,
  trainingSlot: number,
): string {
  const muscles = [...new Set(exercises.map((e) => e.primaryMuscle?.split('(')[0].trim()).filter(Boolean))];
  const muscleList = muscles.length > 0 ? muscles.join(', ') : 'multiple muscle groups';
  const weeklyContext = (() => {
    if (daysPerWeek <= 3) {
      return `Within your ${daysPerWeek}-day full-body split, this session distributes ${focus.toLowerCase()} work across the week so each muscle group is trained with adequate recovery.`;
    }
    if (focus.toLowerCase().includes('leg') || focus.toLowerCase().includes('lower')) {
      return `This leg day is one of ${daysPerWeek} weekly sessions — it pairs quad, hamstring, glute, and calf work in one balanced lower-body block so nothing gets neglected.`;
    }
    if (focus.toLowerCase().includes('push')) {
      return `As push day ${trainingSlot + 1} in your ${daysPerWeek}-day plan, this session drives chest, shoulder, and tricep growth without overlapping with pull-day back and biceps work.`;
    }
    if (focus.toLowerCase().includes('pull')) {
      return `This pull session complements push day in your ${daysPerWeek}-day split, prioritizing back width and thickness plus rear-delt and bicep work on dedicated recovery from pressing.`;
    }
    return `Session ${trainingSlot + 1} of your ${daysPerWeek}-day ${goalLabel(goal)} plan — structured so overlapping muscles aren't overtrained across the week.`;
  })();

  const focusTip = (() => {
    if (goal === 'muscle_gain') {
      return `Focus on controlled reps in the prescribed hypertrophy range, add weight when you hit the top of the rep range for all sets, and rest fully between compounds.`;
    }
    if (goal === 'fat_loss') {
      return `Keep rest periods tight, maintain form under fatigue, and treat the finisher as non-negotiable for maximum calorie burn.`;
    }
    return `Execute each movement with intent, track loads week to week, and prioritize form over ego lifting.`;
  })();

  return (
    `This ${focus} session targets ${muscleList} using non-redundant movement patterns so every exercise earns its place. ` +
    `${weeklyContext} ` +
    `${focusTip}`
  );
}

function trimToTimeBudget(
  exercises: PlanExercise[],
  budgetMin: number,
  goal: TrainingGoal,
  compoundOnly: boolean,
): PlanExercise[] {
  let list = compoundOnly
    ? exercises.filter((e) => !isIsolationExercise(e))
    : [...exercises];

  list = trimOverBudgetByTenMinutes(list, budgetMin, goal);

  while (sessionHighMinutes(list, goal) > budgetMin && list.length > 2) {
    const last = list[list.length - 1];
    if (isIsolationExercise(last)) {
      list = list.slice(0, -1);
      continue;
    }
    if (list.length > 3) {
      list = list.slice(0, -1);
      continue;
    }
    break;
  }

  while (sessionHighMinutes(list, goal) > budgetMin) {
    let reduced = false;
    list = list.map((ex) => {
      if (ex.sets <= 2) return ex;
      reduced = true;
      return { ...ex, sets: ex.sets - 1 };
    });
    if (!reduced) break;
  }

  return list;
}

function applyTimeTradeoff(
  exercises: PlanExercise[],
  mode: TimeTradeoffMode,
  goal: TrainingGoal,
  budgetMin: number,
): PlanExercise[] {
  if (mode === 'shorter_rest') {
    const adjusted = exercises.map((ex) => ({
      ...ex,
      restSeconds: Math.max(30, Math.round(ex.restSeconds * 0.65)),
    }));
    return adjusted;
  }
  if (mode === 'fewer_sets') {
    const adjusted = exercises.map((ex) => ({
      ...ex,
      sets: Math.max(2, ex.sets - 1),
    }));
    return trimToTimeBudget(adjusted, budgetMin, goal, false);
  }
  return exercises;
}

function selectLegDayExercises(
  userId: string,
  goal: TrainingGoal,
  equip: Set<Equipment>,
  level: FitnessLevel,
  limitations: string,
  durationMin: number,
): ExerciseRecord[] {
  const pool = getSmartExercisesForFocus('Legs').filter(
    (r) =>
      r.smartData &&
      matchesEquipment(r, equip) &&
      matchesFitness(r, level) &&
      matchesLimitations(r, limitations),
  );

  const session: ExerciseRecord[] = [];
  const usedNames = new Set<string>();
  let quadCount = 0;

  for (const slot of legDaySlots(durationMin)) {
    if (QUAD_ROTATION_GROUPS.has(slot.rotationGroup) && quadCount >= 2) continue;

    let pick = pickFromRotationGroup(
      userId,
      slot.rotationGroup,
      pool,
      goal,
      usedNames,
      slot.namePrefer,
    );
    if (!pick && slot.fallbackGroup) {
      pick = pickFromRotationGroup(
        userId,
        slot.fallbackGroup,
        pool,
        goal,
        usedNames,
        slot.namePrefer,
      );
    }
    if (!pick) continue;

    const check = canAddToSession(pick, session);
    if (!check.ok) continue;

    session.push(pick);
    usedNames.add(pick.name.toLowerCase());
    if (QUAD_ROTATION_GROUPS.has(pick.smartData!.rotationGroup)) quadCount += 1;
  }

  return sortExerciseRecords(session, 'Legs');
}

function selectSessionExercises(
  userId: string,
  focus: string,
  variantIndex: number,
  goal: TrainingGoal,
  equip: Set<Equipment>,
  level: FitnessLevel,
  limitations: string,
  budget: { max: number; compoundOnly: boolean },
  durationMin: number,
  rotatedGroups: Set<string>,
): ExerciseRecord[] {
  if (isLegFocus(focus)) {
    return selectLegDayExercises(userId, goal, equip, level, limitations, durationMin);
  }

  const pool = getSmartExercisesForFocus(focus).filter(
    (r) =>
      r.smartData &&
      matchesEquipment(r, equip) &&
      matchesFitness(r, level) &&
      matchesLimitations(r, limitations),
  );

  const slots = focusSlots(focus, variantIndex).slice(0, budget.max);
  const session: ExerciseRecord[] = [];
  const usedNames = new Set<string>();

  for (const slot of slots) {
    const pick = pickFromRotationGroup(userId, slot, pool, goal, usedNames);
    if (!pick) continue;
    const check = canAddToSession(pick, session);
    if (!check.ok) continue;
    session.push(pick);
    usedNames.add(pick.name.toLowerCase());
  }

  if (session.length < 2) {
    const rated = pool
      .filter((r) => !usedNames.has(r.name.toLowerCase()))
      .sort((a, b) => ratingForGoal(b, goal) - ratingForGoal(a, goal));
    for (const candidate of rated) {
      if (session.length >= budget.max) break;
      if (budget.compoundOnly && !isCompound(candidate)) continue;
      const check = canAddToSession(candidate, session);
      if (!check.ok) continue;
      session.push(candidate);
      usedNames.add(candidate.name.toLowerCase());
    }
  }

  void rotatedGroups;
  return sortExerciseRecords(session, focus);
}

const MUSCLE_GROUP_SLOTS: Record<string, string[]> = {
  Chest: ['horizontal-push-heavy', 'upper-chest-compound', 'chest-isolation-mid'],
  Triceps: ['tricep-compound', 'tricep-isolation'],
  Shoulders: ['vertical-push-heavy', 'medial-delt-isolation', 'anterior-delt-isolation', 'rear-delt-isolation'],
  Back: ['vertical-pull-bodyweight', 'horizontal-pull-heavy', 'horizontal-pull-cable', 'lat-isolation'],
  Biceps: ['bicep-compound', 'bicep-stretch-isolation', 'bicep-peak-isolation', 'brachialis-isolation'],
  Legs: ['quad-dominant-heavy', 'quad-dominant-machine', 'quad-isolation', 'quad-unilateral', 'calf-isolation'],
  Glutes: ['glute-dominant', 'posterior-chain-heavy'],
  Hamstrings: ['hamstring-dominant-hinge', 'hamstring-isolation'],
  Core: ['core-stability', 'core-flexion', 'core-rotation', 'core-anti-rotation'],
  Cardio: ['conditioning-rope', 'conditioning-plyo', 'conditioning-bodyweight', 'conditioning-cardio', 'conditioning-sled'],
  'Full Body': [
    'quad-dominant-heavy',
    'horizontal-push-heavy',
    'horizontal-pull-heavy',
    'vertical-push-heavy',
    'core-stability',
  ],
};

export function rotationSlotsForMuscleGroups(muscleGroups: string[]): string[] {
  const slots: string[] = [];
  const seen = new Set<string>();
  for (const group of muscleGroups) {
    for (const slot of MUSCLE_GROUP_SLOTS[group] ?? []) {
      if (seen.has(slot)) continue;
      seen.add(slot);
      slots.push(slot);
    }
  }
  return slots;
}

function isCustomLegDay(muscleGroups: string[]): boolean {
  return (
    muscleGroups.includes('Legs') &&
    (muscleGroups.includes('Glutes') || muscleGroups.includes('Hamstrings'))
  );
}

function focusLabelFromMuscleGroups(muscleGroups: string[]): string {
  return muscleGroups.join(' · ');
}

/** Select goal-appropriate exercises for user-chosen muscle groups. */
export function selectExercisesForMuscleGroups(
  userId: string,
  muscleGroups: string[],
  goal: TrainingGoal,
  equip: Equipment[],
  level: FitnessLevel,
  limitations: string,
  durationMin: number,
): ExerciseRecord[] {
  const equipSet = expandEquipment(equip);
  const budget = exerciseBudget(durationMin);

  if (isCustomLegDay(muscleGroups)) {
    return selectLegDayExercises(userId, goal, equipSet, level, limitations, durationMin);
  }

  const pool = getAllExercises().filter(
    (r) =>
      r.smartData &&
      matchesEquipment(r, equipSet) &&
      matchesFitness(r, level) &&
      matchesLimitations(r, limitations),
  );

  const slots = rotationSlotsForMuscleGroups(muscleGroups).slice(0, budget.max);
  const session: ExerciseRecord[] = [];
  const usedNames = new Set<string>();
  const focus = focusLabelFromMuscleGroups(muscleGroups);

  for (const slot of slots) {
    const pick = pickFromRotationGroup(userId, slot, pool, goal, usedNames);
    if (!pick) continue;
    const check = canAddToSession(pick, session);
    if (!check.ok) continue;
    session.push(pick);
    usedNames.add(pick.name.toLowerCase());
  }

  if (session.length < 2) {
    const rated = pool
      .filter((r) => !usedNames.has(r.name.toLowerCase()))
      .sort((a, b) => ratingForGoal(b, goal) - ratingForGoal(a, goal));
    for (const candidate of rated) {
      if (session.length >= budget.max) break;
      if (budget.compoundOnly && !isCompound(candidate)) continue;
      const check = canAddToSession(candidate, session);
      if (!check.ok) continue;
      session.push(candidate);
      usedNames.add(candidate.name.toLowerCase());
    }
  }

  return sortExerciseRecords(session, focus);
}

export function buildDayFromMuscleGroups(
  userId: string,
  day: string,
  muscleGroups: string[],
  goal: TrainingGoal,
  ctx: SmartPlannerContext,
  equip: Equipment[],
  level: FitnessLevel,
  limitations: string,
  durationMin: number,
  rotatedGroups: Set<string>,
  daysPerWeek: number,
  trainingSlot: number,
): DayPlan {
  const focus = focusLabelFromMuscleGroups(muscleGroups);
  const budget = exerciseBudget(durationMin);
  const rawRecords = selectExercisesForMuscleGroups(
    userId,
    muscleGroups,
    goal,
    equip,
    level,
    limitations,
    durationMin,
  );

  let planExercises = rawRecords.map((record) => {
    const group = record.smartData!.rotationGroup;
    const isNew = rotatedGroups.has(group);
    return recordToPlanExercise(record, goal, isNew);
  });

  planExercises = sortPlanExercises(planExercises, focus);
  planExercises = trimToTimeBudget(planExercises, durationMin, goal, budget.compoundOnly);
  planExercises = sortPlanExercises(planExercises, focus);

  planExercises = planExercises.map((ex, index) => {
    const record = rawRecords.find((r) => r.name === ex.name);
    return {
      ...ex,
      sessionReason: record
        ? buildSessionReason(record, goal, focus, planExercises, index)
        : ex.sessionReason,
    };
  });

  const {
    calculatedDurationMin,
    calculatedDurationMinLow,
    calculatedDurationMinHigh,
    timeBreakdown,
  } = recalculateDayExercises(planExercises, 'default', goal, durationMin);

  const type = focusToType(focus);
  const cardioFinisher =
    goal === 'fat_loss' && planExercises.length > 0 && !muscleGroups.includes('Cardio')
      ? '10–15 min cardio finisher: battle ropes, jump rope, or incline walk to keep heart rate elevated.'
      : undefined;

  return {
    day,
    focus,
    estimatedDurationMin: calculatedDurationMin || durationMin,
    calculatedDurationMin,
    calculatedDurationMinLow,
    calculatedDurationMinHigh,
    estimatedCaloriesBurned: estimateCalorieBurn(type, ctx.weightKg, calculatedDurationMin || durationMin),
    exercises: planExercises,
    sessionOverview: buildSessionOverview(focus, goal, planExercises, daysPerWeek, trainingSlot),
    timeBreakdown,
    cardioFinisher,
    timeTradeoff: 'default',
    showTimeTradeoffBanner: durationMin < 45,
    rotationNotice:
      rotatedGroups.size > 0
        ? 'Your exercises updated this week to keep your muscles adapting.'
        : undefined,
  };
}

export function recalculateDayExercises(
  exercises: PlanExercise[],
  mode: TimeTradeoffMode,
  goal: TrainingGoal,
  budgetMin: number,
): {
  exercises: PlanExercise[];
  calculatedDurationMin: number;
  calculatedDurationMinLow: number;
  calculatedDurationMinHigh: number;
  timeBreakdown: ExerciseTimeBreakdown[];
} {
  let adjusted =
    mode === 'default' ? exercises : applyTimeTradeoff(exercises, mode, goal, budgetMin);
  if (mode !== 'default') {
    adjusted = trimOverBudgetByTenMinutes(adjusted, budgetMin, goal);
  }
  const estimate = estimateSessionTime(adjusted, goal);
  return {
    exercises: adjusted,
    calculatedDurationMin: estimate.midpointMinutes,
    calculatedDurationMinLow: estimate.lowMinutes,
    calculatedDurationMinHigh: estimate.highMinutes,
    timeBreakdown: estimate.timeBreakdown,
  };
}

export function generateSmartPlan(
  userId: string,
  ctx: SmartPlannerContext,
  input: PlanInput,
  tradeoff: TimeTradeoffMode = 'default',
): WorkoutPlan {
  const goal = ctx.trainingGoal;
  const equip = expandEquipment(input.equipment);
  const focuses = splitForGoal(input.daysPerWeek, goal);
  const trainingDays = trainingDayIndices(input.daysPerWeek);
  const budget = exerciseBudget(input.durationMin);

  const allGroups = getAllExercises()
    .filter((e) => e.smartData)
    .map((e) => e.smartData!.rotationGroup);
  const uniqueGroups = [...new Set(allGroups)];
  const rotatedGroups = advanceRotationsIfDue(userId, uniqueGroups);

  let fullBodyVariant = 0;
  const schedule: DayPlan[] = DAY_NAMES.map((day, idx) => {
    const slot = trainingDays.indexOf(idx);
    if (slot === -1) {
      return {
        day,
        focus: 'Rest',
        estimatedDurationMin: 0,
        estimatedCaloriesBurned: 0,
        exercises: [],
      };
    }

    const focus = focuses[slot % focuses.length];
    if (focus.toLowerCase().includes('full body')) fullBodyVariant += 1;
    const variantIndex = focus.toLowerCase().includes('full body') ? fullBodyVariant - 1 : slot;

    const rawRecords = selectSessionExercises(
      userId,
      focus,
      variantIndex,
      goal,
      equip,
      input.fitnessLevel,
      input.limitations,
      budget,
      input.durationMin,
      rotatedGroups,
    );

    let planExercises = rawRecords.map((record) => {
      const group = record.smartData!.rotationGroup;
      const isNew = rotatedGroups.has(group);
      return recordToPlanExercise(record, goal, isNew);
    });

    planExercises = sortPlanExercises(planExercises, focus);
    planExercises = trimToTimeBudget(planExercises, input.durationMin, goal, budget.compoundOnly);
    planExercises = sortPlanExercises(planExercises, focus);
    if (tradeoff !== 'default') {
      planExercises = applyTimeTradeoff(planExercises, tradeoff, goal, input.durationMin);
      planExercises = sortPlanExercises(planExercises, focus);
    }

    planExercises = planExercises.map((ex, index) => {
      const record = rawRecords.find((r) => r.name === ex.name);
      return {
        ...ex,
        sessionReason: record
          ? buildSessionReason(record, goal, focus, planExercises, index)
          : ex.sessionReason,
      };
    });

    const {
      calculatedDurationMin,
      calculatedDurationMinLow,
      calculatedDurationMinHigh,
      timeBreakdown,
    } = recalculateDayExercises(planExercises, 'default', goal, input.durationMin);

    const type = focusToType(focus);
    const cardioFinisher =
      goal === 'fat_loss' && planExercises.length > 0
        ? '10–15 min cardio finisher: battle ropes, jump rope, or incline walk to keep heart rate elevated.'
        : undefined;

    return {
      day,
      focus,
      estimatedDurationMin: calculatedDurationMin || input.durationMin,
      calculatedDurationMin,
      calculatedDurationMinLow,
      calculatedDurationMinHigh,
      estimatedCaloriesBurned: estimateCalorieBurn(type, ctx.weightKg, calculatedDurationMin || input.durationMin),
      exercises: planExercises,
      sessionOverview: buildSessionOverview(focus, goal, planExercises, input.daysPerWeek, slot),
      timeBreakdown,
      cardioFinisher,
      timeTradeoff: tradeoff,
      showTimeTradeoffBanner: input.durationMin < 45,
      rotationNotice: rotatedGroups.size > 0
        ? 'Your exercises updated this week to keep your muscles adapting.'
        : undefined,
    };
  });

  const goalName = goalLabel(goal);
  return {
    planName: `${input.daysPerWeek}-Day Smart ${capitalize(goalName)} Plan`,
    weeklySchedule: schedule,
    nutritionNotes:
      `Your target of ${ctx.calories} kcal/day with ${ctx.protein}g protein supports this ${goalName} plan. ` +
      `Prioritize protein around training sessions for recovery and adaptation.`,
    progressionTips:
      goal === 'muscle_gain'
        ? 'Add weight or reps when you hit the top of each rep range for two sessions in a row. Deload every 6–8 weeks.'
        : goal === 'fat_loss'
          ? 'Focus on maintaining load while shortening rest. Track energy and sleep — recovery drives fat loss.'
          : 'Rotate through exercises every two weeks and progress load gradually as form stays crisp.',
  };
}

export function buildSmartContext(profile: {
  goal: Goal;
  targets: { age: number };
  biologicalSex: string;
  weightKg: number;
}, gen: Omit<SmartPlannerContext, 'trainingGoal'>): SmartPlannerContext {
  return {
    ...gen,
    trainingGoal: profileGoalToTrainingGoal(profile.goal),
  };
}
