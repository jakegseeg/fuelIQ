# FuelIQ

A smart nutrition + training coach: personalized calorie tracking, food quality
scoring, and AI-generated workout plans tailored to your biometrics, goals, and
real dietary data.

> **Implemented so far:**
> - **Chunk 1 — User Onboarding & Profile** (6-step wizard, Mifflin-St Jeor TDEE/macros).
> - **Chunk 2 — Food Logging & Nutrition Intelligence** (Open Food Facts search +
>   barcode scanning, the FuelScore quality algorithm, AI food suggestions, water
>   tracking, meal templates & recipes).
> - **Chunk 3 — Workout Plans & Exercise Logging** (AI weekly plan generation,
>   active workout mode, MET-based calorie burn folded into net daily calories,
>   and workout history with volume/PRs/streak).
> - **Chunk 4 — Dashboard & Progress Tracking** (3-column home dashboard, weight
>   tracking + calorie/macro/FuelScore/volume charts with Recharts, daily AI
>   insight, and the AI weekly check-in).
> - **Chunk 5 — Data Layer, API Routes & Architecture** (JWT auth with hashed
>   passwords, canonical PostgreSQL schema, the full spec'd REST surface incl.
>   AI chat, and documented env vars).
> - **Chunk 6 — Design System** (dark mode, Syne/DM Sans, component library, responsive shell).
> - **Chunk 7 — AI Coach & Advanced Features** (streaming coach, notifications, MFP import, supplements).
>
> **Chunk 8 — Setup & build order:** see **[SETUP.md](./SETUP.md)** for exact
> `npm install` commands, the full folder tree, third-party APIs, and the
> step-by-step build sequence for Cursor.

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS (`client/`)
- **Backend:** Node.js + Express + TypeScript (`server/`)
- **Database:** SQLite for local dev (`server/data/fueliq.db`); Postgres DDL in
  `server/sql/schema.postgres.sql`
- **AI:** Anthropic Claude API (optional — local fallbacks when unset)

## Getting started

Requires **Node 18+** and **npm**.

```bash
npm install
cp .env.example .env          # optional: JWT_SECRET, ANTHROPIC_API_KEY
npm install @anthropic-ai/sdk -w server   # optional: full AI features
npm run dev
```

- **Client:** http://localhost:5173  
- **API:** http://localhost:4000 (`/api` proxied in dev)

Full init options, file structure, build order, and API matrix → **[SETUP.md](./SETUP.md)**.

```bash
npm run dev:server     # API only
npm run dev:client     # client only
npm run build          # production build
npm run typecheck      # TypeScript check
```

## Onboarding flow (`/onboarding`)

A six-step wizard with a progress bar. Step 5 (target weight) only appears for
the **Lose fat** and **Build muscle** goals.

1. **Basic info** — name, date of birth (auto-computes age), biological sex,
   height (ft/in or cm), current weight (lbs or kg).
2. **Primary goal** — lose fat / maintain / build muscle / improve endurance / recomp.
3. **Activity level** — sedentary → athlete.
4. **Dietary preferences** — multi-select with a mutually-exclusive
   "No restrictions" option and a custom free-text field.
5. **Target weight** *(optional)* — target weight + date, with a projected
   weekly change rate.
6. **Unit preferences** — weight, height, and energy units.

## TDEE & macro engine (`server/src/domain/calculations.ts`)

**BMR — Mifflin-St Jeor:**

```
Male:   (10 × kg) + (6.25 × cm) − (5 × age) + 5
Female: (10 × kg) + (6.25 × cm) − (5 × age) − 161
```

**TDEE = BMR × activity multiplier**

| Activity   | Multiplier |
| ---------- | ---------- |
| Sedentary  | 1.2        |
| Light      | 1.375      |
| Moderate   | 1.55       |
| Very       | 1.725      |
| Athlete    | 1.9        |

**Goal-based calorie target:**

| Goal         | Δ from TDEE |
| ------------ | ----------- |
| Lose fat     | −500        |
| Maintain     | 0           |
| Build muscle | +250        |
| Recomp       | −100        |
| Endurance    | +150        |

**Macro split:**

