export const MIGRATIONS: ReadonlyArray<{ version: number; sql: string }> = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        accuracy REAL,
        altitude REAL,
        speed REAL,
        heading REAL,
        recorded_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        uploaded_at TEXT,
        sync_status TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_locations_sync_status ON locations (sync_status);
      CREATE INDEX IF NOT EXISTS idx_locations_recorded_at ON locations (recorded_at);
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `,
  },
  {
    version: 2,
    sql: `
      CREATE TABLE IF NOT EXISTS uploads (
        id TEXT PRIMARY KEY,
        local_uri TEXT NOT NULL,
        file_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        uploaded_at TEXT,
        drive_file_id TEXT,
        sync_status TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_uploads_sync_status ON uploads (sync_status);
    `,
  },
  {
    version: 3,
    sql: `
      CREATE TABLE IF NOT EXISTS debug_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `,
  },
];
