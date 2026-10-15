const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
require('dotenv').config();

let dbInstance = null;
let currentDbPath = null;
let pgPoolInstance = null;
let forcedClientType = null;

/**
 * Determines whether the active database client is 'postgres' or 'sqlite'.
 * Explicitly controlled via DB_CLIENT env var or auto-detected from DATABASE_URL.
 * Defaults strictly to 'sqlite' for local development.
 */
function getClientType() {
  if (forcedClientType) {
    return forcedClientType;
  }
  const explicitClient = (process.env.DB_CLIENT || '').toLowerCase().trim();
  if (explicitClient === 'postgres' || explicitClient === 'postgresql') {
    return 'postgres';
  }
  if (explicitClient === 'sqlite' || explicitClient === 'sqlite3') {
    return 'sqlite';
  }
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
    return 'postgres';
  }
  return 'sqlite';
}

/**
 * For test environments: allows forcing the client type dynamically.
 */
function setClientType(type) {
  forcedClientType = type;
}

/**
 * Translates ANSI/SQLite parameterized SQL queries into PostgreSQL-compatible SQL.
 * - Replaces positional '?' with '$1, $2, ...' strictly outside quotes, comments, and literals.
 * - Appends 'RETURNING id' to INSERT statements if not already present, enabling run() to capture lastID.
 * - Normalizes SQLite DATETIME('now') to standard CURRENT_TIMESTAMP.
 */
