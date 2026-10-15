const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/config/database');

test.beforeEach(() => {
  // Reset any forced client type or injected pool before each test
  db.setClientType(null);
  db.setPool(null);
});

test.afterEach(() => {
  db.setClientType(null);
  db.setPool(null);
});

test('1. Client type defaults to sqlite when no postgres configuration is active', () => {
  const originalClient = process.env.DB_CLIENT;
  const originalUrl = process.env.DATABASE_URL;
  delete process.env.DB_CLIENT;
  delete process.env.DATABASE_URL;

  try {
    assert.strictEqual(db.getClientType(), 'sqlite', 'Must default strictly to sqlite');
  } finally {
    if (originalClient !== undefined) process.env.DB_CLIENT = originalClient;
    if (originalUrl !== undefined) process.env.DATABASE_URL = originalUrl;
  }
});

test('2. Client type detects postgres from DB_CLIENT or DATABASE_URL', () => {
  const originalClient = process.env.DB_CLIENT;
  const originalUrl = process.env.DATABASE_URL;

  try {
    process.env.DB_CLIENT = 'postgres';
    delete process.env.DATABASE_URL;
    assert.strictEqual(db.getClientType(), 'postgres');

    process.env.DB_CLIENT = 'postgresql';
    assert.strictEqual(db.getClientType(), 'postgres');

    delete process.env.DB_CLIENT;
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/assetflow';
    assert.strictEqual(db.getClientType(), 'postgres');

    // Explicit sqlite overrides
    process.env.DB_CLIENT = 'sqlite';
    assert.strictEqual(db.getClientType(), 'sqlite');
  } finally {
    if (originalClient !== undefined) process.env.DB_CLIENT = originalClient;
    else delete process.env.DB_CLIENT;
    if (originalUrl !== undefined) process.env.DATABASE_URL = originalUrl;
    else delete process.env.DATABASE_URL;
  }
});

test('3. buildPostgresConfig parses connection parameters and SSL settings correctly', () => {
  const originalUrl = process.env.DATABASE_URL;
  const originalHost = process.env.DB_HOST;
  const originalPort = process.env.DB_PORT;
  const originalName = process.env.DB_NAME;
  const originalUser = process.env.DB_USER;
  const originalPass = process.env.DB_PASSWORD;
  const originalSsl = process.env.DB_SSL;

  try {
    delete process.env.DATABASE_URL;
    process.env.DB_HOST = 'custom-db.rds.amazonaws.com';
    process.env.DB_PORT = '5433';
    process.env.DB_NAME = 'custom_db';
    process.env.DB_USER = 'dbuser';
    process.env.DB_PASSWORD = 'dbpassword';
    process.env.DB_SSL = 'true';

    const config = db.buildPostgresConfig();
    assert.strictEqual(config.host, 'custom-db.rds.amazonaws.com');
    assert.strictEqual(config.port, 5433);
    assert.strictEqual(config.database, 'custom_db');
    assert.strictEqual(config.user, 'dbuser');
    assert.strictEqual(config.password, 'dbpassword');
    assert.deepStrictEqual(config.ssl, { rejectUnauthorized: false });
  } finally {
    if (originalUrl !== undefined) process.env.DATABASE_URL = originalUrl;
    else delete process.env.DATABASE_URL;
    if (originalHost !== undefined) process.env.DB_HOST = originalHost;
    else delete process.env.DB_HOST;
    if (originalPort !== undefined) process.env.DB_PORT = originalPort;
    else delete process.env.DB_PORT;
    if (originalName !== undefined) process.env.DB_NAME = originalName;
    else delete process.env.DB_NAME;
    if (originalUser !== undefined) process.env.DB_USER = originalUser;
    else delete process.env.DB_USER;
    if (originalPass !== undefined) process.env.DB_PASSWORD = originalPass;
    else delete process.env.DB_PASSWORD;
    if (originalSsl !== undefined) process.env.DB_SSL = originalSsl;
    else delete process.env.DB_SSL;
  }
});

test('4. translateSqlForPostgres accurately translates positional parameters to indexed placeholders', () => {
  const sql = 'SELECT * FROM assets WHERE category = ? AND status = ?';
  const translated = db.translateSqlForPostgres(sql);
  assert.strictEqual(translated, 'SELECT * FROM assets WHERE category = $1 AND status = $2');
});

