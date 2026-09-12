export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type TrainingGoal = 'muscle_gain' | 'fat_loss' | 'endurance' | 'maintain' | 'recomp';

export interface RepRangeByGoal {
  sets: number;
  reps: string;
  rest: number;
}

export interface ExerciseSmartData {
  wgerName: string;
  movementPattern: string;
  workoutSplit: string[];
  musclesFocused: {
    primary: string[];
    secondary: string[];
  };
  hypertrophyRating: number;
  fatLossRating: number;
  enduranceRating: number;
  timeRequired: number;
  difficulty: ExerciseDifficulty;
  jointFriendly: boolean;
  uniqueMuscleContribution: string;
  goalExplanation: Record<TrainingGoal, string>;
  repRangeByGoal: Record<TrainingGoal, RepRangeByGoal>;
  rotationGroup: string;
}

export interface CachedExercise {
  id: number;
  wgerId: number;
  name: string;
  description: string;
  categoryName: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  cachedAt: string;
}

export interface ExerciseRecord extends CachedExercise {
  smartData: ExerciseSmartData | null;
}
