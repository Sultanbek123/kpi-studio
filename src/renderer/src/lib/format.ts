import { PERCENT_METRICS } from '@shared/metrics'
import type { BaseMetric, DerivedMetric } from '@shared/types'

const numberFmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
const decimalFmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })
const percentFmt = new Intl.NumberFormat('ru-RU', { style: 'percent', maximumFractionDigits: 1 })
const currencyFmt = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'KZT',
  maximumFractionDigits: 0
})

export function formatInt(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return numberFmt.format(n)
}

export function formatDecimal(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return decimalFmt.format(n)
}

export function formatCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return currencyFmt.format(n)
}

export function formatPercent(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return percentFmt.format(n)
}

/** Formats a metric value using the right unit for that metric. */
export function formatMetric(
  metric: BaseMetric | DerivedMetric,
  value: number | null | undefined
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  if (metric === 'spend') return formatCurrency(value)
  if (PERCENT_METRICS.has(metric as DerivedMetric)) return formatPercent(value)
  if (['cpm', 'cpc', 'cpa', 'cpv'].includes(metric)) return formatCurrency(value)
  if (['roas', 'frequency'].includes(metric)) return `${formatDecimal(value)}×`
  return formatInt(value)
}
