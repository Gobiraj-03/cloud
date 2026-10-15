const db = require('../config/database');

class HealthRepository {
  /**
   * Pings the active database connection to verify responsiveness.
   * Returns { alive: boolean, tableCount: number, error: string | null }
   */
  async checkDatabaseHealth() {
    try {
      const pingResult = await db.get('SELECT 1 AS alive');
      if (!pingResult || (pingResult.alive !== 1 && pingResult.alive !== '1')) {
        return { alive: false, tableCount: 0, error: 'Database ping returned unexpected value' };
      }

      // Fetch count of application tables dynamically based on active client engine
      const isPostgres = db.getClientType() === 'postgres';
      const tableCountQuery = isPostgres
        ? "SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public';"
        : "SELECT count(*) as count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';";

      const tables = await db.query(tableCountQuery);

      return {
        alive: true,
        tableCount: tables[0] ? Number(tables[0].count) : 0,
        engine: isPostgres ? 'PostgreSQL' : 'SQLite 3',
        error: null
      };
    } catch (err) {
      const isPostgres = db.getClientType() === 'postgres';
      return {
        alive: false,
        tableCount: 0,
        engine: isPostgres ? 'PostgreSQL' : 'SQLite 3',
        error: err.message
      };
    }
  }

  getEngineName() {
    return db.getClientType() === 'postgres' ? 'PostgreSQL' : 'SQLite 3';
  }
}

module.exports = new HealthRepository();
