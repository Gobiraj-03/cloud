const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

let dbInstance = null;
let currentDbPath = null;

/**
 * Resolves the absolute database file path from environment variables or default.
 */
function resolveDbPath(customPath = null) {
  if (customPath) return customPath;
  const envPath = process.env.DB_PATH;
  if (!envPath) {
    return path.resolve(__dirname, '../../../data/asset_management.db');
  }
  if (path.isAbsolute(envPath)) {
    return envPath;
  }
  return path.resolve(process.cwd(), envPath);
}

/**
 * Initializes and returns the active SQLite database connection.
 * Guarantees foreign key enforcement and WAL journal mode.
 */
function getDb(customPath = null) {
  const targetPath = resolveDbPath(customPath);

  // If already connected to the same target path, return instance
  if (dbInstance && currentDbPath === targetPath) {
    return dbInstance;
  }

  // If connected to a different target, close previous first
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // ignore close error on switch
    }
    dbInstance = null;
  }

  // Ensure parent directory exists for file-based databases
  if (targetPath !== ':memory:') {
    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
  }

  currentDbPath = targetPath;
  dbInstance = new sqlite3.Database(targetPath, (err) => {
    if (err) {
      console.error(`[Database] Failed to open SQLite database at ${targetPath}:`, err.message);
    }
  });

  // Enable foreign keys and WAL mode synchronously on each new connection
  dbInstance.serialize(() => {
    dbInstance.run('PRAGMA foreign_keys = ON;', (err) => {
      if (err) {
        console.error('[Database] Failed to enable PRAGMA foreign_keys:', err.message);
      }
    });
    if (targetPath !== ':memory:') {
      dbInstance.run('PRAGMA journal_mode = WAL;');
    }
  });

  return dbInstance;
}

/**
 * Executes a parameterized SQL query returning all matching rows.
 */
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

/**
 * Executes a parameterized SQL query returning a single row.
 */
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

/**
 * Executes a parameterized INSERT, UPDATE, or DELETE SQL statement.
 * Resolves with { lastID, changes }.
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Executes raw multi-statement SQL scripts (DDL schema scripts).
 */
function exec(sql) {
  return new Promise((resolve, reject) => {
    getDb().exec(sql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

/**
 * Executes an asynchronous function within a database transaction.
 * Automatically performs COMMIT on success or ROLLBACK on failure.
 */
async function transaction(actionFn) {
  await run('BEGIN TRANSACTION');
  try {
    const result = await actionFn({ query, get, run });
    await run('COMMIT');
    return result;
  } catch (error) {
    try {
      await run('ROLLBACK');
    } catch {
      // rollback error suppressed
    }
    throw error;
  }
}

/**
 * Performs a live connectivity check.
 */
async function isAlive() {
  try {
    const row = await get('SELECT 1 AS alive');
    return Boolean(row && row.alive === 1);
  } catch {
    return false;
  }
}

/**
 * Closes the active database connection.
 */
function close() {
  return new Promise((resolve, reject) => {
    if (!dbInstance) return resolve();
    dbInstance.close((err) => {
      dbInstance = null;
      currentDbPath = null;
      if (err) return reject(err);
      resolve();
    });
  });
}

module.exports = {
  getDb,
  query,
  get,
  run,
  exec,
  transaction,
  isAlive,
  close,
  resolveDbPath
};
