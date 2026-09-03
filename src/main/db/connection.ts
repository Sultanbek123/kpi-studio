import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { runMigrations } from './migrations'

let db: Database.Database | null = null

/** The one and only SQLite connection for the app. A single local file —
 * nothing here ever touches the network. */
export function getDb(): Database.Database {
  if (db) return db

  const dbPath = join(app.getPath('userData'), 'kpi-studio.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  runMigrations(db)
  return db
}

export function closeDb(): void {
  db?.close()
  db = null
}
