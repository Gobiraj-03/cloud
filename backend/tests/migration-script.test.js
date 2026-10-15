const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const {
  runMigration,
  MIGRATION_TABLES,
  SERIAL_TABLES,
  buildInsertQuery
} = require('../src/scripts/migrate-sqlite-to-postgres');

const TEST_DB_PATH = path.resolve(__dirname, '../../data/asset_management.db');

test('1. MIGRATION_TABLES defines 8 tables in correct foreign-key topological order', () => {
  assert.strictEqual(MIGRATION_TABLES.length, 8);
  assert.strictEqual(MIGRATION_TABLES[0], 'administrators', 'administrators must be first');
  assert.strictEqual(MIGRATION_TABLES[1], 'employees', 'employees must precede assets and allocations');
  assert.strictEqual(MIGRATION_TABLES[2], 'assets', 'assets must precede assignment history');
  assert.strictEqual(MIGRATION_TABLES[3], 'asset_assignment_history');
  assert.strictEqual(MIGRATION_TABLES[4], 'software_licenses', 'software_licenses must precede allocations');
  assert.strictEqual(MIGRATION_TABLES[5], 'license_allocations');
  assert.strictEqual(MIGRATION_TABLES[6], 'audit_logs');
  assert.strictEqual(MIGRATION_TABLES[7], 'sessions');
});

test('2. buildInsertQuery creates properly quoted columns and numbered placeholders', () => {
  const sampleRows = [
    { id: 1, name: 'Laptop', cost: 1200.50 },
    { id: 2, name: 'Monitor', cost: 300.00 }
  ];

  const result = buildInsertQuery('assets', sampleRows);
  assert.ok(result, 'Result must not be null');
  assert.strictEqual(
    result.sql,
    'INSERT INTO "assets" ("id", "name", "cost") VALUES ($1, $2, $3), ($4, $5, $6);'
  );
  assert.deepStrictEqual(result.params, [1, 'Laptop', 1200.50, 2, 'Monitor', 300.00]);
});

test('3. buildInsertQuery returns null for empty or null row array', () => {
  assert.strictEqual(buildInsertQuery('assets', []), null);
  assert.strictEqual(buildInsertQuery('assets', null), null);
});

test('4. runMigration in dry-run mode validates records without writing to target', async () => {
  const result = await runMigration({
    execute: false,
    sqlitePath: TEST_DB_PATH
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.dryRun, true);
  assert.ok(result.totalRecords > 0, 'Must report positive record count');
  for (const table of MIGRATION_TABLES) {
    assert.ok(typeof result.sourceCounts[table] === 'number', `Must report count for ${table}`);
  }
});

test('5. runMigration with mock PostgreSQL pool executes transaction, inserts, sequence sync, and commit', async () => {
  const executedStatements = [];
  const tableCounts = {};

  const mockClient = {
    query: async (sql, params = []) => {
      executedStatements.push({ sql, params });

      // Table verification check
      if (sql.includes('information_schema.tables')) {
        return {
          rows: MIGRATION_TABLES.map((t) => ({ table_name: t })),
          rowCount: 8
        };
      }

      // Track inserts and count inserted rows
      if (sql.startsWith('INSERT INTO')) {
        const match = sql.match(/INSERT\s+INTO\s+"([^"]+)"/);
        const tableName = match ? match[1] : '';
        // Count number of value tuples in insert
        const tuplesCount = (sql.match(/\(/g) || []).length - 1; // subtract column list
        tableCounts[tableName] = (tableCounts[tableName] || 0) + tuplesCount;
        return { rows: [], rowCount: tuplesCount };
      }

      // Max ID query for sequences
      if (sql.includes('MAX(id)')) {
        return { rows: [{ max_id: 10 }], rowCount: 1 };
      }

      // Parity count check
      if (sql.includes('SELECT count(*)::int AS count FROM')) {
        const match = sql.match(/FROM\s+"([^"]+)"/);
        const tableName = match ? match[1] : '';
        const count = tableCounts[tableName] !== undefined ? tableCounts[tableName] : 0;
        return { rows: [{ count }], rowCount: 1 };
      }

      // General commit/begin
      return { rows: [], rowCount: params.length > 0 ? 1 : 0 };
    },
    release: () => {
      executedStatements.push({ sql: 'CLIENT_RELEASED' });
    }
  };

  const mockPool = {
    connect: async () => mockClient
  };

  // Run migration using mock pool and dry-run false
  const result = await runMigration({
    execute: true,
    sqlitePath: TEST_DB_PATH,
    pgPool: mockPool
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.dryRun, false);

  // Verify transaction boundaries
  const sqlCommands = executedStatements.map((e) => e.sql);
  assert.ok(sqlCommands.includes('BEGIN'), 'Must start transaction with BEGIN');
  assert.ok(sqlCommands.includes('COMMIT'), 'Must commit transaction with COMMIT');
  assert.ok(!sqlCommands.includes('ROLLBACK'), 'Must NOT execute ROLLBACK on success');
  assert.ok(sqlCommands.includes('CLIENT_RELEASED'), 'Must release client back to pool');
});

test('6. runMigration triggers ROLLBACK if target schema is missing required tables', async () => {
  const executedStatements = [];

  const mockClient = {
    query: async (sql) => {
      executedStatements.push(sql);
      if (sql.includes('information_schema.tables')) {
        // Return incomplete tables
        return { rows: [{ table_name: 'administrators' }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    release: () => {
      executedStatements.push('CLIENT_RELEASED');
    }
  };

  const mockPool = {
    connect: async () => mockClient
  };

  await assert.rejects(
    async () => {
      await runMigration({
        execute: true,
        sqlitePath: TEST_DB_PATH,
        pgPool: mockPool
      });
    },
    /Target PostgreSQL is missing required tables/
  );

  assert.ok(executedStatements.includes('ROLLBACK'), 'Must trigger ROLLBACK on missing schema');
  assert.ok(executedStatements.includes('CLIENT_RELEASED'), 'Must release client on error');
});
