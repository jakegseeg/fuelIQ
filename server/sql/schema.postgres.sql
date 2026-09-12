-- ============================================================================
-- FuelIQ — canonical PostgreSQL schema (production target).
--
-- Local development uses SQLite (server/src/db/index.ts) for zero-config setup;
-- this file is the authoritative Postgres DDL referenced by DATABASE_URL. The
-- column names here are the source of truth; the SQLite layer mirrors them.
--
-- Apply with:  psql "$DATABASE_URL" -f server/sql/schema.postgres.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- Users -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profile & biometrics --------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name             TEXT,
  dob              DATE,
  sex              TEXT,
  height_cm        DOUBLE PRECISION,
  weight_kg        DOUBLE PRECISION,
  goal             TEXT,
  activity_level   TEXT,
  diet_preferences TEXT[] NOT NULL DEFAULT '{}',
  custom_dietary   TEXT,
  target_weight_kg DOUBLE PRECISION,
  target_date      DATE,
  unit_system      TEXT NOT NULL DEFAULT 'imperial', -- imperial | metric
  unit_weight      TEXT NOT NULL DEFAULT 'lbs',
  unit_height      TEXT NOT NULL DEFAULT 'imperial',
  unit_energy      TEXT NOT NULL DEFAULT 'kcal',
  bmr              DOUBLE PRECISION,
  tdee             DOUBLE PRECISION,
  calorie_target   INTEGER,
  protein_target_g INTEGER,
  carbs_target_g   INTEGER,
  fat_target_g     INTEGER,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily food log --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS food_log_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_date    DATE NOT NULL,
  meal_type      TEXT NOT NULL,                 -- breakfast | lunch | dinner | snacks
  food_name      TEXT NOT NULL,
  food_id        TEXT,                          -- Open Food Facts code / custom id
  brand          TEXT,
  source         TEXT NOT NULL DEFAULT 'off',   -- off | custom | recipe
  serving_label  TEXT,
  serving_size_g DOUBLE PRECISION,
  -- per-100g nutrition retained so entries can be rescaled / re-logged
  per_100g       JSONB NOT NULL DEFAULT '{}'::jsonb,
  nova_group     SMALLINT,
  calories       DOUBLE PRECISION,
  protein_g      DOUBLE PRECISION,
  carbs_g        DOUBLE PRECISION,
  fat_g          DOUBLE PRECISION,
  fiber_g        DOUBLE PRECISION,
  sugar_g        DOUBLE PRECISION,
  fuel_score     INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_food_log_user_date ON food_log_entries(user_id, logged_date);
CREATE INDEX IF NOT EXISTS idx_food_log_user_name ON food_log_entries(user_id, food_name);

-- Water log -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS water_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_date DATE NOT NULL,
  amount_oz   DOUBLE PRECISION NOT NULL,
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_water_user_date ON water_log(user_id, logged_date);

-- Workout plans ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workout_plans (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_name  TEXT,
  plan_json  JSONB NOT NULL,
  input_json JSONB,
  source     TEXT NOT NULL DEFAULT 'local',     -- claude | local
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plans_user_active ON workout_plans(user_id, is_active);

-- Workout sessions ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workout_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id         UUID REFERENCES workout_plans(id) ON DELETE SET NULL,
  logged_date     DATE NOT NULL,
  focus           TEXT,
  type            TEXT,
  duration_min    INTEGER,
  calories_burned INTEGER,
  session_json    JSONB NOT NULL DEFAULT '[]'::jsonb, -- sets/reps/weights per exercise
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wlogs_user_date ON workout_logs(user_id, logged_date);

-- Weight log ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weight_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_date DATE NOT NULL,
  weight_kg   DOUBLE PRECISION NOT NULL,
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, logged_date)
);
CREATE INDEX IF NOT EXISTS idx_weight_user_date ON weight_log(user_id, logged_date);

-- Meal templates --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meal_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  entries    JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of food_log_entry-like objects
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recipes ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recipes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  servings        INTEGER NOT NULL DEFAULT 1,
  ingredients     JSONB NOT NULL DEFAULT '[]'::jsonb,
  per_serving     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Custom foods (saved manual entries for reuse) -------------------------------
CREATE TABLE IF NOT EXISTS custom_foods (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  brand      TEXT,
  per_100g   JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_custom_foods_user ON custom_foods(user_id);

-- Progress photos -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS progress_photos (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename  TEXT NOT NULL,
  weight_kg DOUBLE PRECISION,
  taken_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily AI insights (dashboard) -----------------------------------------------
CREATE TABLE IF NOT EXISTS daily_insights (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_date DATE NOT NULL,
  content    TEXT NOT NULL,
  source     TEXT NOT NULL DEFAULT 'local',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, logged_date)
);

-- Weekly check-ins ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weekly_checkins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  content    TEXT NOT NULL,
  source     TEXT NOT NULL DEFAULT 'local',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);
