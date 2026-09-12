/**
 * Coach — personality-driven rule-based coach (Ernie Tagliaboo energy).
 * Pulls real logs; speaks in third person as "Coach."
 */
import type { Profile, Goal } from '../domain/types.js';
import { getProfile } from '../db/profileRepo.js';
import { dailyNutrition, type DailyNutrition } from '../db/progressRepo.js';
import { listEntriesForDate } from '../db/logRepo.js';
import { dailyWaterTotals } from '../db/waterRepo.js';
import { getActivePlan, listLogs } from '../db/workoutRepo.js';
import type { WorkoutPlanRecord } from '../domain/workout.js';
import { addDaysISO, daysBetween, lastNDates, todayISO } from '../domain/dates.js';
import { db } from '../db/index.js';

export interface CoachSnapshot {
  profile: Profile | null;
  today: string;
  weekStart: string;
  last7: string[];
  nutritionByDate: Map<string, DailyNutrition>;
  waterByDate: Map<string, number>;
  workoutLogs: ReturnType<typeof listLogs>;
  activePlan: WorkoutPlanRecord | null;
  bestFoods: { name: string; avgFuel: number; count: number }[];
  todayEntries: number;
  todayTotals: { calories: number; protein: number; carbs: number; fat: number };
}

const GOAL_LABELS: Record<Goal, string> = {
  lose_fat: 'fat loss',
  maintain: 'maintenance',
  build_muscle: 'muscle gain',
  endurance: 'endurance',
  recomp: 'body recomposition',
};

const PROTEIN_FIXES = [
  'eggs or Greek yogurt',
  'chicken breast or a protein shake',
  'cottage cheese — Coach said cottage cheese',
  'salmon or lentils like a CHAMPION',
];

const MEAL_IDEAS: { name: string; protein: number; calories: number }[] = [
  { name: 'Grilled chicken + roasted vegetables', protein: 35, calories: 420 },
  { name: 'Salmon bowl with rice and greens', protein: 32, calories: 480 },
  { name: 'Turkey chili with beans', protein: 28, calories: 380 },
  { name: 'Greek yogurt parfait with berries', protein: 20, calories: 320 },
  { name: 'Egg scramble with spinach and toast', protein: 24, calories: 350 },
];

export function loadCoachSnapshot(userId: string): CoachSnapshot {
  const today = todayISO();
  const weekStart = addDaysISO(today, -6);
  const last7 = lastNDates(7, today);

  const nutritionRows = dailyNutrition(userId, weekStart);
  const nutritionByDate = new Map(nutritionRows.map((d) => [d.date, d]));

  const waterRows = dailyWaterTotals(userId, weekStart);
  const waterByDate = new Map(waterRows.map((w) => [w.date, w.totalOz]));

  const todayRows = listEntriesForDate(userId, today);
  const todayTotals = todayRows.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const bestFoods = db.all<{ name: string; avgFuel: number; count: number }>(
    `SELECT name,
            ROUND(AVG(fuel_score) * 10) / 10 AS avgFuel,
            COUNT(*) AS count
       FROM food_log_entries
      WHERE user_id = ? AND log_date >= ? AND fuel_score IS NOT NULL
      GROUP BY name
      HAVING count >= 1
      ORDER BY avgFuel DESC, count DESC
      LIMIT 5`,
    [userId, weekStart],
  );

  return {
    profile: getProfile(userId),
    today,
    weekStart,
    last7,
    nutritionByDate,
    waterByDate,
    workoutLogs: listLogs(userId, 30),
    activePlan: getActivePlan(userId),
    bestFoods,
    todayEntries: todayRows.length,
    todayTotals: {
      calories: Math.round(todayTotals.calories),
      protein: Math.round(todayTotals.protein * 10) / 10,
      carbs: Math.round(todayTotals.carbs * 10) / 10,
      fat: Math.round(todayTotals.fat * 10) / 10,
    },
  };
}

