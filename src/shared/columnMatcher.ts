import type { BaseMetric, DimensionField } from './types'

/**
 * Auto-suggests a column role from its header text. This is the piece
 * that makes the import wizard fast: ~90% of columns in a typical agency
 * file get the right role guessed, the user just confirms.
 */

type Candidate =
  | { type: 'dimension'; field: DimensionField }
  | { type: 'metric'; metric: BaseMetric; kind: 'plan' | 'fact' }

interface SynonymEntry {
  candidate: Candidate
  synonyms: string[]
}

const DIMENSION_SYNONYMS: Record<DimensionField, string[]> = {
  campaign: ['кампания', 'campaign', 'campaign name', 'название кампании'],
  placement: ['размещение', 'placement', 'плейсмент', 'line item', 'позиция'],
  channel: ['канал', 'channel', 'источник', 'source', 'медиа', 'media'],
  platform: ['платформа', 'platform', 'площадка', 'network'],
  format: ['формат', 'format', 'тип', 'ad format', 'creative format'],
  product: ['продукт', 'product', 'модель', 'категория', 'category'],
  audience: ['аудитория', 'audience', 'таргетинг', 'targeting', 'segment', 'сегмент'],
  date: ['дата', 'date', 'период', 'период размещения', 'week', 'неделя', 'месяц', 'month']
}

const METRIC_SYNONYMS: Record<BaseMetric, string[]> = {
  spend: [
    'бюджет',
    'расход',
    'затраты',
    'spend',
    'cost',
    'budget',
    'инвестиции',
    'сумма',
    'потрачено'
  ],
  impressions: ['показы', 'импрешены', 'impressions', 'impr', 'показов'],
  clicks: ['клики', 'переходы', 'clicks', 'кликов'],
  views: ['просмотры', 'views', 'просмотров', 'video views'],
  views25: ['просмотры 25', 'views 25', '25% views', 'vtr 25'],
  views50: ['просмотры 50', 'views 50', '50% views', 'vtr 50'],
  views75: ['просмотры 75', 'views 75', '75% views', 'vtr 75'],
  views100: ['просмотры 100', 'views 100', 'completed views', 'дочитывания', 'complete views'],
  reach: ['охват', 'reach', 'уникальный охват', 'unique reach'],
  conversions: ['конверсии', 'conversions', 'целевые действия', 'cv'],
  leads: ['лиды', 'leads', 'заявки', 'lead'],
  orders: ['заказы', 'orders', 'покупки', 'purchases'],
  revenue: ['выручка', 'revenue', 'доход', 'sales', 'gmv'],
  sessions: ['сессии', 'sessions', 'визиты', 'visits']
}

const PLAN_MARKERS = ['план', 'plan', 'planned', 'target', 'цель', 'прогноз']
const FACT_MARKERS = ['факт', 'fact', 'actual', 'реальн']

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,;:()%№#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[] = new Array(n + 1)
  for (let j = 0; j <= n; j++) dp[j] = j
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return dp[n]
}

function similarity(a: string, b: string): number {
  if (a === b) return 1
  if (a.length === 0 || b.length === 0) return 0
  if (b.includes(a) || a.includes(b)) {
    return (Math.min(a.length, b.length) / Math.max(a.length, b.length)) * 0.95 + 0.05
  }
  const dist = levenshtein(a, b)
  const maxLen = Math.max(a.length, b.length)
  return Math.max(0, 1 - dist / maxLen)
}

function detectKind(header: string): 'plan' | 'fact' | null {
  const h = normalize(header)
  if (PLAN_MARKERS.some((m) => h.includes(m))) return 'plan'
  if (FACT_MARKERS.some((m) => h.includes(m))) return 'fact'
  return null
}

export interface MatchResult {
  candidate: Candidate
  confidence: number
}

const ENTRIES: SynonymEntry[] = [
  ...Object.entries(DIMENSION_SYNONYMS).map(([field, synonyms]) => ({
    candidate: { type: 'dimension' as const, field: field as DimensionField },
    synonyms
  })),
  ...Object.entries(METRIC_SYNONYMS).flatMap(([metric, synonyms]) => {
    const kinds: Array<'plan' | 'fact'> = ['plan', 'fact']
    return kinds.map((kind) => ({
      candidate: { type: 'metric' as const, metric: metric as BaseMetric, kind },
      synonyms
    }))
  })
]

/** Suggests the best-matching role for a raw column header.
 * Returns null when nothing scores above a usable threshold — the
 * column should be left for the user to assign, or ignored. */
export function suggestColumnRole(header: string): MatchResult | null {
  const h = normalize(header)
  if (!h) return null

  const kind = detectKind(header)
  let best: MatchResult | null = null

  for (const entry of ENTRIES) {
    // Skip the metric/kind combination that doesn't match a detected
    // plan/fact marker in the header, if one was detected.
    if (entry.candidate.type === 'metric' && kind && entry.candidate.kind !== kind) continue

    for (const syn of entry.synonyms) {
      const score = similarity(h, normalize(syn))
      if (!best || score > best.confidence) {
        best = { candidate: entry.candidate, confidence: score }
      }
    }
  }

  // If no plan/fact marker was found in the header at all, metric
  // candidates default to "fact" (the common case for realized numbers)
  // but confidence is trimmed slightly since it's a guess.
  if (best && best.candidate.type === 'metric' && !kind) {
    best = { ...best, confidence: best.confidence * 0.9 }
  }

  if (!best || best.confidence < 0.55) return null
  return best
}
