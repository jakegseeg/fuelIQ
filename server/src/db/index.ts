/**
 * SQLite database using sql.js (pure JS — works with Node v26+).
 * Drop-in replacement for better-sqlite3.
 */
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dataDir as resolveDataDir } from '../runtimePaths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = resolveDataDir(path.resolve(__dirname, '../../data'));
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'fueliq.db');
const sqlWasmPath =
  [
    path.resolve(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm'),
    path.resolve(__dirname, '../../../node_modules/sql.js/dist/sql-wasm.wasm'),
    path.resolve(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm'),
  ].find(fs.existsSync) || 'sql-wasm.wasm';

// sql.js is async — we initialise once and export a ready promise
const SQL = await initSqlJs({
  locateFile: (file) => (file === 'sql-wasm.wasm' ? sqlWasmPath : file),
});

let _db: SqlJsDatabase;

function loadDb(): SqlJsDatabase {
  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    return new SQL.Database(buf);
  }
  return new SQL.Database();
}

_db = loadDb();

// Persist to disk after every write so data survives restarts
function save() {
  const data = _db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

// Thin wrappers that mirror the better-sqlite3 surface used by routes
export const db = {
  /** Run a statement that returns no rows (INSERT / UPDATE / DELETE / CREATE) */
  run(sql: string, params: unknown[] = []) {
    _db.run(sql, params as any);
    save();
  },

  /** Return all matching rows */
  all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
    const stmt = _db.prepare(sql);
    stmt.bind(params as any);
    const rows: T[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return rows;
  },

  /** Return the first matching row or undefined */
  get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
    const rows = db.all<T>(sql, params);
    return rows[0];
  },

  /** Execute a multi-statement SQL string (schema setup) */
  exec(sql: string) {
    _db.exec(sql);
    save();
  },

  /** Expose the raw sql.js instance if needed */
  raw: () => _db,
};

// ── Schema ────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT    PRIMARY KEY,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_profiles (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id            TEXT    NOT NULL UNIQUE,
    first_name         TEXT    NOT NULL,
    date_of_birth      TEXT    NOT NULL,
    biological_sex     TEXT    NOT NULL,
    height_cm          REAL    NOT NULL,
    weight_kg          REAL    NOT NULL,
    goal               TEXT    NOT NULL,
    activity_level     TEXT    NOT NULL,
    dietary_preferences TEXT   NOT NULL DEFAULT '[]',
    custom_dietary      TEXT,
    target_weight_kg   REAL,
    target_date        TEXT,
    unit_weight        TEXT    NOT NULL DEFAULT 'lbs',
    unit_height        TEXT    NOT NULL DEFAULT 'imperial',
    unit_energy        TEXT    NOT NULL DEFAULT 'kcal',
    bmr                REAL    NOT NULL DEFAULT 0,
    tdee               REAL    NOT NULL DEFAULT 0,
    calorie_target     REAL    NOT NULL DEFAULT 0,
    protein_g          REAL    NOT NULL DEFAULT 0,
    fat_g              REAL    NOT NULL DEFAULT 0,
    carbs_g            REAL    NOT NULL DEFAULT 0,
    created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS progress_photos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT    NOT NULL,
    filename    TEXT    NOT NULL,
    weight_kg   REAL,
    taken_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS food_log_entries (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id              TEXT    NOT NULL,
    log_date             TEXT    NOT NULL,
    meal                 TEXT    NOT NULL,
    source               TEXT    NOT NULL DEFAULT 'off',
    name                 TEXT    NOT NULL,
    brand                TEXT,
    barcode              TEXT,
    serving_label        TEXT    NOT NULL,
    quantity_g           REAL    NOT NULL,
    cal_100g             REAL    NOT NULL DEFAULT 0,
    protein_100g         REAL    NOT NULL DEFAULT 0,
    carbs_100g           REAL    NOT NULL DEFAULT 0,
    fat_100g             REAL    NOT NULL DEFAULT 0,
    fiber_100g           REAL,
    sugars_100g          REAL,
    added_sugars_100g    REAL,
    sat_fat_100g         REAL,
    sodium_100g          REAL,
    nova_group           INTEGER,
    micronutrient_count  INTEGER NOT NULL DEFAULT 0,
    calories             REAL    NOT NULL DEFAULT 0,
    protein              REAL    NOT NULL DEFAULT 0,
    carbs                REAL    NOT NULL DEFAULT 0,
    fat                  REAL    NOT NULL DEFAULT 0,
    fuel_score           REAL    NOT NULL DEFAULT 0,
    created_at           TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS water_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT    NOT NULL,
    log_date   TEXT    NOT NULL,
    oz         REAL    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS meal_templates (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT    NOT NULL,
    name       TEXT    NOT NULL,
    items_json TEXT    NOT NULL DEFAULT '[]',
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recipes (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          TEXT    NOT NULL,
    name             TEXT    NOT NULL,
    servings         REAL    NOT NULL DEFAULT 1,
    ingredients_json TEXT    NOT NULL DEFAULT '[]',
    calories         REAL    NOT NULL DEFAULT 0,
    protein          REAL    NOT NULL DEFAULT 0,
    carbs            REAL    NOT NULL DEFAULT 0,
    fat              REAL    NOT NULL DEFAULT 0,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS workout_plans (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT    NOT NULL,
    plan_json  TEXT    NOT NULL,
    input_json TEXT    NOT NULL DEFAULT '{}',
    source     TEXT    NOT NULL DEFAULT 'local',
    is_active  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS workout_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         TEXT    NOT NULL,
    log_date        TEXT    NOT NULL,
    focus           TEXT    NOT NULL DEFAULT 'Workout',
    type            TEXT    NOT NULL DEFAULT 'weight_training',
    duration_min    REAL    NOT NULL DEFAULT 0,
    calories_burned REAL    NOT NULL DEFAULT 0,
    sets_json       TEXT    NOT NULL DEFAULT '[]',
    total_sets      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS weight_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT    NOT NULL,
    log_date   TEXT    NOT NULL,
    weight_kg  REAL    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS daily_insights (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT    NOT NULL,
    log_date   TEXT    NOT NULL,
    content    TEXT    NOT NULL,
    source     TEXT    NOT NULL DEFAULT 'local',
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS custom_foods (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             TEXT    NOT NULL,
    name                TEXT    NOT NULL,
    brand               TEXT,
    per100_json         TEXT    NOT NULL,
    nova_group          INTEGER,
    micronutrient_count INTEGER NOT NULL DEFAULT 0,
    created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS weekly_checkins (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT    NOT NULL,
    week_start TEXT    NOT NULL,
    content    TEXT    NOT NULL,
    source     TEXT    NOT NULL DEFAULT 'local',
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS supplements (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT    NOT NULL,
    name       TEXT    NOT NULL,
    dose       TEXT,
    notes      TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS supplement_logs (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        TEXT    NOT NULL,
    supplement_id  INTEGER NOT NULL,
    log_date       TEXT    NOT NULL,
    notes          TEXT,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS grocery_plans (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id           TEXT    NOT NULL,
    budget            REAL    NOT NULL,
    household_size    INTEGER NOT NULL,
    location          TEXT    NOT NULL,
    week_start        TEXT    NOT NULL,
    meal_plan_json    TEXT    NOT NULL,
    grocery_list_json TEXT    NOT NULL,
    meta_json         TEXT,
    total_cost        REAL    NOT NULL,
    created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recipe_cache (
    id         INTEGER PRIMARY KEY CHECK (id = 1),
    pool_json  TEXT    NOT NULL,
    updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS exercise_cache (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    wger_id          INTEGER NOT NULL UNIQUE,
    name             TEXT    NOT NULL,
    description      TEXT    NOT NULL DEFAULT '',
    category_name    TEXT    NOT NULL DEFAULT '',
    primary_muscles  TEXT    NOT NULL DEFAULT '[]',
    secondary_muscles TEXT   NOT NULL DEFAULT '[]',
    equipment        TEXT    NOT NULL DEFAULT '[]',
    cached_at        TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS exercise_cache_meta (
    id         INTEGER PRIMARY KEY CHECK (id = 1),
    synced_at  TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS exercise_rotations (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id           TEXT    NOT NULL,
    rotation_group    TEXT    NOT NULL,
    current_index     INTEGER NOT NULL DEFAULT 0,
    last_rotated_date TEXT    NOT NULL,
    UNIQUE(user_id, rotation_group)
  );

  CREATE TABLE IF NOT EXISTS custom_splits (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT    NOT NULL,
    split_json TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// Lightweight migrations for existing databases
const profileCols = db.all<{ name: string }>('PRAGMA table_info(user_profiles)');
if (!profileCols.some((c) => c.name === 'workout_schedule_json')) {
  db.run('ALTER TABLE user_profiles ADD COLUMN workout_schedule_json TEXT');
}
if (!profileCols.some((c) => c.name === 'pantry_json')) {
  db.run('ALTER TABLE user_profiles ADD COLUMN pantry_json TEXT');
}
if (!profileCols.some((c) => c.name === 'preferred_workout_duration')) {
  db.run('ALTER TABLE user_profiles ADD COLUMN preferred_workout_duration INTEGER DEFAULT 45');
}
if (!profileCols.some((c) => c.name === 'equipment_available')) {
  db.run('ALTER TABLE user_profiles ADD COLUMN equipment_available TEXT DEFAULT \'["full_gym"]\'');
}
if (!profileCols.some((c) => c.name === 'fitness_level')) {
  db.run('ALTER TABLE user_profiles ADD COLUMN fitness_level TEXT DEFAULT \'intermediate\'');
}

const wlogCols = db.all<{ name: string }>('PRAGMA table_info(workout_logs)');
if (!wlogCols.some((c) => c.name === 'notes')) {
  db.run('ALTER TABLE workout_logs ADD COLUMN notes TEXT');
}
if (!wlogCols.some((c) => c.name === 'log_source')) {
  db.run("ALTER TABLE workout_logs ADD COLUMN log_source TEXT DEFAULT 'plan'");
}

console.log('✅ Database ready at', dbPath);