test('5. translateSqlForPostgres leaves ? inside single quotes, escaped quotes, and comments untouched', () => {
  const queryWithLiteral = "SELECT * FROM assets WHERE name = ? AND notes = 'is this an asset? yes!' AND id = ?";
  const translated1 = db.translateSqlForPostgres(queryWithLiteral);
  assert.strictEqual(
    translated1,
    "SELECT * FROM assets WHERE name = $1 AND notes = 'is this an asset? yes!' AND id = $2"
  );

  // Escaped single quote
  const queryWithEscaped = "SELECT * FROM assets WHERE notes = 'it''s a question? maybe' AND tag = ?";
  const translated2 = db.translateSqlForPostgres(queryWithEscaped);
  assert.strictEqual(
    translated2,
    "SELECT * FROM assets WHERE notes = 'it''s a question? maybe' AND tag = $1"
  );

  // Line comment
  const queryWithComment = "SELECT * FROM assets WHERE id = ? -- Is this a comment? yes\n AND tag = ?";
  const translated3 = db.translateSqlForPostgres(queryWithComment);
  assert.strictEqual(
    translated3,
    "SELECT * FROM assets WHERE id = $1 -- Is this a comment? yes\n AND tag = $2"
  );

  // Block comment
  const queryWithBlock = "SELECT * FROM assets WHERE id = ? /* question? inside comment */ AND tag = ?";
  const translated4 = db.translateSqlForPostgres(queryWithBlock);
  assert.strictEqual(
    translated4,
    "SELECT * FROM assets WHERE id = $1 /* question? inside comment */ AND tag = $2"
  );
});

test('6. translateSqlForPostgres normalizes DATETIME(\'now\') to CURRENT_TIMESTAMP', () => {
  const sql = "INSERT INTO audit_logs (action, timestamp) VALUES (?, DATETIME('now'))";
  const translated = db.translateSqlForPostgres(sql);
  assert.strictEqual(
    translated,
    'INSERT INTO audit_logs (action, timestamp) VALUES ($1, CURRENT_TIMESTAMP)'
  );
});

test('7. Mock PostgreSQL pool executes query, get, run, and transaction accurately', async () => {
  db.setClientType('postgres');

  const executedQueries = [];
  const mockPool = {
    query: async (text, params) => {
      executedQueries.push({ text, params });
      if (text.startsWith('INSERT INTO administrators')) {
        return { rows: [{ id: 42 }], rowCount: 1 };
      }
      if (text.startsWith('UPDATE assets')) {
        return { rows: [], rowCount: 1 };
      }
      if (text.startsWith('SELECT id, username FROM administrators')) {
        return { rows: [{ id: 42, username: 'mockadmin' }], rowCount: 1 };
      }
      if (text.startsWith('SELECT * FROM assets')) {
        return { rows: [{ id: 1, asset_tag: 'AST-001' }, { id: 2, asset_tag: 'AST-002' }], rowCount: 2 };
      }
      if (text.startsWith('SELECT 1 AS alive')) {
        return { rows: [{ alive: 1 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    connect: async () => {
      const clientQueries = [];
      return {
        query: async (text, params) => {
          clientQueries.push({ text, params });
          executedQueries.push({ text, params, client: true });
          if (text.startsWith('INSERT INTO employees')) {
            return { rows: [{ id: 101 }], rowCount: 1 };
          }
          return { rows: [], rowCount: 1 };
        },
        release: () => {
          executedQueries.push({ text: 'CLIENT_RELEASED' });
        }
      };
    }
  };

  db.setPool(mockPool);

  // Test query()
  const rows = await db.query('SELECT * FROM assets WHERE category = ?', ['LAPTOP']);
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0].asset_tag, 'AST-001');

  // Test get()
  const single = await db.get('SELECT id, username FROM administrators WHERE id = ?', [42]);
  assert.strictEqual(single.username, 'mockadmin');

  // Test run() on INSERT (auto-appends RETURNING id)
  const insertRun = await db.run(
    'INSERT INTO administrators (username, email) VALUES (?, ?)',
    ['admin2', 'admin2@test.local']
  );
  assert.strictEqual(insertRun.lastID, 42);
  assert.strictEqual(insertRun.changes, 1);
  assert.ok(
    executedQueries.some((q) => q.text.includes('RETURNING id')),
    'INSERT statement sent to PostgreSQL must append RETURNING id'
  );

  // Test run() on UPDATE
  const updateRun = await db.run('UPDATE assets SET status = ? WHERE id = ?', ['ASSIGNED', 1]);
  assert.strictEqual(updateRun.changes, 1);

  // Test isAlive()
  const alive = await db.isAlive();
  assert.strictEqual(alive, true);

  // Test transaction() success
  const txResult = await db.transaction(async ({ run }) => {
    const res = await run('INSERT INTO employees (first_name) VALUES (?)', ['Alice']);
    return res.lastID;
  });
  assert.strictEqual(txResult, 101);
  assert.ok(executedQueries.some((q) => q.text === 'BEGIN'));
  assert.ok(executedQueries.some((q) => q.text === 'COMMIT'));
  assert.ok(executedQueries.some((q) => q.text === 'CLIENT_RELEASED'));

  // Test transaction() rollback on error
  await assert.rejects(
    async () => {
      await db.transaction(async ({ run }) => {
        await run('INSERT INTO employees (first_name) VALUES (?)', ['Bob']);
        throw new Error('Simulated transaction failure');
      });
    },
    /Simulated transaction failure/
  );
  assert.ok(executedQueries.some((q) => q.text === 'ROLLBACK'));
});
