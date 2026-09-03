import type Database from 'better-sqlite3'

/** Each entry bumps `PRAGMA user_version` by one when applied. Append-only —
 * never edit a migration that has already shipped, add a new one instead. */
const MIGRATIONS: string[] = [
  // 1: initial schema
  `
  CREATE TABLE campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    product TEXT,
    objective TEXT,
    start_date TEXT,
    end_date TEXT,
    currency TEXT NOT NULL DEFAULT 'KZT'
  );

  CREATE TABLE mapping_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    agency TEXT,
    header_row INTEGER NOT NULL,
    sheet_name_hint TEXT,
    column_map TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE sources (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    sheet TEXT NOT NULL,
    imported_at TEXT NOT NULL,
    template_id TEXT REFERENCES mapping_templates(id) ON DELETE SET NULL,
    row_count INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE placements (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    channel TEXT NOT NULL,
    platform TEXT,
    format TEXT,
    audience TEXT,
    start_date TEXT,
    end_date TEXT
  );
  CREATE INDEX idx_placements_campaign ON placements(campaign_id);

  CREATE TABLE metric_values (
    id TEXT PRIMARY KEY,
    placement_id TEXT NOT NULL REFERENCES placements(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('plan','fact')),
    metric TEXT NOT NULL,
    value REAL NOT NULL,
    source_id TEXT REFERENCES sources(id) ON DELETE SET NULL
  );
  CREATE INDEX idx_metric_values_placement ON metric_values(placement_id);
  CREATE INDEX idx_metric_values_date ON metric_values(date);
  `,

  // 2: metric_values becomes keyed on (placement, date, kind, metric) so a
  // re-import of an overlapping period UPDATEs the existing value instead
  // of inserting a duplicate that would double-count in every SUM(). Keeps
  // one row per key even if earlier imports (pre-migration) left dupes —
  // the most recently inserted row for each key wins, older ones are
  // dropped.
  `
  DELETE FROM metric_values
  WHERE id NOT IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY placement_id, date, kind, metric
        ORDER BY rowid DESC
      ) AS rn
      FROM metric_values
    )
    WHERE rn = 1
  );

  CREATE UNIQUE INDEX uq_metric_values_key ON metric_values(placement_id, date, kind, metric);
  `
]

export function runMigrations(db: Database.Database): void {
  db.pragma('foreign_keys = ON')
  const currentVersion = db.pragma('user_version', { simple: true }) as number

  for (let version = currentVersion; version < MIGRATIONS.length; version++) {
    const sql = MIGRATIONS[version]
    const apply = db.transaction(() => {
      db.exec(sql)
      db.pragma(`user_version = ${version + 1}`)
    })
    apply()
  }
}
