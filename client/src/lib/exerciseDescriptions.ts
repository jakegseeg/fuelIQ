export interface ExerciseDescription {
  description: string;
  keyTip: string;
}

const GENERIC: ExerciseDescription = {
  description:
    'Move through the full range of motion with control on the way down and steady effort on the way up. ' +
    'Choose a load that lets you complete every rep with good form. Rest as prescribed between sets.',
  keyTip: 'Brace your core and stop the set when form breaks down — not when you hit failure.',
};

/** Canonical keys are lowercase exercise names. */
const DICTIONARY: Record<string, ExerciseDescription> = {
  'back squat': {
    description:
      'Stand with the bar on your upper back, feet shoulder-width apart, and sit your hips back and down between your legs. ' +
      'Keep your whole foot planted and drive through the floor to stand. Aim for thighs at least parallel to the floor.',
    keyTip: 'Keep your chest up throughout the movement and brace your core before each rep.',
  },
  'front squat': {
    description:
      'Rest the bar across your front delts with elbows high and torso upright. Squat down while keeping your knees tracking over your toes. ' +
      'Drive up through mid-foot without letting your hips shoot back first.',
    keyTip: 'Elbows stay parallel to the floor — if they drop, the bar will roll forward.',
  },
  deadlift: {
    description:
      'With the bar over mid-foot, hinge at the hips and grip the bar just outside your legs. Brace, pull slack from the bar, then push the floor away while extending hips and knees together. ' +
      'Finish tall without leaning back excessively.',
    keyTip: 'Keep the bar close to your body — it should nearly scrape your shins and thighs.',
  },
  'romanian deadlift': {
    description:
      'Start standing with a slight knee bend. Push your hips back and lower the bar along your legs until you feel a strong hamstring stretch. ' +
      'Keep your back neutral and drive your hips forward to return upright.',
    keyTip: 'Think “hips back, not knees forward” — the movement is a hinge, not a squat.',
  },
  'bench press': {
    description:
      'Lie on the bench with feet flat, shoulder blades pinched, and wrists stacked over elbows. Lower the bar to mid-chest with control, then press up and slightly back over your shoulders. ' +
      'Keep your glutes on the bench and avoid flaring elbows excessively.',
    keyTip: 'Pull the bar apart or “bend the bar” to create shoulder stability at the bottom.',
  },
  'incline bench press': {
    description:
      'Set the bench to 30–45°. Lower the bar or dumbbells to the upper chest with elbows at roughly 45° from your torso. ' +
      'Press up in a slight arc without bouncing off your chest.',
    keyTip: 'Keep your shoulder blades pinned — don’t let them roll forward as you press.',
  },
  'overhead press': {
    description:
      'Stand with the bar at collarbone height, grip just outside shoulder width, and brace your glutes and core. Press the bar straight up, moving your head back slightly so the bar path stays vertical. ' +
      'Lock out overhead with biceps by your ears.',
    keyTip: 'Squeeze your glutes and quads to avoid arching your lower back.',
  },
  'barbell row': {
    description:
      'Hinge forward with a flat back until your torso is roughly 45° to the floor. Pull the bar to your lower ribs, leading with your elbows and squeezing your shoulder blades together. ' +
      'Lower with control without rounding your spine.',
    keyTip: 'Pull with your back, not your arms — think “elbows to hips.”',
  },
  'pull up': {
    description:
      'Hang from the bar with shoulders engaged (not fully relaxed). Pull your chest toward the bar by driving elbows down and back. ' +
      'Lower under control to a full hang without swinging.',
    keyTip: 'Start each rep by pulling your shoulder blades down — don’t shrug at the bottom.',
  },
  'chin up': {
    description:
      'Use an underhand grip shoulder-width apart. Pull your chin over the bar while keeping your chest lifted and elbows close to your ribs. ' +
      'Lower slowly to full extension without kipping.',
    keyTip: 'Keep your ribs down — avoid excessive arching at the top.',
  },
  'lat pulldown': {
    description:
      'Sit with thighs secured under the pad and grip the bar slightly wider than shoulder width. Pull the bar to your upper chest while leaning back slightly and driving elbows toward your hips. ' +
      'Return with control until arms are extended without shrugging.',
    keyTip: 'Drive your elbows down and back — don’t pull with your hands alone.',
  },
  'seated row': {
    description:
      'Sit tall with a neutral spine and pull the handle to your lower ribs. Squeeze your shoulder blades together at the finish, then extend arms fully without rounding your back. ' +
      'Keep your torso still — no rocking for momentum.',
    keyTip: 'Pause briefly at the squeeze — that’s where your mid-back does the work.',
  },
  'dumbbell curl': {
    description:
      'Stand with dumbbells at your sides, palms forward. Curl the weight up without swinging your hips, keeping elbows fixed at your sides. ' +
      'Lower slowly until arms are nearly straight.',
    keyTip: 'Keep your upper arms still — only your forearms should move.',
  },
  'tricep pushdown': {
    description:
      'Stand at the cable stack with elbows pinned to your ribs. Push the attachment down until your arms are fully extended, then return until forearms are about parallel to the floor. ' +
      'Keep shoulders down and torso upright.',
    keyTip: 'Lock your elbows in place — don’t let them drift forward on the way up.',
  },
  'leg press': {
    description:
      'Place feet shoulder-width on the platform with knees tracking over toes. Lower the sled until knees reach roughly 90° without your lower back peeling off the pad. ' +
      'Press through your whole foot to extend legs without locking knees violently.',
    keyTip: 'Don’t let your lower back round at the bottom — control the depth.',
  },
  'leg curl': {
    description:
      'Line up your knee joint with the machine pivot. Curl your heels toward your glutes in a smooth arc, squeezing hamstrings at the top. ' +
      'Lower with control without letting the weight slam.',
    keyTip: 'Keep your hips pressed into the pad — don’t lift them to cheat the rep.',
  },
  'leg extension': {
    description:
      'Adjust the pad to sit on your lower shins with knees aligned to the machine axis. Extend your legs until straight, squeezing quads at the top, then lower under control. ' +
      'Use a tempo you can control on every rep.',
    keyTip: 'Point your toes slightly up and squeeze hard at full extension — don’t snap the knee.',
  },
  'calf raise': {
    description:
      'Stand on the balls of your feet with a soft knee bend. Rise as high as possible onto your toes, pause briefly, then lower until you feel a stretch in your calves. ' +
      'Use full range — no bouncing at the bottom.',
    keyTip: 'Pause at the top for one second — calves respond well to time under tension.',
  },
  'hip thrust': {
    description:
      'Rest your upper back on a bench with the bar over your hips (use a pad). Drive through your heels to lift your hips until your body forms a straight line from knees to shoulders. ' +
      'Squeeze glutes hard at the top, then lower without losing tension.',
    keyTip: 'Tuck your chin slightly and ribs down — avoid hyperextending your lower back.',
  },
  plank: {
    description:
      'Support your body on forearms and toes with elbows under shoulders. Brace your core, squeeze glutes, and hold a straight line from head to heels. ' +
      'Breathe steadily without letting your hips sag or pike up.',
    keyTip: 'Push the floor away with your forearms — that creates full-body tension.',
  },
  'push up': {
    description:
      'Hands slightly wider than shoulders, body in a straight line from head to heels. Lower your chest between your hands until elbows reach about 45°, then press back up. ' +
      'Keep your core tight so your hips don’t drop.',
    keyTip: 'Screw your hands into the floor to engage your shoulders and lats.',
  },
  dip: {
    description:
      'Support yourself on parallel bars with shoulders down and chest slightly forward for chest emphasis (or upright for triceps). Lower until upper arms are about parallel to the floor, then press back up. ' +
      'Keep movement smooth without swinging.',
    keyTip: 'Keep your shoulders packed down — don’t shrug up toward your ears.',
  },
  'face pull': {
    description:
      'Set a rope attachment at upper-chest height. Pull toward your face with elbows high and wide, externally rotating so your hands finish beside your ears. ' +
      'Return with control — this is rear-delt and rotator-cuff work, not a heavy row.',
    keyTip: 'Lead with your elbows and think “pull the rope apart” at the finish.',
  },
  'lateral raise': {
    description:
      'Stand with dumbbells at your sides and a slight elbow bend. Raise arms out to the sides until elbows reach shoulder height, then lower slowly. ' +
      'Use a weight you can control — momentum defeats the purpose.',
    keyTip: 'Pour water out of the dumbbells — slight pinky-up tilt targets the side delt.',
  },
  'front raise': {
    description:
      'Hold dumbbells in front of your thighs with palms facing you. Raise one or both arms to shoulder height in a controlled arc, then lower without swinging. ' +
      'Keep your torso still and core braced.',
    keyTip: 'Stop at shoulder height — going higher shifts stress to traps.',
  },
  'barbell bench press': {
    description:
      'Lie on the bench with feet flat, shoulder blades pinched, and wrists stacked over elbows. Lower the bar to mid-chest with control, then press up and slightly back over your shoulders. ' +
      'Keep your glutes on the bench throughout the set.',
    keyTip: 'Pull the bar apart to create shoulder stability at the bottom.',
  },
  'goblet squat': {
    description:
      'Hold a dumbbell or kettlebell at your chest and squat between your hips with elbows inside your knees. Keep your torso upright and drive through mid-foot to stand. ' +
      'Use a depth you can control with a flat back.',
    keyTip: 'Use your elbows to actively push your knees out at the bottom.',
  },
  'bulgarian split squat': {
    description:
      'Place your rear foot on a bench behind you and descend until your front thigh is near parallel. Keep most of your weight on the front leg and drive through the front heel to stand. ' +
      'Stay tall through your chest.',
    keyTip: 'Shorten your stance if you feel a hip pinch — front knee should track over toes.',
  },
  'walking lunge': {
    description:
      'Step forward into a lunge until both knees bend to about 90° with your front knee over your ankle. Push through the front foot to bring the back leg forward into the next rep. ' +
      'Keep your torso upright and core braced.',
    keyTip: 'Take a long enough step so your front knee doesn’t cave inward.',
  },
  'hammer curl': {
    description:
      'Hold dumbbells with a neutral (palms-in) grip at your sides. Curl up keeping palms facing each other and elbows fixed. ' +
      'Lower under control without rocking your torso.',
    keyTip: 'Squeeze at the top — neutral grip emphasizes brachialis and forearms.',
  },
  'skull crusher': {
    description:
      'Lie on a bench holding an EZ bar or dumbbells above your chest. Bend only at the elbows to lower the weight toward your forehead or behind your head, then extend back up. ' +
      'Keep upper arms vertical and stationary.',
    keyTip: 'Point your elbows at the ceiling — if they flare wide, stress shifts to shoulders.',
  },
  'cable fly': {
    description:
      'Set cables at shoulder height, step forward slightly, and bring handles together in a wide hugging arc with a soft elbow bend. ' +
      'Squeeze your chest at the center, then return until you feel a stretch without going too deep.',
    keyTip: 'Lead with your elbows — imagine wrapping your arms around a barrel.',
  },
  'good morning': {
    description:
      'With the bar on your upper back, hinge at the hips while keeping a neutral spine until your torso is near parallel to the floor. ' +
      'Drive your hips forward to stand, squeezing glutes at the top.',
    keyTip: 'This is a hip hinge — push your hips back like closing a car door with your butt.',
  },
  'sumo deadlift': {
    description:
      'Take a wide stance with toes pointed out and grip the bar inside your knees. Keep your chest up, spread the floor with your feet, and drive hips and knees to lockout together. ' +
      'Keep the bar close throughout the pull.',
    keyTip: 'Push your knees out over your toes — don’t let them collapse inward.',
  },
  'pendlay row': {
    description:
      'Start each rep from a dead stop on the floor with a flat back and torso parallel to the ground. Explosively pull the bar to your lower chest, then lower it fully back to the floor. ' +
      'Reset your brace between reps.',
    keyTip: 'No bounce off the floor — treat each rep as its own lift.',
  },
  't-bar row': {
    description:
      'Straddle the bar or use a machine pad, hinge forward with a flat back, and pull the handle to your chest. ' +
      'Squeeze your shoulder blades, then lower with control.',
    keyTip: 'Pull to your sternum, not your belly — that keeps lats and mid-back engaged.',
  },
  'glute bridge': {
    description:
      'Lie on your back with knees bent and feet flat. Drive through your heels to lift your hips until your body forms a straight line from knees to shoulders. ' +
      'Squeeze glutes at the top, then lower without relaxing fully if you want constant tension.',
    keyTip: 'Don’t hyperextend — stop when hips align with shoulders and knees.',
  },
  'kettlebell swing': {
    description:
      'Hinge at the hips with a flat back and hike the kettlebell back between your legs. Snap your hips forward to propel the bell to chest height — arms stay relaxed. ' +
      'Let the bell swing back as you hinge again for the next rep.',
    keyTip: 'Power comes from your hips, not your arms — think “jump without leaving the ground.”',
  },
  'farmer walk': {
    description:
      'Hold heavy dumbbells or handles at your sides with shoulders packed and torso tall. Walk controlled steps while resisting side-to-side sway. ' +
      'Maintain a brisk pace without rushing into sloppy posture.',
    keyTip: 'Walk like you’re trying to be quiet — short, stable steps beat speed.',
  },
  'burpee': {
    description:
      'Drop to a plank, optionally perform a push-up, jump feet to your hands, then explode upward with a small hop. ' +
      'Move continuously but keep your core braced during the plank phase.',
    keyTip: 'Land softly and breathe rhythmically — pace beats frantic speed.',
  },
  'mountain climbers': {
    description:
      'Start in a high plank and drive one knee toward your chest, then quickly alternate legs while keeping hips level and shoulders over wrists. ' +
      'Scale speed to maintain a flat back.',
    keyTip: 'Push the floor away so your hips don’t bounce up with every step.',
  },
  'russian twist': {
    description:
      'Sit with knees bent and torso leaned back slightly, holding a weight at your chest. Rotate your ribcage to tap the weight side to side while keeping hips stable. ' +
      'Move from your thoracic spine, not just your arms.',
    keyTip: 'Exhale on each twist and keep your feet anchored for control.',
  },
  'shrugs': {
    description:
      'Hold dumbbells or a bar at your sides with arms straight. Elevate your shoulders straight up toward your ears, pause, then lower fully. ' +
      'Avoid rolling your shoulders — it adds no benefit and can irritate the joint.',
    keyTip: 'Pause at the top for a full second — traps love the squeeze.',
  },
  'step up': {
    description:
      'Place one foot fully on a box or bench and drive through that heel to stand on top without pushing off the back leg. ' +
      'Step down under control and repeat all reps on one side or alternate as programmed.',
    keyTip: 'Use a height where your knee stays stable — don’t rock forward off the toe.',
  },
  'box jump': {
    description:
      'Stand arm’s length from a sturdy box. Dip into a quarter squat, swing your arms, and jump onto the box landing softly with knees slightly bent. ' +
      'Step down one foot at a time rather than jumping down repeatedly.',
    keyTip: 'Land quietly — loud landings mean you’re absorbing impact poorly.',
  },
  running: {
    description:
      'Maintain an upright posture with a slight forward lean from the ankles, not the waist. Strike mid-foot under your hips with quick, light steps and relaxed shoulders. ' +
      'Build pace gradually rather than sprinting from the start.',
    keyTip: 'Run tall — imagine a string pulling the top of your head upward.',
  },
  cycling: {
    description:
      'Set saddle height so your knee has a slight bend at the bottom of the pedal stroke. Keep a smooth cadence and even pressure through the full revolution. ' +
      'Relax your upper body and engage your core for stability.',
    keyTip: 'Pull up lightly through the back of the stroke — don’t only mash downward.',
  },
  'jump rope': {
    description:
      'Stay on the balls of your feet with small, quick hops while rotating the rope with your wrists, not your whole arms. ' +
      'Keep elbows close to your ribs and jump just high enough for the rope to pass.',
    keyTip: 'Listen for quiet foot contacts — heavy landings waste energy.',
  },
  'cable crunch': {
    description:
      'Kneel facing away from a high cable with a rope behind your head. Crunch down by curling your ribcage toward your pelvis, not by pulling with your arms. ' +
      'Return with control and keep hips stationary.',
    keyTip: 'Exhale hard at the bottom — think “ribs to hips,” not “head to floor.”',
  },
  'preacher curl': {
    description:
      'Rest your upper arms on the preacher pad with armpits snug at the top. Curl the weight up without lifting your elbows off the pad, then lower until arms are nearly extended. ' +
      'Use a controlled tempo — the bottom stretch is demanding.',
    keyTip: 'Don’t fully lock out at the bottom if it hyperextends your elbow uncomfortably.',
  },
};

