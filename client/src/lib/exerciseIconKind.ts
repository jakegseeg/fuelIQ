import type { PlanExercise } from '../lib/workoutTypes';

export type ExerciseIconKind = 'strength' | 'cardio' | 'core';

export function exerciseIconKind(exercise: PlanExercise): ExerciseIconKind {
  const group = exercise.rotationGroup ?? '';
  const pattern = exercise.movementPattern ?? '';
  const name = exercise.name.toLowerCase();

  if (
    group.startsWith('core-') ||
    /plank|crunch|dead bug|deadbug|rollout|pallof|russian twist|leg raise/i.test(name)
  ) {
    return 'core';
  }
  if (
    group.startsWith('conditioning-') ||
    /cardio|jump rope|burpee|battle rope|box jump|sled push|run|bike|row machine/i.test(name) ||
    (pattern === 'carry' && /battle|rope|jump|burpee|sled|box/i.test(name))
  ) {
    return 'cardio';
  }
  return 'strength';
}
