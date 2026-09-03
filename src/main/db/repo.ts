import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type {
  BaseMetric,
  ColumnMapping,
  MappingTemplate,
  MetricKind,
  MetricRow,
  NormalizedRow
} from '@shared/types'

export type { NormalizedRow }

export function findOrCreateCampaign(db: Database.Database, name: string): string {
  const existing = db.prepare('SELECT id FROM campaigns WHERE lower(name) = lower(?)').get(name) as
    { id: string } | undefined
  if (existing) return existing.id

  const id = randomUUID()
  db.prepare(
    `INSERT INTO campaigns (id, name, product, objective, start_date, end_date, currency)
     VALUES (?, ?, NULL, NULL, NULL, NULL, 'KZT')`
  ).run(id, name)
  return id
}

export function findOrCreatePlacement(
  db: Database.Database,
  campaignId: string,
  data: {
    name: string
    channel: string
    platform: string | null
    format: string | null
    audience: string | null
  }
): string {
  const existing = db
    .prepare(
      `SELECT id FROM placements WHERE campaign_id = ? AND lower(name) = lower(?) AND lower(channel) = lower(?)`
    )
    .get(campaignId, data.name, data.channel) as { id: string } | undefined
  if (existing) return existing.id

  const id = randomUUID()
  db.prepare(
    `INSERT INTO placements (id, campaign_id, name, channel, platform, format, audience, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)`
  ).run(id, campaignId, data.name, data.channel, data.platform, data.format, data.audience)
  return id
}

