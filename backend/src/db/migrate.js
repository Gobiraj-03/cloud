const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const REQUIRED_TABLES = [
  'administrators',
  'employees',
  'assets',
  'asset_assignment_history',
  'software_licenses',
  'license_allocations',
  'audit_logs',
  'sessions'
];

/**
 * Executes the DDL schema file and verifies that all 7 required tables exist.
 */
async function migrate(customDbPath = null) {
  if (customDbPath) {
    db.getDb(customDbPath);
  } else {
    db.getDb();
  }

  const schemaPath = path.resolve(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at ${schemaPath}`);
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Execute DDL statements
  await db.exec(schemaSql);

  // Verify all 7 tables exist
  const existingTables = await db.query(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';"
  );
  const tableNames = existingTables.map((t) => t.name);

  const missingTables = REQUIRED_TABLES.filter((t) => !tableNames.includes(t));
  if (missingTables.length > 0) {
    throw new Error(`Migration verification failed. Missing tables: ${missingTables.join(', ')}`);
  }

  return {
    success: true,
    tables: tableNames,
    databasePath: db.resolveDbPath(customDbPath)
  };
}

// Enable direct CLI execution
if (require.main === module) {
  (async () => {
    try {
      console.log('[Migration] Initializing database schema...');
      const result = await migrate();
      console.log(`[Migration] Successfully verified ${result.tables.length} tables at ${result.databasePath}`);
      console.log('[Migration] Tables:', result.tables.join(', '));
      process.exit(0);
    } catch (err) {
      console.error('[Migration] Failed:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = { migrate, REQUIRED_TABLES };
