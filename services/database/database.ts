import * as SQLite from 'expo-sqlite';

import { DATABASE_NAME } from '@/config/constants';
import { MIGRATIONS } from '@/services/database/migrations';
import { AppError } from '@/types/errors';

type SqlValue = string | number | null | boolean;
type SqlParams = SqlValue[];

let database: SQLite.SQLiteDatabase | null = null;
let opening: Promise<SQLite.SQLiteDatabase> | null = null;

/** Single-flight mutex — GPS, sync, and UI must never touch SQLite in parallel. */
let queueTail: Promise<void> = Promise.resolve();

function isBusyError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /database is locked|SQLITE_BUSY|already released|finalizeAsync|NullPointerException/i.test(
    message,
  );
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function configureConnection(db: SQLite.SQLiteDatabase): Promise<void> {
  // WAL allows readers during writes; busy_timeout waits instead of failing.
  await db.execAsync(`
    PRAGMA busy_timeout = 15000;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA temp_store = MEMORY;
  `);
}

async function applyMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let current = row?.user_version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) {
      continue;
    }
    await db.execAsync('BEGIN IMMEDIATE');
    try {
      await db.execAsync(migration.sql);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
      await db.execAsync('COMMIT');
      current = migration.version;
    } catch (error) {
      try {
        await db.execAsync('ROLLBACK');
      } catch {
        // ignore rollback failures
      }
      throw error;
    }
  }
}

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) {
    return database;
  }
  if (opening) {
    return opening;
  }

  opening = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME, {
        // Keep one shared native connection for the whole JS runtime.
        useNewConnection: false,
      });
      await configureConnection(db);
      await applyMigrations(db);
      database = db;
      return db;
    } catch (error) {
      database = null;
      throw new AppError('sqlite_error', 'Failed to open local database', error);
    } finally {
      opening = null;
    }
  })();

  return opening;
}

/**
 * Run exclusive DB work. Always use this — never call runAsync/get*Async on a raw handle
 * from outside this queue.
 */
export function withDatabase<T>(fn: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
  const run = queueTail.then(async () => {
    const db = await openDatabase();
    let lastError: unknown;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        // Tiny gap after contested access so native finalize can finish.
        if (attempt > 0) {
          await sleep(50 * attempt * attempt);
        }
        return await fn(db);
      } catch (error) {
        lastError = error;
        if (!isBusyError(error) || attempt === 7) {
          throw error;
        }
      }
    }
    throw lastError;
  });

  // Keep the queue moving even when a job fails.
  queueTail = run.then(
    () => undefined,
    () => undefined,
  );

  return run;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  return withDatabase(async (db) => db);
}

export function dbRun(sql: string, params: SqlParams = []): Promise<SQLite.SQLiteRunResult> {
  return withDatabase((db) => db.runAsync(sql, params));
}

export function dbGetFirst<T>(sql: string, params: SqlParams = []): Promise<T | null> {
  return withDatabase((db) => db.getFirstAsync<T>(sql, params));
}

export function dbGetAll<T>(sql: string, params: SqlParams = []): Promise<T[]> {
  return withDatabase((db) => db.getAllAsync<T>(sql, params));
}

export function dbExec(sql: string): Promise<void> {
  return withDatabase((db) => db.execAsync(sql));
}

export async function getDatabaseHealth(): Promise<{
  ok: boolean;
  schemaVersion: number;
  pageCount: number;
  pageSize: number;
  sizeBytes: number;
}> {
  return withDatabase(async (db) => {
    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const pageCount = await db.getFirstAsync<{ page_count: number }>('PRAGMA page_count');
    const pageSize = await db.getFirstAsync<{ page_size: number }>('PRAGMA page_size');
    const pages = pageCount?.page_count ?? 0;
    const size = pageSize?.page_size ?? 0;
    return {
      ok: true,
      schemaVersion: version?.user_version ?? 0,
      pageCount: pages,
      pageSize: size,
      sizeBytes: pages * size,
    };
  });
}

/** Soft-fail helper for fire-and-forget DB work (never becomes an uncaught rejection). */
export async function withDatabaseSafe<T>(
  fn: (db: SQLite.SQLiteDatabase) => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await withDatabase(fn);
  } catch (error) {
    if (isBusyError(error)) {
      return fallback;
    }
    throw error;
  }
}
