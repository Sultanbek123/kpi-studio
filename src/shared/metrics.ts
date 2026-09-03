import type { BaseMetric, DerivedMetric } from './types'

/**
 * The core domain rule of this app: derived (ratio) metrics are NEVER
 * averaged row-by-row and never stored. A group's CTR is
 * SUM(clicks) / SUM(impressions) — not the average of each row's CTR.
 * Every function here takes already-summed base metrics and returns one
 * derived number, so there is exactly one place this rule can be broken.
 */

export type BaseSums = Partial<Record<BaseMetric, number>>

export interface ReachAggregate {
  /** Sum of reach values that contributed — only meaningful when rowCount <= 1. */
  value: number | null
  /** How many source rows contributed a reach value. */
  rowCount: number
  /** False when reach was combined across >1 row (channels and/or dates):
   * audiences likely overlap, so a sum would overcount unique users. */
  isReliable: boolean
}

/** Sums an array of per-row base-metric bags into one bag, plus a
 * dedicated reach aggregate that flags when summing reach is unsafe. */
export function aggregateBase(rows: BaseSums[]): { sums: BaseSums; reach: ReachAggregate } {
  const sums: BaseSums = {}
  let reachSum = 0
  let reachRows = 0

  for (const row of rows) {
    for (const [key, value] of Object.entries(row) as [BaseMetric, number | undefined][]) {
      if (value === undefined || value === null || !Number.isFinite(value)) continue
      if (key === 'reach') {
        reachSum += value
        reachRows += 1
        continue
      }
      sums[key] = (sums[key] ?? 0) + value
    }
  }

  return {
    sums,
    reach: {
      value: reachRows > 0 ? reachSum : null,
      rowCount: reachRows,
      isReliable: reachRows <= 1
    }
  }
}

function div(a: number | undefined, b: number | undefined): number | null {
  if (a === undefined || b === undefined || b === 0) return null
  return a / b
}

export interface PacingInput {
  spendPlan: number
  spendFact: number
  /** Days elapsed so far in the flight, clamped to [0, totalDays]. */
  elapsedDays: number
  totalDays: number
}

/** Budget pacing: 1.0 = exactly on track, >1 = overspending relative to
 * elapsed time, <1 = underspending. Null when the flight hasn't started
 * or has no planned budget. */
export function pacing({
  spendPlan,
  spendFact,
  elapsedDays,
  totalDays
}: PacingInput): number | null {
  if (totalDays <= 0 || spendPlan <= 0) return null
  const clampedElapsed = Math.max(0, Math.min(elapsedDays, totalDays))
  const expectedSpend = spendPlan * (clampedElapsed / totalDays)
  if (expectedSpend <= 0) return null
  return spendFact / expectedSpend
}

/** Computes one derived metric from aggregated base sums.
 * `reach` is taken separately because it carries its own reliability flag. */
export function computeDerived(
  metric: DerivedMetric,
  sums: BaseSums,
  reach: ReachAggregate | null = null
): number | null {
  switch (metric) {
    case 'cpm':
      return div(sums.spend, sums.impressions) === null
        ? null
        : (sums.spend! / sums.impressions!) * 1000
    case 'ctr':
      return div(sums.clicks, sums.impressions)
    case 'cpc':
      return div(sums.spend, sums.clicks)
    case 'vtr':
      return div(sums.views, sums.impressions)
    case 'vcr':
      return div(sums.views100, sums.views)
    case 'cpv':
      return div(sums.spend, sums.views)
    case 'cpa':
      return div(sums.spend, sums.conversions)
    case 'roas':
      return div(sums.revenue, sums.spend)
    case 'drr':
      return div(sums.spend, sums.revenue)
    case 'frequency':
      if (!reach || !reach.isReliable || reach.value === null) return null
      return div(sums.impressions, reach.value)
    case 'pacing':
      // Pacing needs plan/fact split and a date window — computed by the
      // caller via `pacing()`, not derivable from a flat sums bag alone.
      return null
    default:
      return null
  }
}

export const METRIC_LABELS: Record<BaseMetric | DerivedMetric, string> = {
  spend: 'Расход',
  impressions: 'Показы',
  clicks: 'Клики',
  views: 'Просмотры',
  views25: 'Просмотры 25%',
  views50: 'Просмотры 50%',
  views75: 'Просмотры 75%',
  views100: 'Просмотры 100%',
  reach: 'Охват',
  conversions: 'Конверсии',
  leads: 'Лиды',
  orders: 'Заказы',
  revenue: 'Выручка',
  sessions: 'Сессии',
  cpm: 'CPM',
  ctr: 'CTR',
  cpc: 'CPC',
  vtr: 'VTR',
  vcr: 'VCR',
  cpv: 'CPV',
  cpa: 'CPA',
  roas: 'ROAS',
  drr: 'ДРР',
  frequency: 'Частота',
  pacing: 'Pacing'
}

/** Metrics displayed as a percentage in the UI. */
export const PERCENT_METRICS: ReadonlySet<DerivedMetric> = new Set([
  'ctr',
  'vtr',
  'vcr',
  'drr',
  'pacing'
])