const ALIASES: Record<string, string> = {
  squat: 'back squat',
  'barbell squat': 'back squat',
  'barbell back squat': 'back squat',
  'back squats': 'back squat',
  'front squats': 'front squat',
  'conventional deadlift': 'deadlift',
  'barbell deadlift': 'deadlift',
  rdls: 'romanian deadlift',
  rdl: 'romanian deadlift',
  'romanian deadlifts': 'romanian deadlift',
  'flat bench press': 'bench press',
  'barbell bench press': 'barbell bench press',
  'incline press': 'incline bench press',
  'incline dumbbell press': 'incline bench press',
  'military press': 'overhead press',
  'shoulder press': 'overhead press',
  'ohp': 'overhead press',
  'bent over row': 'barbell row',
  'barbell bent over row': 'barbell row',
  'pull-up': 'pull up',
  'pullups': 'pull up',
  'pull-ups': 'pull up',
  'chin-up': 'chin up',
  'chin-ups': 'chin up',
  'chinups': 'chin up',
  'lat pull down': 'lat pulldown',
  'lat pull-down': 'lat pulldown',
  'cable row': 'seated row',
  'machine row': 'seated row',
  'bicep curl': 'dumbbell curl',
  'dumbbell bicep curl': 'dumbbell curl',
  'triceps pushdown': 'tricep pushdown',
  'rope pushdown': 'tricep pushdown',
  'leg extensions': 'leg extension',
  'leg curls': 'leg curl',
  'standing calf raise': 'calf raise',
  'seated calf raise': 'calf raise',
  'hip thrusts': 'hip thrust',
  'barbell hip thrust': 'hip thrust',
  'push-up': 'push up',
  'pushups': 'push up',
  'push-ups': 'push up',
  'chest dips': 'dip',
  'parallel bar dips': 'dip',
  'side raise': 'lateral raise',
  'side lateral raise': 'lateral raise',
  'db lateral raise': 'lateral raise',
  'lunges': 'walking lunge',
  'walking lunges': 'walking lunge',
  'kb swing': 'kettlebell swing',
  'farmers carry': 'farmer walk',
  'farmers walk': 'farmer walk',
};

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

export function hasExerciseDescription(name: string): boolean {
  return resolveKey(normalize(name)) !== null;
}

export function getExerciseDescription(name: string): ExerciseDescription {
  const key = resolveKey(normalize(name));
  return key ? DICTIONARY[key] : GENERIC;
}
