/**
 * Domain types shared between main, preload and renderer.
 * Kept dependency-free (no Electron, no Node) so this file can be
 * imported and unit-tested in isolation.
 */

/** Metrics that are actually stored — every one is a counter that is safe
 * to SUM across rows (dates, placements, channels). */
export const BASE_METRICS = [
  'spend',
  'impressions',
  'clicks',
  'views',
  'views25',
  'views50',
  'views75',
  'views100',
  'reach',
  'conversions',
  'leads',
  'orders',
  'revenue',
  'sessions'
] as const

export type BaseMetric = (typeof BASE_METRICS)[number]

/** Metrics that are always derived, never stored. */
export const DERIVED_METRICS = [
  'cpm',
  'ctr',
  'cpc',
  'vtr',
  'vcr',
  'cpv',
  'cpa',
  'roas',
  'drr',
  'frequency',
  'pacing'
] as const

export type DerivedMetric = (typeof DERIVED_METRICS)[number]

export type MetricKind = 'plan' | 'fact'

/** Row role assigned to a column during import mapping. */
export type DimensionField =
  'campaign' | 'placement' | 'channel' | 'platform' | 'format' | 'product' | 'audience' | 'date'

export const DIMENSION_FIELDS: DimensionField[] = [
  'campaign',
  'placement',
  'channel',
  'platform',
  'format',
  'product',
  'audience',
  'date'
]

export const DIMENSION_LABELS: Record<DimensionField, string> = {
  campaign: 'Кампания',
  placement: 'Размещение',
  channel: 'Канал',
  platform: 'Платформа',
  format: 'Формат',
  product: 'Продукт',
  audience: 'Аудитория',
  date: 'Дата'
}

/** What a single spreadsheet column gets mapped to. */
export type ColumnRole =
  | { type: 'dimension'; field: DimensionField }
  | { type: 'metric'; metric: BaseMetric; kind: MetricKind }
  | { type: 'ignore' }

export interface ColumnMapping {
  /** 0-based column index in the sheet grid. */
  columnIndex: number
  /** Raw header text as found in the file. */
  header: string
  role: ColumnRole
  /** Confidence of the auto-suggestion, 0..1. Not set for manual picks. */
  confidence?: number
}

export interface Campaign {
  id: string
  name: string
  product: string | null
  objective: string | null
  startDate: string | null
  endDate: string | null
  currency: string
}

export interface Placement {
  id: string
  campaignId: string
  name: string
  channel: string
  platform: string | null
  format: string | null
  audience: string | null
  startDate: string | null
  endDate: string | null
}

export interface MetricValue {
  id: string
  placementId: string
  date: string
  kind: MetricKind
  metric: BaseMetric
  value: number
  sourceId: string
}

export interface MappingTemplate {
  id: string
  name: string
  agency: string | null
  headerRow: number
  sheetNameHint: string | null
  columnMap: ColumnMapping[]
  createdAt: string
  updatedAt: string
}

export interface SourceFile {
  id: string
  filename: string
  sheet: string
  importedAt: string
  templateId: string | null
  rowCount: number
}

/** A single spreadsheet cell value as SheetJS returns it (with cellDates
 * enabled). Lives in shared/ so the renderer can type preview grids
 * without importing from the main-process project. */
export type RawCell = string | number | Date | boolean | null

/** One spreadsheet row after mapping + parsing, before it becomes DB rows.
 * Shared so both the main-process normalizer and the renderer's import
 * preview step can use the same shape. */
export interface NormalizedRow {
  campaignName: string
  placementName: string
  channel: string
  platform: string | null
  format: string | null
  audience: string | null
  date: string
  metrics: Partial<Record<BaseMetric, { plan?: number; fact?: number }>>
}

/** One flattened (placement × date × kind × metric) row, as returned by
 * the data table query. Lives in shared/ (rather than main/db/repo) so the
 * renderer can import the type without reaching across the main-process
 * TypeScript project boundary. */
export interface MetricRow {
  placementId: string
  campaignName: string
  placementName: string
  channel: string
  platform: string | null
  format: string | null
  date: string
  kind: MetricKind
  metric: BaseMetric
  value: number
}