function translateSqlForPostgres(sql) {
  if (!sql || typeof sql !== 'string') return sql;

  let paramIndex = 1;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;
  let result = '';

  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    const next = sql[i + 1];

    // Comments handling
    if (!inSingleQuote && !inDoubleQuote) {
      if (!inLineComment && !inBlockComment && c === '-' && next === '-') {
        inLineComment = true;
        result += c;
        continue;
      }
      if (inLineComment && (c === '\n' || c === '\r')) {
        inLineComment = false;
        result += c;
        continue;
      }
      if (!inLineComment && !inBlockComment && c === '/' && next === '*') {
        inBlockComment = true;
        result += c;
        continue;
      }
      if (inBlockComment && c === '*' && next === '/') {
        inBlockComment = false;
        result += '*/';
        i++;
        continue;
      }
      if (inLineComment || inBlockComment) {
        result += c;
        continue;
      }
    }

    // Quotes handling
    if (c === "'" && !inDoubleQuote && !inLineComment && !inBlockComment) {
      if (inSingleQuote && next === "'") {
        result += "''";
        i++;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      result += c;
      continue;
    }

    if (c === '"' && !inSingleQuote && !inLineComment && !inBlockComment) {
      inDoubleQuote = !inDoubleQuote;
      result += c;
      continue;
    }

    // Replace parameter placeholder only outside quotes and comments
    if (c === '?' && !inSingleQuote && !inDoubleQuote && !inLineComment && !inBlockComment) {
      result += `$${paramIndex++}`;
    } else {
      result += c;
    }
  }

  // Normalization: Replace DATETIME('now') with CURRENT_TIMESTAMP for PostgreSQL
  result = result.replace(/DATETIME\s*\(\s*['"]now['"]\s*\)/gi, 'CURRENT_TIMESTAMP');

  return result;
}

/**
 * Builds PostgreSQL pool configuration from environment variables.
 */
function buildPostgresConfig() {
  if (process.env.DATABASE_URL) {
    const isProd = process.env.NODE_ENV === 'production';
    const useSsl = process.env.DB_SSL === 'true' || isProd;
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    };
  }

  const isProd = process.env.NODE_ENV === 'production';
  const useSsl = process.env.DB_SSL === 'true' || isProd;

  return {
    host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
    port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10),
    database: process.env.DB_NAME || process.env.PGDATABASE || 'assetflow',
    user: process.env.DB_USER || process.env.PGUSER || 'postgres',
    password: process.env.DB_PASSWORD || process.env.PGPASSWORD || '',
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  };
}

/**
 * Returns or initializes the active PostgreSQL pool.
 */
function getPool() {
  if (!pgPoolInstance) {
    const config = buildPostgresConfig();
    pgPoolInstance = new Pool(config);
    pgPoolInstance.on('error', (err) => {
      console.error('[Database:Postgres] Unexpected pool error on idle client:', err.message);
    });
  }
  return pgPoolInstance;
}

/**
 * For testing: allows injecting a mock or stub PostgreSQL pool.
 */
function setPool(mockPool) {
  pgPoolInstance = mockPool;
}

/**
 * Resolves the absolute database file path from environment variables or default (SQLite).
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

  if (dbInstance && currentDbPath === targetPath) {
    return dbInstance;
  }

  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // ignore close error on switch
    }
    dbInstance = null;
  }

  if (targetPath !== ':memory:') {
    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
  }

  currentDbPath = targetPath;
  dbInstance = new sqlite3.Database(targetPath, (err) => {
    if (err) {
      console.error(`[Database:SQLite] Failed to open database at ${targetPath}:`, err.message);
    }
  });

  dbInstance.serialize(() => {
    dbInstance.run('PRAGMA foreign_keys = ON;', (err) => {
      if (err) {
        console.error('[Database:SQLite] Failed to enable PRAGMA foreign_keys:', err.message);
      }
    });
    if (targetPath !== ':memory:') {
      dbInstance.run('PRAGMA journal_mode = WAL;');
    }
  });

  return dbInstance;
}

// -----------------------------------------------------------------------------
// UNIFIED QUERY API (Dynamically dispatches to SQLite or PostgreSQL)
// -----------------------------------------------------------------------------

/**
 * Executes a parameterized SQL query returning all matching rows as an array.
 */
function query(sql, params = []) {
  if (getClientType() === 'postgres') {
    const pool = getPool();
    const pgSql = translateSqlForPostgres(sql);
    return pool.query(pgSql, params).then((res) => res.rows);
  }

  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

/**
 * Executes a parameterized SQL query returning a single row (or null if none).
 */
function get(sql, params = []) {
  if (getClientType() === 'postgres') {
    const pool = getPool();
    const pgSql = translateSqlForPostgres(sql);
    return pool.query(pgSql, params).then((res) => (res.rows ? res.rows[0] : undefined));
  }

  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

/**
 * Executes a parameterized INSERT, UPDATE, or DELETE statement.
 * Resolves with normalized signature: { lastID, changes }.
 */
function run(sql, params = []) {
  if (getClientType() === 'postgres') {
    const pool = getPool();
    let pgSql = translateSqlForPostgres(sql);

    // If INSERT and no RETURNING clause exists, append RETURNING id to capture lastID
    const isInsert = /^\s*INSERT\s+INTO/i.test(pgSql);
    const hasReturning = /\bRETURNING\b/i.test(pgSql);
    if (isInsert && !hasReturning) {
      pgSql = pgSql.trim().replace(/;*$/, '') + ' RETURNING id;';
    }

    return pool.query(pgSql, params).then((res) => {
      const firstRow = res.rows && res.rows[0];
      const lastID = firstRow ? (firstRow.id ?? firstRow.lastid ?? null) : null;
      return {
        lastID,
        changes: res.rowCount || 0
      };
    });
  }

  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Executes raw multi-statement SQL scripts (DDL scripts).
 */
function exec(sql) {
  if (getClientType() === 'postgres') {
    const pool = getPool();
    return pool.query(sql).then(() => {});
  }

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
 * In PostgreSQL, checks out a dedicated client from the pool to guarantee transaction isolation.
 */
async function transaction(actionFn) {
  if (getClientType() === 'postgres') {
    const pool = getPool();
    const client = await pool.connect();
    await client.query('BEGIN');

    // Create client-scoped executors to run inside this transaction
    const txExecutor = {
      query: (sql, params = []) => {
        const pgSql = translateSqlForPostgres(sql);
        return client.query(pgSql, params).then((res) => res.rows);
      },
      get: (sql, params = []) => {
        const pgSql = translateSqlForPostgres(sql);
        return client.query(pgSql, params).then((res) => (res.rows ? res.rows[0] : undefined));
      },
      run: (sql, params = []) => {
        let pgSql = translateSqlForPostgres(sql);
        const isInsert = /^\s*INSERT\s+INTO/i.test(pgSql);
        const hasReturning = /\bRETURNING\b/i.test(pgSql);
        if (isInsert && !hasReturning) {
          pgSql = pgSql.trim().replace(/;*$/, '') + ' RETURNING id;';
        }
        return client.query(pgSql, params).then((res) => {
          const firstRow = res.rows && res.rows[0];
          const lastID = firstRow ? (firstRow.id ?? firstRow.lastid ?? null) : null;
          return {
            lastID,
            changes: res.rowCount || 0
          };
        });
      },
      exec: (sql) => {
        const pgSql = translateSqlForPostgres(sql);
        return client.query(pgSql);
      }
    };

    try {
      const result = await actionFn(txExecutor);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // suppress rollback error
      }
      throw error;
    } finally {
      client.release();
    }
  }

  // SQLite transaction execution
  await run('BEGIN TRANSACTION');
  try {
    const result = await actionFn({ query, get, run });
    await run('COMMIT');
    return result;
  } catch (error) {
    try {
      await run('ROLLBACK');
    } catch {
      // suppress rollback error
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
    return Boolean(row && (row.alive === 1 || row.alive === '1'));
  } catch {
    return false;
  }
}

/**
 * Closes the active database connection or connection pool cleanly.
 */
async function close() {
  if (getClientType() === 'postgres' && pgPoolInstance) {
    const pool = pgPoolInstance;
    pgPoolInstance = null;
    await pool.end();
    return;
  }

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
  getPool,
  setPool,
  getClientType,
  setClientType,
  buildPostgresConfig,
  translateSqlForPostgres,
  query,
  get,
  run,
  exec,
  transaction,
  isAlive,
  close,
  resolveDbPath
};