function weekdayName(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

function pick<T>(arr: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

function loggedDays(snapshot: CoachSnapshot): DailyNutrition[] {
  return snapshot.last7
    .map((d) => snapshot.nutritionByDate.get(d))
    .filter((d): d is DailyNutrition => !!d && d.entries > 0);
}

function proteinUnderDays(snapshot: CoachSnapshot, target: number): number {
  if (target <= 0) return 0;
  return snapshot.last7.filter((date) => {
    const day = snapshot.nutritionByDate.get(date);
    return day && day.entries > 0 && day.protein < target * 0.85;
  }).length;
}

function calorieHitDays(snapshot: CoachSnapshot, target: number): number {
  if (target <= 0) return 0;
  return snapshot.last7.filter((date) => {
    const day = snapshot.nutritionByDate.get(date);
    return day && day.entries > 0 && Math.abs(day.calories - target) <= target * 0.12;
  }).length;
}

function avgFuelScore(snapshot: CoachSnapshot): number | null {
  const days = loggedDays(snapshot);
  if (!days.length) return null;
  return Math.round((days.reduce((s, d) => s + d.avgFuel, 0) / days.length) * 10) / 10;
}

function todayPlanFocus(snapshot: CoachSnapshot): string | null {
  if (!snapshot.activePlan) return null;
  const name = weekdayName(snapshot.today);
  const day = snapshot.activePlan.plan.weeklySchedule.find(
    (d) => d.day.toLowerCase() === name.toLowerCase(),
  );
  if (!day || day.exercises.length === 0) return null;
  return day.focus;
}

function workoutCompletedToday(snapshot: CoachSnapshot): boolean {
  return snapshot.workoutLogs.some((l) => l.date === snapshot.today);
}

function workoutScheduledToday(snapshot: CoachSnapshot): boolean {
  return todayPlanFocus(snapshot) != null;
}

function workoutMissedToday(snapshot: CoachSnapshot): boolean {
  return workoutScheduledToday(snapshot) && !workoutCompletedToday(snapshot);
}

function proteinUnderToday(snapshot: CoachSnapshot): boolean {
  const target = snapshot.profile?.targets.macros.proteinG ?? 0;
  if (target <= 0 || snapshot.todayEntries === 0) return false;
  return snapshot.todayTotals.protein < target * 0.85;
}

function caloriesOverToday(snapshot: CoachSnapshot): boolean {
  const target = snapshot.profile?.targets.calorieTarget ?? 0;
  if (target <= 0 || snapshot.todayEntries === 0) return false;
  return snapshot.todayTotals.calories > target * 1.1;
}

function macrosOnTrackToday(snapshot: CoachSnapshot): boolean {
  const t = snapshot.profile?.targets;
  if (!t || snapshot.todayEntries === 0) return false;
  const calOk = Math.abs(snapshot.todayTotals.calories - t.calorieTarget) <= t.calorieTarget * 0.12;
  const protOk = snapshot.todayTotals.protein >= t.macros.proteinG * 0.9;
  return calOk && protOk;
}

function noFoodLoggedToday(snapshot: CoachSnapshot): boolean {
  return snapshot.todayEntries === 0;
}

function name(snap: CoachSnapshot): string {
  return snap.profile?.firstName ?? 'champ';
}

/** Coach-voice insight bullets for the home panel. */
export function generateCoachInsights(userId: string): string[] {
  const snap = loadCoachSnapshot(userId);
  const insights: string[] = [];
  const seed = userId + snap.today;

  if (!snap.profile) {
    return [
      'Coach cannot coach a ghost. Finish onboarding so Coach can read your targets and yell at you **properly**.',
      'Once your profile exists, Coach will track protein, calories, workouts, and FuelScore. Coach takes this personally.',
    ];
  }

  const { targets, firstName } = snap.profile;
  const fuel = avgFuelScore(snap);
  const hitCal = calorieHitDays(snap, targets.calorieTarget);
  const underProt = proteinUnderDays(snap, targets.macros.proteinG);

  if (workoutCompletedToday(snap)) {
    insights.push(
      pick(
        [
          `**${firstName}** DESTROYED a session today. Coach saw it. Coach is so proud Coach wants to punch a wall. **FIRED UP!**`,
          `Coach is NOT okay — because what you did in the gym today was **TOO good**. Too. Good.`,
        ],
        seed + 'wc',
      ),
    );
  } else if (workoutMissedToday(snap)) {
    const focus = todayPlanFocus(snap);
    insights.push(
      pick(
        [
          `Are you KIDDING Coach right now? **${focus}** was on the schedule TODAY. Coach did NOT wake up at 4AM for couch time.`,
          `You're soft. Like a wet paper towel. Coach has **${focus}** programmed. **GET UP.**`,
        ],
        seed + 'wm',
      ),
    );
  }

  if (noFoodLoggedToday(snap)) {
    insights.push(
      'You have not logged **anything** today. NOTHING. Coach does not work with ghosts. **Log your food.**',
    );
  } else if (macrosOnTrackToday(snap)) {
    insights.push(
      pick(
        [
          `**${snap.todayTotals.calories} kcal** and **${snap.todayTotals.protein}g protein** today? SHUT IT DOWN! Coach is **FIRED UP!**`,
          `That's what Coach is talking about, **${firstName}**! Champions eat like **YOU** just did.`,
        ],
        seed + 'mt',
      ),
    );
  } else if (proteinUnderToday(snap)) {
    const gap = Math.round(targets.macros.proteinG - snap.todayTotals.protein);
    insights.push(
      pick(
        [
          `**${snap.todayTotals.protein}g protein** today and Coach's target is **${targets.macros.proteinG}g**. Coach is taking that **personally**. Deeply personally. Fix **${gap}g**.`,
          `Sweat is just your fat crying — but muscles need **PROTEIN** to cry properly. You're **${gap}g** short today. Eat something.`,
        ],
        seed + 'pu',
      ),
    );
  } else if (caloriesOverToday(snap)) {
    const over = snap.todayTotals.calories - targets.calorieTarget;
    insights.push(
      pick(
        [
          `Okay. Okay. Coach is not mad. Coach is just... disappointed. And a little mad. **${over} kcal** over target today.`,
          `We don't quit. We **recalibrate**. **FIRED UP.** Tomorrow Coach wants tighter logging — you hit **${snap.todayTotals.calories}** vs **${targets.calorieTarget}** today.`,
        ],
        seed + 'co',
      ),
    );
  }

  if (fuel != null && fuel >= 7.5) {
    insights.push(
      `Your FuelScore average is **${fuel}**. **ELITE.** Coach didn't even know you had this in you. Honestly offensive that you were hiding it.`,
    );
  } else if (fuel != null && fuel < 6.5 && loggedDays(snap).length >= 2) {
    insights.push(
      `FuelScore sitting at **${fuel}** this week. Coach believes in you — swap ONE processed snack for whole food. One. That's Coach's ask.`,
    );
  }

  if (hitCal >= 4 && !macrosOnTrackToday(snap)) {
    insights.push(
      `**${hitCal} days** you nailed calories this week. Coach sees the discipline. Keep that fire.`,
    );
  }

  if (underProt >= 3 && !proteinUnderToday(snap)) {
    insights.push(
      `Protein was low **${underProt} of 7 days** this week. Coach forgives — but Coach does not forget. Hit **${targets.macros.proteinG}g** daily.`,
    );
  }

  if (insights.length === 0) {
    insights.push(
      `Coach is watching your **${GOAL_LABELS[snap.profile.goal]}** goal. Log food. Log workouts. Coach will bring the intensity.`,
    );
  }

  return insights.slice(0, 5);
}

export function answerCoachQuestion(userId: string, question: string): string {
  const snap = loadCoachSnapshot(userId);
  const q = question.trim().toLowerCase();
  const seed = userId + question;

  if (!snap.profile) {
    return (
      'Coach cannot analyze what Coach cannot see. Finish onboarding first — then Coach will read your protein, calories, workouts, and FuelScore and **take it personally.**'
    );
  }

  if (/struggl|tired|exhaust|hard day|can't|cannot|overwhelm|stressed|depressed|give up|quit|failing|rough day|bad day/.test(q)) {
    return struggleReply(snap, seed);
  }

  if (/motivate|pep talk|fire me up|need energy|push me/.test(q)) {
    return motivateReply(snap, seed);
  }

  if (/missed.*workout|skipped.*workout|didn't.*workout|did not.*workout|i missed/.test(q)) {
    return workoutMissedReply(snap, seed);
  }

  if (/hit my goals|goals today|did i hit|on track today/.test(q)) {
    return goalsTodayReply(snap, seed);
  }

  if (/how am i doing|how'm i doing|how are we|how am i/.test(q)) {
    return howDoingReply(snap, seed);
  }

  if (/what should i eat|what to eat|eat today|dinner|lunch|breakfast|meal idea/.test(q)) {
    return mealReply(snap, q, seed);
  }

  if (workoutCompletedToday(snap) && /workout|train|gym|session|lift/.test(q)) {
    return workoutPraiseReply(snap, seed);
  }

  if (workoutMissedToday(snap) && /workout|train|gym|exercise/.test(q)) {
    return workoutMissedReply(snap, seed);
  }

  if (/protein/.test(q)) {
    return proteinReply(snap, seed);
  }

  if (/calorie|kcal|over ate|ate too much/.test(q)) {
    return calorieReply(snap, seed);
  }

  if (/fuelscore|fuel score|food quality|best food/.test(q)) {
    return fuelScoreReply(snap, seed);
  }

  if (/water|hydrat/.test(q)) {
    return waterReply(snap);
  }

  if (noFoodLoggedToday(snap)) {
    return noFoodReply(snap);
  }

  return howDoingReply(snap, seed);
}

function struggleReply(snap: CoachSnapshot, seed: string): string {
  const n = name(snap);
  const sensitive = pick(
    [
      `Hey. Hey, **${n}**. Coach hears you. That's real. Coach respects that — Coach has been there.`,
      `Listen. Coach sees the struggle. That matters. Coach is not blind to hard days.`,
    ],
    seed,
  );
  const snapBack = pick(
    [
      '\n\n...pause.\n\n**NOW GET OFF THE FLOOR AND LET\'S GO.** Coach did not build this program for quitting. One meal. One rep. **MOVE.**',
      '\n\nCoach cares too much to let you stay down. Breathe. Then **log your next meal** and do **one thing** today Coach can be proud of. **FIRED UP.**',
    ],
    seed + 'snap',
  );
  return sensitive + snapBack;
}

function motivateReply(snap: CoachSnapshot, seed: string): string {
  const n = name(snap);
  const { targets } = snap.profile!;
  const focus = todayPlanFocus(snap);

  if (workoutCompletedToday(snap)) {
    return pick(
      [
        `**${n}** — you ALREADY trained today and Coach is still screaming because that's how much Coach believes in you! **${snap.todayTotals.protein}g protein**, **${snap.todayTotals.calories} kcal** logged. Double down. **ELITE mindset.**`,
        `You worked out TODAY. Coach is pacing the room! Now finish the day like a champion — **${targets.macros.proteinG}g protein** is the target. Coach is **FIRED UP!**`,
      ],
      seed,
    );
  }

  if (workoutMissedToday(snap)) {
    return (
      `Coach is gonna motivate you with the TRUTH: **${focus}** is on the board and Coach has **NOT** seen a log. ` +
      pick(
        [
          `Coach woke up at 4AM for YOU. Get up. **FIRED UP.**`,
          `You think champions skip **${focus}** day? **NO.** Move.`,
        ],
        seed,
      )
    );
  }

  return pick(
    [
      `**${n}**. Coach sees **${targets.calorieTarget} kcal** and **${targets.macros.proteinG}g protein** on your board. Coach sees **${GOAL_LABELS[snap.profile!.goal]}** in your future. Now go **earn** it.`,
      `Coach didn't become Coach by being soft. Neither do you. Log food. Hit the gym. Coach is in your corner **yelling because Coach cares.** **FIRED UP!**`,
    ],
    seed,
  );
}

function workoutPraiseReply(snap: CoachSnapshot, seed: string): string {
  const n = name(snap);
  const todayLog = snap.workoutLogs.find((l) => l.date === snap.today);
  const detail = todayLog
    ? `**${todayLog.focus}** — **${todayLog.totalSets} sets**, **${todayLog.durationMin} min**, **${todayLog.caloriesBurned} kcal** burned.`
    : 'Coach saw the log. Coach saw the effort.';

  return pick(
    [
      `**YES!** **${n}**, you absolutely **DESTROYED** that session! ${detail} Coach is so proud Coach wants to punch a wall! **FIRED UP!**`,
      `Coach saw what you did today and Coach is **NOT okay** — because that was **TOO good**. Too. Good. ${detail}`,
    ],
    seed,
  );
}

function workoutMissedReply(snap: CoachSnapshot, seed: string): string {
  const focus = todayPlanFocus(snap) ?? 'training';
  const n = name(snap);

  if (workoutScheduledToday(snap) && !workoutCompletedToday(snap)) {
    return pick(
      [
        `Are you **KIDDING** Coach right now? **${focus}** was TODAY. Coach did **NOT** wake up at 4AM for you to sit on the couch, **${n}**!`,
        `You're soft. Like a wet paper towel. Coach had **${focus}** locked in for today. **GET UP.** Coach is taking this personally.`,
      ],
      seed,
    );
  }

  const since = snap.workoutLogs[0]
    ? daysBetween(snap.workoutLogs[0].date, snap.today)
    : null;

  return (
    pick(
      [
        `Coach hears you missed it. Coach is disappointed. Coach is also **not surprised** if you don't fix it tomorrow.`,
        `Skipped? Coach's heart is broken. Coach's voice is **louder** because Coach cares.`,
      ],
      seed,
    ) +
    (since != null && since > 0
      ? `\n\nLast log was **${since} day(s)** ago. Coach wants a session **ASAP.**`
      : '\n\nNo workouts in the log yet. Coach believes in you — **prove Coach right.**')
  );
}

function noFoodReply(snap: CoachSnapshot): string {
  const n = name(snap);
  return pick(
    [
      `You haven't logged **anything** today, **${n}**. **NOTHING.** Coach doesn't work with ghosts. **Log your food.**`,
      `Coach checked. Zero entries today. **ZERO.** Coach cannot coach air. Open the log and **feed Coach data.**`,
    ],
    snap.today + n,
  );
}

function goalsTodayReply(snap: CoachSnapshot, seed: string): string {
  const n = name(snap);
  const { targets } = snap.profile!;

  if (noFoodLoggedToday(snap)) {
    return noFoodReply(snap);
  }

  const { calories, protein } = snap.todayTotals;
  const calTarget = targets.calorieTarget;
  const protTarget = targets.macros.proteinG;
  const calHit = Math.abs(calories - calTarget) <= calTarget * 0.12;
  const protHit = protein >= protTarget * 0.9;
  const calOver = calories > calTarget * 1.1;
  const protLow = protein < protTarget * 0.85;

  if (calHit && protHit) {
    return pick(
      [
        `**${calories} kcal** and **${protein}g protein** today? You hit your macros? **SHUT IT DOWN!** Coach is **FIRED UP**, **${n}**!`,
        `That's what Coach is talking about! **${calories}/${calTarget} kcal**, **${protein}/${protTarget}g protein**. Champions eat like **YOU** just did.`,
      ],
      seed,
    );
  }

  const parts: string[] = [];
  if (!calHit) {
    parts.push(
      calOver
        ? `Calories: **${calories}** — **${calories - calTarget} over** target (**${calTarget}**). Coach is disappointed. A little mad.`
        : `Calories: **${calories}/${calTarget}** — not there yet. **${calTarget - calories} kcal** to go.`,
    );
  }
  if (!protHit) {
    parts.push(
      protLow
        ? `Protein: **${protein}g** — Coach is **personally offended**. Target is **${protTarget}g**. Eat **${PROTEIN_FIXES[0]}**.`
        : `Protein: **${protein}/${protTarget}g** — close. Coach wants you over the line.`,
    );
  }

  const header = calHit || protHit
    ? `Partial win today, **${n}**. Coach sees effort.`
    : `Coach looked at today. Coach has notes.`;

  return `${header}\n\n${parts.join('\n\n')}\n\nCoach doesn't quit. **Recalibrate. FIRED UP.**`;
}

function howDoingReply(snap: CoachSnapshot, seed: string): string {
  const n = name(snap);
  const { targets, goal } = snap.profile!;
  const fuel = avgFuelScore(snap);
  const hitCal = calorieHitDays(snap, targets.calorieTarget);
  const weekWorkouts = snap.workoutLogs.filter((l) => l.date >= snap.weekStart).length;

  if (workoutCompletedToday(snap)) {
    const open = workoutPraiseReply(snap, seed + 'open');
    const rest = `\n\n**Week check:** **${weekWorkouts}** workout(s), **${hitCal}** days on calories, avg FuelScore **${fuel ?? '—'}**. Coach is **proud** and **intense** about it.`;
    return open + rest;
  }

  if (workoutMissedToday(snap)) {
    return workoutMissedReply(snap, seed) + `\n\nCoach still loves you. Coach just yells because Coach **cares**, **${n}**.`;
  }

  if (noFoodLoggedToday(snap)) {
    return noFoodReply(snap);
  }

  if (macrosOnTrackToday(snap)) {
    return (
      `**${n}**, Coach looked at today: **${snap.todayTotals.calories} kcal**, **${snap.todayTotals.protein}g protein**. ` +
      pick(
        [
          'You are **ON TRACK** and Coach is pacing like a caged animal. **FIRED UP!**',
          `Coach is **intensely** proud. This is how **${GOAL_LABELS[goal]}** happens.`,
        ],
        seed,
      ) +
      `\n\nThis week: **${weekWorkouts}** workouts, **${hitCal}** solid calorie days` +
      (fuel != null ? `, FuelScore **${fuel}**` : '') +
      '. **Keep going.**'
    );
  }

  if (proteinUnderToday(snap)) {
    const gap = Math.round(targets.macros.proteinG - snap.todayTotals.protein);
    return (
      `Coach sees you, **${n}**. Calories at **${snap.todayTotals.calories}**, but protein is **${snap.todayTotals.protein}g** — **${gap}g short**. ` +
      `Coach is taking that **personally.** Fix it with **${pick(PROTEIN_FIXES, seed)}**. **FIRED UP.**`
    );
  }

  if (caloriesOverToday(snap)) {
    return (
      `**${n}**, you're **${snap.todayTotals.calories - targets.calorieTarget} kcal** over today. Coach is not mad. Coach is disappointed. And a little mad. ` +
      `**We recalibrate tomorrow.** Coach believes in you anyway.`
    );
  }

  if (fuel != null && fuel >= 7.5) {
    return (
      `FuelScore **${fuel}** this week? **ELITE.** Coach didn't know you had this. ` +
      `Today: **${snap.todayTotals.calories} kcal**, **${snap.todayTotals.protein}g protein**. Coach is **fired up** about the quality AND wants more **consistency.**`
    );
  }

  return (
    `Alright **${n}**, Coach's report: today **${snap.todayTotals.calories}/${targets.calorieTarget} kcal**, ` +
    `**${snap.todayTotals.protein}/${targets.macros.proteinG}g protein**, **${weekWorkouts}** workouts this week, ` +
    `**${hitCal}** days on calories.` +
    (fuel != null ? ` FuelScore **${fuel}**.` : '') +
    ` Coach is **in your corner** — now **execute.**`
  );
}

function proteinReply(snap: CoachSnapshot, seed: string): string {
  const target = snap.profile!.targets.macros.proteinG;
  const today = snap.todayTotals.protein;
  const under = proteinUnderDays(snap, target);
  const n = name(snap);

  if (snap.todayEntries === 0) {
    return noFoodReply(snap);
  }

  if (proteinUnderToday(snap)) {
    const gap = Math.round((target - today) * 10) / 10;
    return pick(
      [
        `**${today}g** protein today and Coach wanted **${target}g**. Coach is taking that **personally**. Like, **deeply** personally. Close **${gap}g** with **${pick(PROTEIN_FIXES, seed)}**.`,
        `Sweat is just your fat crying — muscles need **PROTEIN** to cry properly, **${n}**. You're **${gap}g** short. **Eat.**`,
      ],
      seed,
    );
  }

  const avg = loggedDays(snap).length
    ? Math.round((loggedDays(snap).reduce((s, d) => s + d.protein, 0) / loggedDays(snap).length) * 10) / 10
    : today;

  return (
    `**${today}g** today — Coach's target is **${target}g**. Coach is **not mad** at today. ` +
    (under >= 3
      ? `But **${under} of 7 days** were low this week and Coach **remembers.**`
      : `Weekly avg **${avg}g**. Coach sees a **fighter.**`) +
    ' **FIRED UP.**'
  );
}

function calorieReply(snap: CoachSnapshot, seed: string): string {
  const target = snap.profile!.targets.calorieTarget;
  const today = snap.todayTotals.calories;
  const hits = calorieHitDays(snap, target);

  if (snap.todayEntries === 0) {
    return noFoodReply(snap);
  }

  if (caloriesOverToday(snap)) {
    const over = today - target;
    return pick(
      [
        `**${today} kcal** today. Target **${target}**. Coach is not mad. Coach is disappointed. And **${over} kcal** mad.`,
        `Okay. Okay. **${over} over.** We don't quit. We **recalibrate.** Tomorrow Coach wants **discipline.** Still **FIRED UP.**`,
      ],
      seed,
    );
  }

  if (macrosOnTrackToday(snap)) {
    return pick(
      [
        `**${today}/${target} kcal** today? **SHUT IT DOWN!** Coach is fired up!`,
        `That's championship eating, **${name(snap)}**. **${hits}** solid days this week. Coach is **proud.**`,
      ],
      seed,
    );
  }

  const left = Math.max(0, target - today);
  return (
    `**${today}/${target} kcal** today` +
    (left > 0 ? ` — **${left} kcal** left.` : '.') +
    ` **${hits}** on-target days this week. Coach wants **consistency.** **Execute.**`
  );
}

function mealReply(snap: CoachSnapshot, q: string, seed: string): string {
  const t = snap.profile!.targets;
  const n = name(snap);

  if (noFoodLoggedToday(snap)) {
    return (
      noFoodReply(snap) +
      `\n\nThen Coach will tell you what to eat: **${pick(PROTEIN_FIXES, seed)}** — **20–40g protein** to start. **LOG IT.**`
    );
  }

  const remaining = {
    protein: Math.max(0, Math.round((t.macros.proteinG - snap.todayTotals.protein) * 10) / 10),
    calories: Math.max(0, t.calorieTarget - snap.todayTotals.calories),
  };

  const picks = MEAL_IDEAS.filter(
    (d) => d.protein <= remaining.protein + 15 && d.calories <= remaining.calories + 120,
  ).slice(0, 3);

  const ideas =
    picks.length > 0
      ? picks.map((d) => `• **${d.name}** (~${d.protein}g protein, ${d.calories} kcal)`).join('\n')
      : `• **Protein shake + banana**\n• **Greek yogurt** with nuts\n• **Chicken and rice** — Coach classic`;

  return (
    `Coach crunched the numbers, **${n}**: **${remaining.calories} kcal** and **${remaining.protein}g protein** left today.\n\n` +
    `Coach orders:\n${ideas}\n\n` +
    `Log it. Coach is watching. **FIRED UP.**`
  );
}

function fuelScoreReply(snap: CoachSnapshot, seed: string): string {
  const fuel = avgFuelScore(snap);

  if (fuel == null) {
    return 'Coach needs FuelScore data. Log meals this week — Coach wants to yell about how **elite** you are.';
  }

  if (fuel >= 7.5) {
    return pick(
      [
        `Average FuelScore **${fuel}**? **ELITE.** Coach didn't even know you had this in you. Honestly a little **offensive** that you were hiding it.`,
        `**${fuel}** FuelScore. Coach is **shook.** Keep eating like that — Coach will keep **screaming proudly.**`,
      ],
      seed,
    );
  }

  let body = `FuelScore **${fuel}** this week. Coach wants **elite.**`;

  if (snap.bestFoods.length > 0) {
    const top = snap.bestFoods[0];
    body += `\n\nBest move: **${top.name}** (**${top.avgFuel}** avg). Coach approves. **Repeat it.**`;
  } else {
    body += '\n\nSwap one processed snack for whole food. Coach believes in **one upgrade at a time.**';
  }

  return body;
}

function waterReply(snap: CoachSnapshot): string {
  const target = Math.round(snap.profile!.weightKg * 2.20462 * 0.5);
  const todayOz = snap.waterByDate.get(snap.today) ?? 0;
  const n = name(snap);

  if (todayOz === 0) {
    return `**${n}**, Coach sees **zero** water logged today. Champions hydrate. **${target} oz** is the target. Coach is **not asking** — Coach is **telling.**`;
  }

  return `**${todayOz} oz** today. Target ~**${target} oz**. ` +
    (todayOz >= target * 0.8
      ? 'Coach is **fired up** about that hydration.'
      : 'Coach wants **more.** Your muscles are listening.');
}
