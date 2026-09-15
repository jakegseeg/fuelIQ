import type { PlanExercise } from './workoutTypes';

export type ExerciseDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface ExerciseAlternative {
  name: string;
  difficulty: ExerciseDifficulty;
  blurb: string;
}

const DICTIONARY: Record<string, ExerciseAlternative[]> = {
  'pull up': [
    { name: 'Lat Pulldown', difficulty: 'Beginner', blurb: 'Machine-based; easier to scale weight' },
    { name: 'Assisted Pull-up', difficulty: 'Beginner', blurb: 'Counterbalance helps you learn the pattern' },
    { name: 'Band Pull-down', difficulty: 'Beginner', blurb: 'Light resistance; good for home setups' },
  ],
  'push up': [
    { name: 'Knee Push-up', difficulty: 'Beginner', blurb: 'Less load on chest and core' },
    { name: 'Incline Push-up', difficulty: 'Beginner', blurb: 'Hands elevated; easier on shoulders' },
    { name: 'Chest Press Machine', difficulty: 'Intermediate', blurb: 'Stable path; easy to add weight' },
  ],
  'bench press': [
    { name: 'Dumbbell Press', difficulty: 'Intermediate', blurb: 'Independent arms; easier on shoulders' },
    { name: 'Push-up', difficulty: 'Beginner', blurb: 'No equipment needed' },
    { name: 'Cable Fly', difficulty: 'Intermediate', blurb: 'Constant tension on chest' },
  ],
  'barbell bench press': [
    { name: 'Dumbbell Press', difficulty: 'Intermediate', blurb: 'Independent arms; easier on shoulders' },
    { name: 'Push-up', difficulty: 'Beginner', blurb: 'No equipment needed' },
    { name: 'Cable Fly', difficulty: 'Intermediate', blurb: 'Machine-based alternative' },
  ],
  deadlift: [
    { name: 'Romanian Deadlift', difficulty: 'Intermediate', blurb: 'Less spinal load; hammers hamstrings' },
    { name: 'Trap Bar Deadlift', difficulty: 'Intermediate', blurb: 'Easier on lower back' },
    { name: 'Kettlebell Deadlift', difficulty: 'Beginner', blurb: 'Lighter load; great for learning the hinge' },
  ],
  'back squat': [
    { name: 'Goblet Squat', difficulty: 'Beginner', blurb: 'Front-loaded; easier to learn depth' },
    { name: 'Leg Press', difficulty: 'Beginner', blurb: 'Machine-based; easier on joints' },
    { name: 'Box Squat', difficulty: 'Intermediate', blurb: 'Depth guide; reduces knee stress' },
  ],
  'overhead press': [
    { name: 'Dumbbell Shoulder Press', difficulty: 'Intermediate', blurb: 'Natural shoulder path' },
    { name: 'Arnold Press', difficulty: 'Intermediate', blurb: 'Rotating grip; hits all delt heads' },
    { name: 'Machine Shoulder Press', difficulty: 'Beginner', blurb: 'Fixed path; easy to control' },
  ],
  'barbell row': [
    { name: 'Dumbbell Row', difficulty: 'Intermediate', blurb: 'Single-arm; easier on lower back' },
    { name: 'Seated Cable Row', difficulty: 'Beginner', blurb: 'Supported torso; steady tension' },
    { name: 'Machine Row', difficulty: 'Beginner', blurb: 'Chest-supported; beginner-friendly' },
  ],
  dip: [
    { name: 'Bench Dip', difficulty: 'Beginner', blurb: 'Feet on floor; less bodyweight load' },
    { name: 'Tricep Pushdown', difficulty: 'Beginner', blurb: 'Cable isolation; easy on shoulders' },
    { name: 'Close-Grip Bench Press', difficulty: 'Intermediate', blurb: 'Compound triceps + chest' },
  ],
  'hip thrust': [
    { name: 'Glute Bridge', difficulty: 'Beginner', blurb: 'Floor-based; no bar needed' },
    { name: 'Cable Kickback', difficulty: 'Beginner', blurb: 'Isolation; light equipment' },
    { name: 'Donkey Kick', difficulty: 'Beginner', blurb: 'Bodyweight glute activation' },
  ],
  'leg press': [
    { name: 'Goblet Squat', difficulty: 'Intermediate', blurb: 'Free-weight squat pattern' },
    { name: 'Wall Sit', difficulty: 'Beginner', blurb: 'Isometric; no equipment needed' },
    { name: 'Step-up', difficulty: 'Beginner', blurb: 'Unilateral; functional leg strength' },
  ],
};

