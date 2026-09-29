// SQLite database layer using Node's built-in node:sqlite (no external deps).
const path = require('node:path');
const fs = require('node:fs');

// node:sqlite shipped in Node 22.5 behind --experimental-sqlite and was only
// unflagged in a later release. On a host still on an early 22.x this require
// throws ERR_UNKNOWN_BUILTIN_MODULE, which says nothing useful, so explain it.
let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch (err) {
  console.error(
    [
      '',
      `This app needs Node's built-in SQLite module, which ${process.version} did not provide.`,
      '',
      'Either start Node with the flag:            node --experimental-sqlite src/server.js',
      'or, on a hosting panel, set the variable:   NODE_OPTIONS=--experimental-sqlite',
      'or run a Node release where it is unflagged (23.4+, or a late 22.x LTS).',
      '',
    ].join('\n')
  );
  process.exit(1);
}

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'worktrack.db');
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','employee')),
  phone TEXT DEFAULT '',
  street TEXT DEFAULT '',
  city TEXT DEFAULT '',
  postalCode TEXT DEFAULT '',
  country TEXT DEFAULT '',
  dateOfBirth TEXT DEFAULT '',
  jobTitle TEXT DEFAULT '',
  department TEXT DEFAULT '',
  language TEXT DEFAULT 'English',
  active INTEGER NOT NULL DEFAULT 1,
  mustChangePassword INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  expiresAt TEXT NOT NULL
);

-- Single-use "forgot password" tokens. Only the SHA-256 of the token is kept,
-- so a copy of this database does not let anyone reset an account.
CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tokenHash TEXT NOT NULL UNIQUE,
  expiresAt TEXT NOT NULL,
  usedAt TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  countsAsWorked INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  sortOrder INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS time_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  hours REAL NOT NULL,
  taskTypeId INTEGER REFERENCES task_types(id),
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','approved','rejected')),
  reviewedBy INTEGER REFERENCES users(id),
  reviewedAt TEXT,
  rejectionReason TEXT DEFAULT '',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(userId, date)
);

CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timeEntryId INTEGER NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storedName TEXT NOT NULL,
  mimeType TEXT DEFAULT '',
  size INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  payCycleLengthDays INTEGER NOT NULL DEFAULT 14,
  payCycleReferenceDate TEXT NOT NULL DEFAULT '2026-01-05',
  overtimeWeeklyThreshold REAL NOT NULL DEFAULT 40,
  notifyNewAccount INTEGER NOT NULL DEFAULT 1,
  notifyApproval INTEGER NOT NULL DEFAULT 1,
  notifyRejection INTEGER NOT NULL DEFAULT 1,
  companyName TEXT NOT NULL DEFAULT 'Orthoclic'
);
`);

// Migration: add dateOfBirth to users created before this column existed.
const userColumns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (!userColumns.includes('dateOfBirth')) {
  db.exec("ALTER TABLE users ADD COLUMN dateOfBirth TEXT DEFAULT ''");
}

// Migration: shift start/end and unpaid break, for entries logged as a shift
// rather than a bare number of hours. `hours` stays the figure everything else
// reads; when the times are given it is derived from them. Entries logged
// before this, and ones for a task with no shift, simply leave these empty.
// Migration: drop UNIQUE(userId, date), which allowed only one entry per person
// per day. SQLite cannot remove a constraint in place, so the table is rebuilt.
// Row ids are carried over deliberately — attachments reference them.
const entryIndexes = db.prepare("PRAGMA index_list('time_entries')").all();
if (entryIndexes.some((i) => i.origin === 'u')) {
  const cols = db.prepare('PRAGMA table_info(time_entries)').all().map((c) => c.name);
  const shared = cols.join(', ');
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('BEGIN;');
  try {
    db.exec(`
      CREATE TABLE time_entries_rebuilt (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        hours REAL NOT NULL,
        taskTypeId INTEGER REFERENCES task_types(id),
        notes TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','approved','rejected')),
        reviewedBy INTEGER REFERENCES users(id),
        reviewedAt TEXT,
        rejectionReason TEXT DEFAULT '',
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        startTime TEXT DEFAULT '',
        endTime TEXT DEFAULT '',
        breakMinutes INTEGER NOT NULL DEFAULT 0
      );
    `);
    db.exec(`INSERT INTO time_entries_rebuilt (${shared}) SELECT ${shared} FROM time_entries;`);
    db.exec('DROP TABLE time_entries;');
    db.exec('ALTER TABLE time_entries_rebuilt RENAME TO time_entries;');
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON time_entries(userId, date);');
}

const entryColumns = db.prepare('PRAGMA table_info(time_entries)').all().map((c) => c.name);
if (!entryColumns.includes('startTime')) {
  db.exec("ALTER TABLE time_entries ADD COLUMN startTime TEXT DEFAULT ''");
}
if (!entryColumns.includes('endTime')) {
  db.exec("ALTER TABLE time_entries ADD COLUMN endTime TEXT DEFAULT ''");
}
if (!entryColumns.includes('breakMinutes')) {
  db.exec('ALTER TABLE time_entries ADD COLUMN breakMinutes INTEGER NOT NULL DEFAULT 0');
}

// Ensure singleton settings row exists.
const settingsRow = db.prepare('SELECT id FROM settings WHERE id = 1').get();
if (!settingsRow) {
  db.prepare(
    `INSERT INTO settings (id, payCycleLengthDays, payCycleReferenceDate, overtimeWeeklyThreshold)
     VALUES (1, 14, '2026-01-05', 40)`
  ).run();
}

module.exports = db;