- **Protein:** 0.8–1.2 g per lb bodyweight (1.2 for build-muscle/recomp).
- **Fat:** 25–35% of calories ÷ 9.
- **Carbs:** remaining calories ÷ 4.

All computed values are stored on `user_profiles` and recomputed on every save.

## API

All routes accept an `x-user-id` header (the client generates and stores a
stable id in `localStorage`; this stands in for auth until that chunk lands).

| Method | Path                    | Purpose                                   |
| ------ | ----------------------- | ----------------------------------------- |
| GET    | `/api/profile`          | Full profile + computed targets (404 if none) |
| PUT    | `/api/profile`          | Upsert profile, recompute & store targets |
| GET    | `/api/profile/targets`  | Computed TDEE/macro targets               |
| POST   | `/api/profile/preview`  | Compute targets without saving (wizard)   |
| GET    | `/api/profile/photos`   | List progress photos                      |
| POST   | `/api/profile/photos`   | Upload a progress photo (multipart)       |

## Food logging (`/log`) — Chunk 2

The daily log screen has a date picker, four meal sections (Breakfast, Lunch,
Dinner, Snacks), and a sticky summary sidebar.

- **Add food** opens a modal with: live **Open Food Facts** text search, a
  **barcode scanner** (`html5-qrcode`), **Recent** (last 20 unique) and
  **Frequent** (top 10 by count) foods, and a **custom entry** form. A serving
  selector (common sizes from API data, or custom grams/oz) live-updates macros.
- **Daily summary** shows calories remaining/goal, macro rings (protein/carbs/
  fat filled arcs), and net calories.
- **Best foods for today** suggests 3–5 foods that fill the remaining macros
  (Claude when configured, otherwise a deterministic local ranker) with a
  one-tap quick-add.
- **Water tracking** widget: goal = bodyweight (lbs) × 0.5 oz, with 8/16/32 oz
  quick-adds and a progress bar.
- **Meal templates & recipes**: save a day's foods as a template and quick-log
  it; build recipes from ingredients with auto-calculated per-serving macros.

### FuelScore (spec 2.4)

Every food gets a 1–10 quality score (`server/src/domain/fuelscore.ts`),
averaging up to six components — protein density, fiber per 100 kcal, sugar
ratio, NOVA processing level, micronutrient load (vitamins/minerals ≥10% DV),
and saturated-fat ratio. Components with no data are skipped. Badges:
8–10 green "Excellent", 5–7 yellow "Good", 3–4 orange "Fair", 1–2 red "Poor",
with a tap-to-open breakdown drawer.

### Chunk 2 API

| Method | Path                          | Purpose                                  |
| ------ | ----------------------------- | ---------------------------------------- |
| GET    | `/api/foods/search?q=`        | Search Open Food Facts (scored)          |
| GET    | `/api/foods/barcode/:code`    | Barcode product lookup (scored)          |
| POST   | `/api/foods/score`            | FuelScore for arbitrary nutrition        |
| GET    | `/api/log?date=`              | Day summary (meals, totals, remaining, water) |
| POST   | `/api/log/entry`              | Log a food                               |
| PATCH  | `/api/log/entry/:id`          | Change quantity                          |
| DELETE | `/api/log/entry/:id?date=`    | Remove an entry                          |
| GET    | `/api/log/recent`             | Last 20 unique foods                     |
| GET    | `/api/log/frequent`           | Top 10 foods by log count                |
| GET    | `/api/suggestions?...`        | Macro-gap food suggestions               |
| GET/POST | `/api/water`                | Water log for a day                      |
| GET/POST/DELETE | `/api/templates`     | Meal templates (+ `/:id/log` to quick-log) |
| GET/POST/DELETE | `/api/recipes`       | Recipes (per-serving macros)             |

### Enabling AI suggestions (optional)

Suggestions work out of the box via a local ranker. To use Claude instead:

```bash
npm install @anthropic-ai/sdk -w server
# set ANTHROPIC_API_KEY in .env
```

The integration is loaded lazily, so the app builds and runs without the SDK.

## Workouts (`/workouts`) — Chunk 3