const ALIASES: Record<string, string> = {
  pullup: 'pull up',
  'pull-ups': 'pull up',
  pullups: 'pull up',
  'chin up': 'pull up',
  'chin-up': 'pull up',
  pushup: 'push up',
  'push-ups': 'push up',
  pushups: 'push up',
  'flat bench press': 'bench press',
  squat: 'back squat',
  'barbell squat': 'back squat',
  ohp: 'overhead press',
  'military press': 'overhead press',
  'shoulder press': 'overhead press',
  'bent over row': 'barbell row',
  'bent-over row': 'barbell row',
  'parallel bar dips': 'dip',
  'chest dips': 'dip',
  'barbell hip thrust': 'hip thrust',
  'romanian deadlift': 'deadlift',
  rdl: 'deadlift',
};

const MUSCLE_FALLBACKS: Record<string, ExerciseAlternative[]> = {
  chest: [
    { name: 'Push-up', difficulty: 'Beginner', blurb: 'No equipment needed' },
    { name: 'Dumbbell Press', difficulty: 'Intermediate', blurb: 'Scalable free-weight option' },
    { name: 'Chest Press Machine', difficulty: 'Beginner', blurb: 'Stable machine path' },
  ],
  back: [
    { name: 'Seated Cable Row', difficulty: 'Beginner', blurb: 'Supported rowing pattern' },
    { name: 'Lat Pulldown', difficulty: 'Beginner', blurb: 'Machine-based pull' },
    { name: 'Dumbbell Row', difficulty: 'Intermediate', blurb: 'Single-arm control' },
  ],
  lats: [
    { name: 'Lat Pulldown', difficulty: 'Beginner', blurb: 'Easier than pull-ups' },
    { name: 'Single-Arm Cable Pulldown', difficulty: 'Intermediate', blurb: 'Unilateral lat focus' },
    { name: 'Straight-Arm Pulldown', difficulty: 'Beginner', blurb: 'Isolation with cable' },
  ],
  shoulders: [
    { name: 'Dumbbell Shoulder Press', difficulty: 'Intermediate', blurb: 'Natural pressing path' },
    { name: 'Lateral Raise', difficulty: 'Beginner', blurb: 'Light isolation for side delts' },
    { name: 'Machine Shoulder Press', difficulty: 'Beginner', blurb: 'Guided pressing movement' },
  ],
  triceps: [
    { name: 'Tricep Pushdown', difficulty: 'Beginner', blurb: 'Cable isolation' },
    { name: 'Overhead Tricep Extension', difficulty: 'Beginner', blurb: 'Stretches long head' },
    { name: 'Close-Grip Push-up', difficulty: 'Intermediate', blurb: 'Bodyweight triceps emphasis' },
  ],
  biceps: [
    { name: 'Dumbbell Curl', difficulty: 'Beginner', blurb: 'Simple and effective' },
    { name: 'Hammer Curl', difficulty: 'Beginner', blurb: 'Neutral grip; forearm friendly' },
    { name: 'Cable Curl', difficulty: 'Beginner', blurb: 'Constant tension' },
  ],
  quads: [
    { name: 'Goblet Squat', difficulty: 'Beginner', blurb: 'Easy to learn squat pattern' },
    { name: 'Leg Press', difficulty: 'Beginner', blurb: 'Machine-based; joint-friendly' },
    { name: 'Step-up', difficulty: 'Beginner', blurb: 'Unilateral leg strength' },
  ],
  glutes: [
    { name: 'Glute Bridge', difficulty: 'Beginner', blurb: 'Floor-based activation' },
    { name: 'Hip Thrust', difficulty: 'Intermediate', blurb: 'Heavy glute loading' },
    { name: 'Cable Kickback', difficulty: 'Beginner', blurb: 'Isolation with cable' },
  ],
  hamstrings: [
    { name: 'Romanian Deadlift', difficulty: 'Intermediate', blurb: 'Hinge pattern for hamstrings' },
    { name: 'Leg Curl', difficulty: 'Beginner', blurb: 'Machine isolation' },
    { name: 'Good Morning', difficulty: 'Advanced', blurb: 'Hip hinge with bar' },
  ],
  calves: [
    { name: 'Standing Calf Raise', difficulty: 'Beginner', blurb: 'Simple bodyweight or machine' },
    { name: 'Seated Calf Raise', difficulty: 'Beginner', blurb: 'Targets soleus' },
    { name: 'Jump Rope', difficulty: 'Beginner', blurb: 'Dynamic calf endurance' },
  ],
  core: [
    { name: 'Plank', difficulty: 'Beginner', blurb: 'Isometric full-core brace' },
    { name: 'Dead Bug', difficulty: 'Beginner', blurb: 'Low-back friendly anti-extension' },
    { name: 'Cable Crunch', difficulty: 'Intermediate', blurb: 'Weighted flexion' },
  ],
  'full body': [
    { name: 'Goblet Squat', difficulty: 'Beginner', blurb: 'Total-body strength pattern' },
    { name: 'Kettlebell Swing', difficulty: 'Intermediate', blurb: 'Power and conditioning' },
    { name: 'Burpee', difficulty: 'Intermediate', blurb: 'No equipment cardio-strength' },
  ],
};

