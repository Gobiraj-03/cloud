const db = require('../config/database');

class HealthRepository {
  /**
   * Pings the active database connection to verify responsiveness.
   * Returns { alive: boolean, tableCount: number, error: string | null }
   */
  async checkDatabaseHealth() {
    try {
      const pingResult = await db.get('SELECT 1 AS alive');
      if (!pingResult || pingResult.alive !== 1) {
        return { alive: false, tableCount: 0, error: 'Database ping returned unexpected value' };
      }

      // Fetch count of application tables
      const tables = await db.query(
        "SELECT count(*) as count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';"
      );

      return {
        alive: true,
        tableCount: tables[0] ? tables[0].count : 0,
        error: null
      };
    } catch (err) {
      return {
        alive: false,
        tableCount: 0,
        error: err.message
      };
    }
  }
}

module.exports = new HealthRepository();