- **AI plan generator** (`POST /api/workouts/generate-plan`): pulls age/sex/
  weight/height/goal/calories/protein from the profile and combines them with
  your preferences (days/week, equipment, session length, fitness level,
  injuries) to build a weekly plan via Claude — with a deterministic split-based
  generator (`services/workoutPlan.ts`) as a fallback when no API key is set.
- **Plan display**: a weekly calendar of daily focuses; tap a day to see exercise
  cards (sets×reps, rest, muscle tags, demo image from the free **wger API**).
- **Active workout mode** (`/workouts/active`): full-screen set tracker (weight +
  reps per set), configurable **rest timer**, "Exercise X of N" progress, and a
  finish summary. Calories burned are added to the day's **net calories**.
- **History** (`/workouts/history`): session list, weekly volume-by-muscle chart,
  personal records (heaviest weight per exercise), and a weekly streak counter.

### Calorie burn (spec 3.5)

`estimated burn = MET × weight(kg) × duration(hours)` (`domain/workout.ts`), with
MET values per workout type (weight training 5.0, HIIT 10.0, running 8.0,
cycling 6.8, yoga 2.8, walking 3.5…). Logged burn is subtracted from net daily
calories and added back to remaining calories on the food log.

### Chunk 3 API

| Method | Path                              | Purpose                            |
| ------ | --------------------------------- | ---------------------------------- |
| POST   | `/api/workouts/generate-plan`     | Generate & store a weekly plan     |
| GET    | `/api/workouts/plan`              | Active plan                        |
| POST   | `/api/workouts/logs`              | Finish a session (computes burn)   |
| GET    | `/api/workouts/logs`              | Session history                    |
| DELETE | `/api/workouts/logs/:id?date=`    | Delete a session                   |
| GET    | `/api/workouts/history`           | Volume / PRs / streak stats        |
| GET    | `/api/exercises/demo?name=`       | Exercise demo image (wger)         |

## Dashboard & progress (`/dashboard`, `/progress`) — Chunk 4

- **Dashboard** (`/dashboard`): three-column home screen built from a single
  `GET /api/dashboard` call.
  - _Today at a glance_: large calorie ring (remaining calories, net of workout
    burn), protein/carbs/fat progress bars, the water widget, and today's
    workout (from the active plan) with a **Start** button.
  - _Quick log_: recent meal entries with macro pills, a `+ Log meal` shortcut,
    and the AI "best foods for your remaining macros" strip.
  - _Streak & insights_: consecutive-day logging streak, a 7-day calorie
    adherence mini-chart, the daily **AI insight** card, next workout preview,
    and the weekly check-in card.
- **Progress** (`/progress`): all charts via **Recharts**.
  - **Weight tracking**: daily weigh-in input, line chart with 7-day moving
    average and a goal-weight reference line, and a 7d/30d/90d/all range toggle.
  - **Calorie adherence**: 14-day bar chart, color-coded green (≤10% off),
    yellow (10–20%), red (>20%).
  - **Macro consistency**: stacked P/C/F bars (last 7 days) plus average vs
    target split donuts.
  - **FuelScore trend**: average daily score with a "quality improved X%" callout.
  - **Workout volume**: per-muscle weekly volume and cardio minutes per week.

### AI weekly check-in (spec 4.3)

`POST /api/checkin/generate` assembles the week's calories-per-day, average
protein vs target, completed workouts, and weight delta, then asks Claude for a
3-paragraph review (what went well / what to improve / next week). A
deterministic heuristic summary is used when no API key is configured. Results
are cached per ISO week and surfaced on the dashboard.

### Chunk 4 API

| Method | Path                          | Purpose                                  |
| ------ | ----------------------------- | ---------------------------------------- |
| GET    | `/api/dashboard?date=`        | Composed home-screen payload             |
| POST   | `/api/progress/weight`        | Log a weigh-in (`{ weightKg, date? }`)   |
| GET    | `/api/progress/weight?range=` | Weight series + 7-day avg + goal         |
| GET    | `/api/progress/summary`       | Calorie/macro/FuelScore/volume charts    |
| GET    | `/api/checkin`                | Latest (or `?week=`) weekly check-in     |
| POST   | `/api/checkin/generate`       | Generate/refresh the weekly check-in     |

## Data layer, auth & API surface — Chunk 5

