import type { CustomSplitConfig } from '../domain/customSplit.js';
import type { Equipment, FitnessLevel, WorkoutPlan } from '../domain/workout.js';
import { advanceRotationsIfDue } from '../db/exerciseRotationsRepo.js';
import { getAllExercises } from './exercisePool.js';
import {
  buildDayFromMuscleGroups,
  goalLabel,
  type SmartPlannerContext,
} from './smartWorkoutPlanner.js';

export function generateCustomSplitPlan(
  userId: string,
  ctx: SmartPlannerContext,
  config: CustomSplitConfig,
  equipment: Equipment[],
  fitnessLevel: FitnessLevel,
  limitations: string,
): WorkoutPlan {
  const goal = ctx.trainingGoal;
  const allGroups = getAllExercises()
    .filter((e) => e.smartData)
    .map((e) => e.smartData!.rotationGroup);
  const rotatedGroups = advanceRotationsIfDue(userId, [...new Set(allGroups)]);

  const trainingDays = config.days.filter((d) => !d.rest && d.muscleGroups.length > 0);
  const daysPerWeek = trainingDays.length;
  let trainingSlot = 0;

  const weeklySchedule = config.days.map((dayConfig) => {
    if (dayConfig.rest || dayConfig.muscleGroups.length === 0) {
      return {
        day: dayConfig.day,
        focus: 'Rest',
        estimatedDurationMin: 0,
        estimatedCaloriesBurned: 0,
        exercises: [],
      };
    }

    const durationMin = dayConfig.durationMin ?? config.defaultDurationMin;
    const dayPlan = buildDayFromMuscleGroups(
      userId,
      dayConfig.day,
      dayConfig.muscleGroups,
      goal,
      ctx,
      equipment,
      fitnessLevel,
      limitations,
      durationMin,
      rotatedGroups,
      daysPerWeek,
      trainingSlot,
    );
    trainingSlot += 1;
    return dayPlan;
  });

  const goalName = goalLabel(goal);
  return {
    planName: 'My Custom Split',
    weeklySchedule,
    nutritionNotes:
      `Your target of ${ctx.calories} kcal/day with ${ctx.protein}g protein supports this custom ${goalName} split. ` +
      `Prioritize protein around training sessions for recovery and adaptation.`,
    progressionTips:
      goal === 'muscle_gain'
        ? 'Add weight or reps when you hit the top of each rep range for two sessions in a row. Regenerate exercises every 2 weeks to keep progress moving.'
        : goal === 'fat_loss'
          ? 'Focus on maintaining load while shortening rest. Regenerate exercises every 2 weeks for fresh stimulus.'
          : 'Rotate through exercises every two weeks and progress load gradually as form stays crisp.',
  };
}