export function createSource(
  db: Database.Database,
  data: { filename: string; sheet: string; templateId: string | null; rowCount: number }
): string {
  const id = randomUUID()
  db.prepare(
    `INSERT INTO sources (id, filename, sheet, imported_at, template_id, row_count)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, data.filename, data.sheet, new Date().toISOString(), data.templateId, data.rowCount)
  return id
}

/** Writes metric values keyed on (placement, date, kind, metric): a value
 * for a key that already exists gets overwritten (latest import wins),
 * rather than inserted as a second row that would double-count in every
 * SUM(). This is what makes re-importing an updated weekly report safe —
 * see the migration that added the unique index backing this. */
export function insertMetricValues(
  db: Database.Database,
  sourceId: string,
  entries: Array<{
    placementId: string
    date: string
    kind: MetricKind
    metric: BaseMetric
    value: number
  }>
): void {
  const stmt = db.prepare(
    `INSERT INTO metric_values (id, placement_id, date, kind, metric, value, source_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (placement_id, date, kind, metric)
     DO UPDATE SET value = excluded.value, source_id = excluded.source_id`
  )
  const insertAll = db.transaction((rows: typeof entries) => {
    for (const row of rows) {
      stmt.run(randomUUID(), row.placementId, row.date, row.kind, row.metric, row.value, sourceId)
    }
  })
  insertAll(entries)
}

/** Commits a batch of normalized rows in one transaction: campaigns and
 * placements are found-or-created (matched by name/channel, never
 * duplicated); metric values are upserted on (placement, date, kind,
 * metric) — re-importing an updated file for a period already in the DB
 * overwrites those values instead of adding duplicate rows that would
 * double-count in every aggregate. Each import still records its own
 * `sources` row, so which import last touched a value is traceable even
 * though the prior value itself isn't kept. */
export function commitNormalizedRows(
  db: Database.Database,
  source: { filename: string; sheet: string; templateId: string | null },
  rows: NormalizedRow[]
): { sourceId: string; placementCount: number; metricValueCount: number } {
  const run = db.transaction(() => {
    const sourceId = createSource(db, { ...source, rowCount: rows.length })
    const placementIds = new Set<string>()
    const metricEntries: Array<{
      placementId: string
      date: string
      kind: MetricKind
      metric: BaseMetric
      value: number
    }> = []

    for (const row of rows) {
      const campaignId = findOrCreateCampaign(db, row.campaignName)
      const placementId = findOrCreatePlacement(db, campaignId, {
        name: row.placementName,
        channel: row.channel,
        platform: row.platform,
        format: row.format,
        audience: row.audience
      })
      placementIds.add(placementId)

      for (const [metric, kinds] of Object.entries(row.metrics) as Array<
        [BaseMetric, { plan?: number; fact?: number }]
      >) {
        if (kinds.plan !== undefined) {
          metricEntries.push({
            placementId,
            date: row.date,
            kind: 'plan',
            metric,
            value: kinds.plan
          })
        }
        if (kinds.fact !== undefined) {
          metricEntries.push({
            placementId,
            date: row.date,
            kind: 'fact',
            metric,
            value: kinds.fact
          })
        }
      }
    }

    insertMetricValues(db, sourceId, metricEntries)
    return { sourceId, placementCount: placementIds.size, metricValueCount: metricEntries.length }
  })

  return run()
}

function rowToTemplate(row: Record<string, unknown>): MappingTemplate {
  return {
    id: row.id as string,
    name: row.name as string,
    agency: (row.agency as string | null) ?? null,
    headerRow: row.header_row as number,
    sheetNameHint: (row.sheet_name_hint as string | null) ?? null,
    columnMap: JSON.parse(row.column_map as string),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

export function listMappingTemplates(db: Database.Database): MappingTemplate[] {
  const rows = db
    .prepare('SELECT * FROM mapping_templates ORDER BY updated_at DESC')
    .all() as Record<string, unknown>[]
  return rows.map(rowToTemplate)
}

export function saveMappingTemplate(
  db: Database.Database,
  data: {
    name: string
    agency: string | null
    headerRow: number
    sheetNameHint: string | null
    columnMap: ColumnMapping[]
  }
): MappingTemplate {
  const now = new Date().toISOString()
  const existing = db
    .prepare('SELECT id FROM mapping_templates WHERE lower(name) = lower(?)')
    .get(data.name) as { id: string } | undefined

  const id = existing?.id ?? randomUUID()
  const columnMapJson = JSON.stringify(data.columnMap)

  if (existing) {
    db.prepare(
      `UPDATE mapping_templates
       SET agency = ?, header_row = ?, sheet_name_hint = ?, column_map = ?, updated_at = ?
       WHERE id = ?`
    ).run(data.agency, data.headerRow, data.sheetNameHint, columnMapJson, now, id)
  } else {
    db.prepare(
      `INSERT INTO mapping_templates (id, name, agency, header_row, sheet_name_hint, column_map, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, data.name, data.agency, data.headerRow, data.sheetNameHint, columnMapJson, now, now)
  }

  return rowToTemplate(
    db.prepare('SELECT * FROM mapping_templates WHERE id = ?').get(id) as Record<string, unknown>
  )
}

export function listMetricRows(db: Database.Database): MetricRow[] {
  const rows = db
    .prepare(
      `SELECT
         p.id AS placement_id,
         c.name AS campaign_name,
         p.name AS placement_name,
         p.channel AS channel,
         p.platform AS platform,
         p.format AS format,
         mv.date AS date,
         mv.kind AS kind,
         mv.metric AS metric,
         mv.value AS value
       FROM metric_values mv
       JOIN placements p ON p.id = mv.placement_id
       JOIN campaigns c ON c.id = p.campaign_id
       ORDER BY mv.date DESC, c.name, p.name`
    )
    .all() as Record<string, unknown>[]

  return rows.map((r) => ({
    placementId: r.placement_id as string,
    campaignName: r.campaign_name as string,
    placementName: r.placement_name as string,
    channel: r.channel as string,
    platform: (r.platform as string | null) ?? null,
    format: (r.format as string | null) ?? null,
    date: r.date as string,
    kind: r.kind as MetricKind,
    metric: r.metric as BaseMetric,
    value: r.value as number
  }))
}

export function listSources(db: Database.Database): Array<{
  id: string
  filename: string
  sheet: string
  importedAt: string
  rowCount: number
}> {
  const rows = db.prepare('SELECT * FROM sources ORDER BY imported_at DESC').all() as Record<
    string,
    unknown
  >[]
  return rows.map((r) => ({
    id: r.id as string,
    filename: r.filename as string,
    sheet: r.sheet as string,
    importedAt: r.imported_at as string,
    rowCount: r.row_count as number
  }))
}
