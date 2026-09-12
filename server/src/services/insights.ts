/**
 * AI insights (spec 4.1 daily insight) and the weekly check-in (spec 4.3).
 * Uses Claude when configured, with deterministic heuristic fallbacks.
 */
import type { MacroTotals } from '../domain/food.js';

async function callClaude(system: string, user: string, maxTokens = 400): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const pkg = '@anthropic-ai/sdk';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import(pkg);
    const Anthropic = mod.default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    });
    const text: string = msg.content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('')
      .trim();
    return text || null;
  } catch (err) {
    console.warn('Claude insight failed, using heuristic:', err);
    return null;
  }
}

// --- Daily insight --------------------------------------------------------

export interface DailyInsightCtx {
  target: MacroTotals;
  /** Per-day nutrition for the trailing week (days with entries only). */
  recent: { calories: number; protein: number; avgFuel: number }[];
  goal: string;
}

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
}

function heuristicDailyInsight(ctx: DailyInsightCtx): string {
  if (ctx.recent.length === 0) {
    return 'Log a few meals to unlock personalized insights. Aim to hit your protein target first — it drives the rest.';
  }
  const calAvg = avg(ctx.recent.map((d) => d.calories));
  const protAvg = avg(ctx.recent.map((d) => d.protein));
  const fuelAvg = avg(ctx.recent.map((d) => d.avgFuel));
  const t = ctx.target;

  if (t.protein > 0 && protAvg < 0.85 * t.protein) {
    return `You're consistently under on protein (avg ${Math.round(protAvg)}g vs ${t.protein}g target). Try adding Greek yogurt, chicken, or a protein shake to lunch.`;
  }
  if (t.calories > 0 && calAvg > 1.1 * t.calories) {
    return `You're trending over your calorie target (avg ${Math.round(calAvg)} vs ${t.calories}). Watch dinner portions and lead with protein and vegetables.`;
  }
  if (t.calories > 0 && calAvg < 0.8 * t.calories) {
    return `You're well under your calorie target (avg ${Math.round(calAvg)} vs ${t.calories}). Make sure you're eating enough to fuel your ${ctx.goal.replace('_', ' ')} goal.`;
  }
  if (fuelAvg > 0 && fuelAvg < 6) {
    return `Your food quality (avg FuelScore ${fuelAvg.toFixed(1)}) has room to grow. Swap a processed snack for whole foods like fruit, nuts, or yogurt.`;
  }
  return `Great consistency — your calories and protein are dialed in. Keep the momentum and stay hydrated!`;
}

export async function buildDailyInsight(
  ctx: DailyInsightCtx,
): Promise<{ content: string; source: 'claude' | 'local' }> {
  const system = 'You are a concise, encouraging nutrition coach. Reply with ONE actionable sentence.';
  const user =
    `Goal: ${ctx.goal}. Targets: ${ctx.target.calories} kcal, ${ctx.target.protein}g protein. ` +
    `Last ${ctx.recent.length} logged days — avg calories ${Math.round(
      avg(ctx.recent.map((d) => d.calories)),
    )}, avg protein ${Math.round(avg(ctx.recent.map((d) => d.protein)))}g, avg FuelScore ${avg(
      ctx.recent.map((d) => d.avgFuel),
    ).toFixed(1)}. Give one specific, friendly tip.`;
  const claude = ctx.recent.length > 0 ? await callClaude(system, user, 150) : null;
  if (claude) return { content: claude, source: 'claude' };
  return { content: heuristicDailyInsight(ctx), source: 'local' };
}

// --- Weekly check-in ------------------------------------------------------

export interface CheckinCtx {
  goal: string;
  caloriesByDay: number[];
  targetCalories: number;
  proteinAvg: number;
  proteinTarget: number;
  workouts: string[];
  weightDeltaKg: number | null;
}

function heuristicCheckin(ctx: CheckinCtx): string {
  const logged = ctx.caloriesByDay.filter((c) => c > 0);
  const calAvg = logged.length ? Math.round(avg(logged)) : 0;
  const adherence =
    ctx.targetCalories > 0 && logged.length
      ? Math.round((1 - Math.abs(calAvg - ctx.targetCalories) / ctx.targetCalories) * 100)
      : 0;
  const weightStr =
    ctx.weightDeltaKg == null
      ? 'No weigh-ins logged this week'
      : `Weight change: ${ctx.weightDeltaKg > 0 ? '+' : ''}${ctx.weightDeltaKg.toFixed(1)} kg`;

  const p1 =
    `Nice work this week — you logged ${logged.length} day(s) of food and completed ${ctx.workouts.length} workout(s). ` +
    `Your average intake was ${calAvg} kcal against a ${ctx.targetCalories} kcal target (~${adherence}% on-target). ${weightStr}.`;

  let p2: string;
  if (ctx.proteinTarget > 0 && ctx.proteinAvg < 0.85 * ctx.proteinTarget) {
    p2 = `To improve: your protein averaged ${Math.round(ctx.proteinAvg)}g vs a ${ctx.proteinTarget}g target. Anchor each meal with a protein source (eggs, chicken, yogurt, tofu) and you'll feel fuller and recover faster.`;
  } else if (logged.length < 5) {
    p2 = `To improve: consistency. You logged only ${logged.length} days — tracking every day, even rough ones, is the single biggest predictor of progress.`;
  } else {
    p2 = `To improve: keep tightening food quality and aim to log workouts right after finishing so nothing slips through the cracks.`;
  }

  const p3 =
    ctx.goal === 'lose_fat'
      ? `Next week: hold your calorie target and add one extra walk or cardio session to widen your deficit without extra hunger.`
      : ctx.goal === 'build_muscle'
        ? `Next week: if the scale was flat, nudge calories up ~100/day and prioritize progressive overload on your main lifts.`
        : `Next week: stay the course on calories and focus on one habit — hitting protein daily. Small, repeatable wins compound.`;

  return `${p1}\n\n${p2}\n\n${p3}`;
}

export async function buildWeeklyCheckin(
  ctx: CheckinCtx,
): Promise<{ content: string; source: 'claude' | 'local' }> {
  const system =
    'You are an expert, motivating fitness and nutrition coach. Write a personal, direct weekly review.';
  const user =
    `Given this user's week — calories logged each day: [${ctx.caloriesByDay.join(', ')}], ` +
    `calorie target ${ctx.targetCalories}, average protein ${Math.round(ctx.proteinAvg)}g vs ${ctx.proteinTarget}g target, ` +
    `workouts completed: [${ctx.workouts.join('; ') || 'none'}], ` +
    `weight change: ${ctx.weightDeltaKg == null ? 'unknown' : `${ctx.weightDeltaKg.toFixed(1)}kg`}, goal: ${ctx.goal} — ` +
    `write a 3-paragraph motivational and tactical weekly review. Paragraph 1: what went well. ` +
    `Paragraph 2: what to improve with specific actionable advice. Paragraph 3: recommendation for next week ` +
    `(adjust calories? change workout split?). Keep it personal, direct, and under 200 words.`;
  const claude = await callClaude(system, user, 500);
  if (claude) return { content: claude, source: 'claude' };
  return { content: heuristicCheckin(ctx), source: 'local' };
}