### Authentication

- **JWT auth** with email/password. Passwords are hashed with **scrypt**
  (`server/src/auth/password.ts`) and tokens are signed **HS256** — both built on
  Node's `crypto`, so there are **no native/extra dependencies** to compile.
- `attachUser` middleware reads a `Bearer` token on every request and sets
  `req.userId`. `userIdFrom` prefers the authenticated user and falls back to the
  legacy `x-user-id` header so local dev keeps working before sign-in.
- Set a strong **`JWT_SECRET`** in production.

| Method | Path                  | Purpose                          |
| ------ | --------------------- | -------------------------------- |
| POST   | `/api/auth/register`  | Create account → `{ token, user }` |
| POST   | `/api/auth/login`     | Sign in → `{ token, user }`        |
| POST   | `/api/auth/logout`    | Stateless (client drops token)   |
| GET    | `/api/auth/me`        | Current user (requires token)    |

### Database

- **Local dev:** SQLite at `server/data/fueliq.db` (zero config).
- **Production:** PostgreSQL — the canonical DDL lives at
  `server/sql/schema.postgres.sql` (users, profiles, food/water/weight logs,
  workout plans & sessions, meal templates, recipes, custom foods, insights,
  weekly check-ins). Apply with `psql "$DATABASE_URL" -f server/sql/schema.postgres.sql`.

### Full REST surface (spec 5.2)

| Group     | Endpoints                                                                            |
| --------- | ------------------------------------------------------------------------------------ |
| Auth      | `POST /api/auth/register`, `/login`, `/logout`; `GET /api/auth/me`                   |
| Profile   | `GET/PUT /api/profile`; `GET /api/profile/targets`                                   |
| Food log  | `GET /api/log?date=`; `POST /api/log/entry`; `PUT|PATCH/DELETE /api/log/entry/:id`; `GET /api/log/summary?date=`, `/recent`, `/frequent` |
| Food      | `GET /api/food/search?q=`; `GET /api/food/:id`; `POST /api/food/custom` (also under `/api/foods`) |
| Water     | `GET /api/water?date=`; `POST /api/water`; `DELETE /api/water/:id`                    |
| Workouts  | `POST /api/workouts/generate-plan`; `GET /api/workouts/plan/active`, `/plan/:id`; `POST /api/workouts/log`; `GET /api/workouts/history`, `/history/:id` |
| Progress  | `GET /api/progress/weight?range=`, `/calories?range=`, `/macros?range=`; `POST /api/weight` |
| AI        | `GET /api/ai/suggestions`; `GET /api/ai/weekly-review`; `POST /api/ai/chat`          |

> Earlier chunks also expose the verb variants they shipped with (e.g.
> `PATCH /api/log/entry/:id`, `GET /api/workouts/plan`, `/api/suggestions`,
> `/api/checkin`); the Chunk 5 paths above are added alongside them so older
> clients keep working.

### Environment variables (spec 5.3)

```
DATABASE_URL=                       # Postgres connection (SQLite used if unset)
ANTHROPIC_API_KEY=                  # enables all AI features (optional)
OPEN_FOOD_FACTS_USER_AGENT=FuelIQ/1.0
JWT_SECRET=                         # sign/verify auth tokens
PORT=4000                           # API port (spec lists 3001)
VITE_API_BASE_URL=http://localhost:4000
```

> The client currently talks to the API through Vite's dev proxy (`/api` →
> `localhost:4000`); the backend auth is fully wired, but dedicated login/register
> screens are a follow-up (the `api.register/login/logout/me` client methods and
> token storage are already in place).

## Profile page (`/profile`)

- **Current stats** summary card.
- **Daily target** card with calorie target and a macro donut chart.
- **Editable** version of every onboarding field; **Recalculate targets**
  re-runs the engine on save.
- **Progress photos** upload (stored locally under `server/uploads/`).

## Chunk 6 — Design system & component library

**Dark-mode-first** aesthetic (spec 6.1) implemented in `client/tailwind.config.js`
and `client/src/index.css`:

- **Surfaces:** `bg` `#0F0F12`, `surface` `#1A1A22`, `surface2` `#22222C`.
- **Accents:** electric green `accent-400` `#39FF6A` (positive/hit), `amber-400`
  `#F5A623` (warnings), `coral-400` `#FF5F5F` (over-limit).
