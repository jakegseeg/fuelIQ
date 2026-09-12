import type { ExerciseRecord } from './exerciseTypes.js';
import { normalizeExerciseName } from './exerciseSmartData.js';

const L = {
  chestMid: 'Mid chest (Pectoralis major)',
  chestUpper: 'Upper chest (Pectoralis major, clavicular head)',
  upperBackWidth: 'Upper back width (Latissimus dorsi)',
  upperBackThickness: 'Upper back thickness (Latissimus dorsi + Rhomboids)',
  rearShoulder: 'Rear shoulder (Posterior deltoid)',
  sideShoulder: 'Side shoulder (Medial deltoid)',
  frontShoulder: 'Front shoulder (Anterior deltoid)',
  outerHamstrings: 'Outer hamstrings (Biceps femoris)',
  glutes: 'Glutes (Gluteus maximus)',
  quads: 'Quads (Quadriceps)',
  outerQuads: 'Outer quads (Vastus lateralis)',
  innerQuads: 'Inner quads (Vastus medialis)',
  upperCalves: 'Upper calves (Gastrocnemius)',
  lowerCalves: 'Lower calves (Soleus)',
  bicepPeak: 'Bicep peak (Biceps brachii, long head)',
  bicepThickness: 'Bicep thickness (Brachialis)',
  forearmGrip: 'Forearm and grip (Brachioradialis)',
  tricepMass: 'Tricep mass (Long head of triceps)',
  tricepDefinition: 'Tricep definition (Lateral head of triceps)',
  coreStability: 'Core stability (Transverse abdominis)',
  coreStrength: 'Core strength (Rectus abdominis)',
  traps: 'Traps (Trapezius)',
  rotatorCuff: 'Rotator cuff + Rear shoulder (Posterior deltoid + External rotators)',
} as const;

/** Specific muscle targeting labels for exercise cards. */
const BY_ROTATION_GROUP: Record<string, string> = {
  'chest-isolation-mid': L.chestMid,
  'horizontal-push-heavy': L.chestMid,
  'horizontal-push-bodyweight': L.chestMid,
  'lower-chest': 'Lower chest (Pectoralis major)',
  'upper-chest-compound': L.chestUpper,
  'vertical-pull-bodyweight': L.upperBackWidth,
  'vertical-pull-machine': L.upperBackWidth,
  'vertical-pull-supinated': L.upperBackWidth,
  'lat-isolation': L.upperBackWidth,
  'horizontal-pull-heavy': L.upperBackThickness,
  'horizontal-pull-cable': L.upperBackThickness,
  'hamstring-dominant-hinge': L.outerHamstrings,
  'hamstring-isolation': L.outerHamstrings,
  'glute-dominant': L.glutes,
  'posterior-chain-heavy': L.glutes,
  'medial-delt-isolation': L.sideShoulder,
  'anterior-delt-isolation': L.frontShoulder,
  'rear-delt-isolation': L.rearShoulder,
  'vertical-push-heavy': L.frontShoulder,
  'quad-dominant-heavy': L.quads,
  'quad-dominant-machine': L.outerQuads,
  'quad-isolation': L.innerQuads,
  'inner-quad-glute': L.innerQuads,
  'quad-unilateral': L.quads,
  'calf-isolation': L.upperCalves,
  'bicep-compound': L.bicepPeak,
  'bicep-stretch-isolation': L.bicepPeak,
  'bicep-peak-isolation': L.bicepPeak,
  'brachialis-isolation': L.bicepThickness,
  'tricep-compound': L.tricepMass,
  'tricep-isolation': L.tricepDefinition,
  'trap-isolation': L.traps,
  'core-stability': L.coreStability,
  'core-flexion': L.coreStrength,
  'core-rotation': 'Side abs (Obliques)',
  'core-anti-rotation': L.coreStability,
};