const DIFFICULTY_STYLE: Record<ExerciseDifficulty, string> = {
  Beginner: 'bg-accent-50 text-accent-600 ring-accent-400/30',
  Intermediate: 'bg-amber-100 text-amber-500 ring-amber-400/30',
  Advanced: 'bg-coral-100 text-error ring-coral-400/30',
};

export function difficultyClass(d: ExerciseDifficulty): string {
  return DIFFICULTY_STYLE[d];
}

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveKey(normalized: string): string | null {
  if (DICTIONARY[normalized]) return normalized;
  if (ALIASES[normalized]) return ALIASES[normalized];
  for (const [alias, key] of Object.entries(ALIASES)) {
    if (normalized.includes(alias)) return key;
  }
  for (const key of Object.keys(DICTIONARY)) {
    if (normalized.includes(key) || key.includes(normalized)) return key;
  }
  return null;
}

function muscleKey(groups: string[]): string | null {
  for (const g of groups) {
    const k = normalize(g);
    if (MUSCLE_FALLBACKS[k]) return k;
    if (k.includes('lat')) return 'lats';
    if (k.includes('quad') || k.includes('leg')) return 'quads';
    if (k.includes('glute')) return 'glutes';
    if (k.includes('hamstring')) return 'hamstrings';
    if (k.includes('chest') || k.includes('pec')) return 'chest';
    if (k.includes('shoulder') || k.includes('delt')) return 'shoulders';
    if (k.includes('tricep')) return 'triceps';
    if (k.includes('bicep')) return 'biceps';
    if (k.includes('back')) return 'back';
    if (k.includes('core') || k.includes('ab')) return 'core';
    if (k.includes('calf')) return 'calves';
    if (k.includes('full')) return 'full body';
  }
  return groups.length ? 'full body' : null;
}

/** Up to 3 alternatives, excluding the current exercise name. */
export function getExerciseAlternatives(
  exerciseName: string,
  muscleGroups: string[],
): ExerciseAlternative[] {
  const normalized = normalize(exerciseName);
  const key = resolveKey(normalized);
  const pool = key
    ? DICTIONARY[key]
    : muscleKey(muscleGroups)
      ? MUSCLE_FALLBACKS[muscleKey(muscleGroups)!]
      : MUSCLE_FALLBACKS['full body'];

  return pool
    .filter((a) => normalize(a.name) !== normalized)
    .slice(0, 3);
}

export function applyAlternative(
  original: PlanExercise,
  alt: ExerciseAlternative,
): PlanExercise {
  return {
    ...original,
    name: alt.name,
    notes: alt.blurb,
  };
}