- **Type:** display `Syne`, body `DM Sans` (loaded in `index.html`).
- **Motion:** default `200ms` transitions; `animate-page-in` (fade + 8px slide)
  on every routed page; `useAnimatedNumber` counts rings/macros; water wave loop.
  Honors `prefers-reduced-motion`.
- **Cards:** 16px radius (`rounded-card`), inner-glow on hover (`.card-hover`),
  `.glass` backdrop-blur for sticky bars / overlays.
- The neutral `ink` ramp is **inverted** (ink-50 = darkest bg, ink-900 = lightest
  text) so existing screens read correctly in dark mode.

### Component library (spec 6.2)

```
client/src/components/
  ui/      CalorieRing, MacroBar, FuelScoreBadge, FoodCard, ExerciseCard,
           NutritionLabel, WaterWidget, WeightChart, CalorieChart,
           AIInsightCard, MealSection
  layout/  Sidebar (≥lg), BottomNav (<lg), TopBar, AppShell (+ navLinks)
  modals/  FoodSearchModal, AddWaterModal, WorkoutPreferencesModal
```

### Responsive frame (spec 6.3 / 6.4)

`AppShell` composes the responsive chrome used by every page:

- **Mobile (<768px):** single column, fixed bottom nav.
- **Tablet (768–1024px):** wider content, bottom nav.
- **Desktop (≥1024px):** expanded left sidebar + sticky top bar; the dashboard
  uses a three-column layout.

Navigation links: Dashboard `/dashboard`, Log Food `/log`, Workouts `/workouts`,
Progress `/progress`, **AI Coach `/coach`** (new chat page backed by
`POST /api/ai/chat`), Profile `/profile`.

## Chunk 7 — AI Coach, notifications & advanced features

### AI Coach (`/coach`, spec 7.1)

- **System prompt** injects profile summary, current-week food logs, and active
  workout plan via `server/src/services/coachContext.ts`.
- **Streaming:** `POST /api/ai/chat/stream` (SSE) with token deltas; local
  fallback simulates streaming when `ANTHROPIC_API_KEY` is unset.
- **Client:** message history in `localStorage` (`fueliq.coach.messages`), spec
  quick-prompt chips, `ChatMarkdown` for `**bold**`, `` `inline` ``, and fenced
  code blocks for meal/exercise lists.
- Legacy non-streaming `POST /api/ai/chat` still works.

### Smart notifications (spec 7.2, frontend only)

- Browser **Notification API** — settings on `/profile` (`NotificationSettingsPanel`).
- Daily log reminder (user-chosen time), **2:00 PM lunch nudge** if lunch empty,
  **Sunday 8–10 AM** weekly review ping, **PR alerts** during active workouts.
- Scheduler: `useSmartNotifications` mounted globally via `AppNotifications`.

### Barcode scanner (spec 7.3)

- `html5-qrcode` camera scan in the food search modal → Open Food Facts lookup →
  serving config. On miss: **Scan again** / **Search manually** fallback.

### MyFitnessPal import (spec 7.4)

- `POST /api/import/mfp` with `{ csv }` body — parses MFP diary CSV, imports
  entries with retroactive FuelScores. UI on Profile → **Import CSV**.

### Supplement tracker (spec 7.5)

- Tables `supplements`, `supplement_logs`; API `/api/supplements` (CRUD + daily log).
- Profile UI: daily check-off, per-supplement streak, dose/notes.

## Chunk 8 — Project setup & build order

See **[SETUP.md](./SETUP.md)** for:

- Exact `npm install` commands (clone path + greenfield spec 8.1)
- Full monorepo folder tree with spec name → actual file mapping
- **29-step build order** for Cursor (backend → frontend → polish)
- Third-party API matrix (OFF, Claude, wger)
- Performance checklist and “what makes FuelIQ different” summary

## Notes

- `better-sqlite3` is a native module; `npm install` compiles it. On macOS you
  may need Xcode Command Line Tools (`xcode-select --install`).
- The SQLite database is created at `server/data/fueliq.db` on first run.