const BY_NAME: Record<string, string> = {
  'bench press': L.chestMid,
  'incline bench press barbell': L.chestUpper,
  'incline bench press dumbbell': L.chestUpper,
  'fly with cable': L.chestMid,
  'bent over cable flye': L.chestMid,
  'pull ups': L.upperBackWidth,
  'pull up': L.upperBackWidth,
  'barbell row underhand': L.upperBackThickness,
  'barbell row overhand': L.upperBackThickness,
  'barbell romanian deadlift rdl': L.outerHamstrings,
  'romanian deadlift': L.outerHamstrings,
  'hip thrust': L.glutes,
  'leg curl': L.outerHamstrings,
  'lateral raise': L.sideShoulder,
  '45 lateral raises': L.sideShoulder,
  'face pull': L.rotatorCuff,
  'dumbbell bent over face pull': L.rotatorCuff,
  'overhead press': L.frontShoulder,
  'barbell full squat': L.quads,
  'front squats': L.quads,
  'leg press': L.outerQuads,
  'standing calf raises': L.upperCalves,
  'seated dumbbell calf raise': L.lowerCalves,
  'seated calf raise': L.lowerCalves,
  'biceps curls with barbell': L.bicepPeak,
  'hammer curls': L.bicepThickness,
  'triceps pushdown': L.tricepDefinition,
  'skullcrusher sz bar': L.tricepMass,
  'floor skull crusher': L.tricepMass,
  'skullcrusher dumbbells': L.tricepMass,
};

const WGER_TO_COMMON: Record<string, string> = {
  chest: 'Chest',
  pectoralis: 'Chest',
  lats: 'Upper back',
  latissimus: 'Upper back',
  back: 'Upper back',
  glutes: 'Glutes',
  gluteus: 'Glutes',
  quads: 'Quads',
  quadriceps: 'Quads',
  hamstrings: 'Hamstrings',
  biceps: 'Biceps',
  triceps: 'Triceps',
  shoulders: 'Shoulders',
  deltoids: 'Shoulders',
  deltoid: 'Shoulders',
  traps: 'Traps',
  trapezius: 'Traps',
  calves: 'Calves',
  gastrocnemius: 'Calves',
  soleus: 'Calves',
  abs: 'Abs',
  abdominals: 'Abs',
  obliques: 'Side abs',
  forearms: 'Forearms',
  brachialis: 'Biceps',
  rhomboids: 'Upper back',
};

function formatScientificName(muscle: string): string {
  return muscle
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function toCommonMuscleName(wgerMuscle: string): string {
  const lower = wgerMuscle.toLowerCase();
  for (const [key, common] of Object.entries(WGER_TO_COMMON)) {
    if (lower.includes(key)) return common;
  }
  return formatScientificName(wgerMuscle);
}

function fallbackLabel(wgerMuscle: string): string {
  return `${toCommonMuscleName(wgerMuscle)} (${formatScientificName(wgerMuscle)})`;
}

function resolveByGroupAndName(name: string, group?: string): string | undefined {
  const normName = normalizeExerciseName(name);
  if (BY_NAME[normName]) return BY_NAME[normName];

  if (group === 'tricep-isolation') {
    if (/skull|crusher|lying|extension/i.test(name)) return L.tricepMass;
    return L.tricepDefinition;
  }
  if (group === 'calf-isolation') {
    if (/seated/i.test(name)) return L.lowerCalves;
    return L.upperCalves;
  }
  if (group === 'rear-delt-isolation') {
    if (/face pull/i.test(name)) return L.rotatorCuff;
    return L.rearShoulder;
  }
  if (group === 'brachialis-isolation') {
    if (/hammer/i.test(name)) return L.bicepThickness;
    return L.forearmGrip;
  }
  if (group === 'upper-chest-compound' || /incline/i.test(name)) return L.chestUpper;
  if (group === 'horizontal-push-heavy' || /bench press/i.test(name)) return L.chestMid;

  if (group && BY_ROTATION_GROUP[group]) return BY_ROTATION_GROUP[group];
  return undefined;
}

export function resolveMuscleTargetLabel(record: ExerciseRecord): string {
  const fromLookup = resolveByGroupAndName(record.name, record.smartData?.rotationGroup);
  if (fromLookup) return fromLookup;

  const primary = record.smartData?.musclesFocused.primary[0] ?? record.primaryMuscles[0];
  if (primary) return fallbackLabel(primary);
  return fallbackLabel('general');
}
