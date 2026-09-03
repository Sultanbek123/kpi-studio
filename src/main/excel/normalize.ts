import type { ColumnMapping, BaseMetric } from '@shared/types'
import { parseNumber } from '@shared/numberParser'
import type { RawCell } from './reader'
import type { NormalizedRow } from '../db/repo'

const TOTALS_ROW_PATTERN = /^(итого|итог|всего|total|sum|grand total)/i

function cellToString(cell: RawCell): string {
  if (cell === null || cell === undefined) return ''
  if (cell instanceof Date) return cell.toISOString().slice(0, 10)
  return String(cell).trim()
}

function cellToDateString(cell: RawCell, fallback: string): string {
  if (cell === null || cell === undefined || cell === '') return fallback
  if (cell instanceof Date) return cell.toISOString().slice(0, 10)
  if (typeof cell === 'number') {
    // Excel serial date fallback (cellDates:true normally avoids this).
    const epoch = new Date(Date.UTC(1899, 11, 30))
    const d = new Date(epoch.getTime() + cell * 86400000)
    return d.toISOString().slice(0, 10)
  }
  const s = String(cell).trim()
  const parsed = new Date(s)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString().slice(0, 10)
}

export interface NormalizeResult {
  rows: NormalizedRow[]
  warnings: string[]
  skippedRowCount: number
}

export function normalizeGrid(
  grid: RawCell[][],
  headerRowIndex: number,
  columnMap: ColumnMapping[],
  campaignNameFallback: string,
  fallbackDate: string
): NormalizeResult {
  const warnings: string[] = []
  const rows: NormalizedRow[] = []
  let skippedRowCount = 0

  const byRole = {
    dimension: columnMap.filter((c) => c.role.type === 'dimension'),
    metric: columnMap.filter((c) => c.role.type === 'metric')
  }

  const dimCol = (field: string): ColumnMapping | undefined =>
    byRole.dimension.find((c) => c.role.type === 'dimension' && c.role.field === field)

  const campaignCol = dimCol('campaign')
  const placementCol = dimCol('placement')
  const channelCol = dimCol('channel')
  const platformCol = dimCol('platform')
  const formatCol = dimCol('format')
  const audienceCol = dimCol('audience')
  const dateCol = dimCol('date')

  for (let r = headerRowIndex + 1; r < grid.length; r++) {
    const row = grid[r] ?? []
    const isBlank = row.every(
      (cell) => cell === null || cell === undefined || String(cell).trim() === ''
    )
    if (isBlank) continue

    const channelRaw = channelCol ? cellToString(row[channelCol.columnIndex]) : ''
    const placementRaw = placementCol ? cellToString(row[placementCol.columnIndex]) : ''
    const firstLabel = channelRaw || placementRaw || cellToString(row[0])

    if (TOTALS_ROW_PATTERN.test(firstLabel.trim())) {
      skippedRowCount++
      warnings.push(`Строка ${r + 1} похожа на итоговую ("${firstLabel}") и была пропущена`)
      continue
    }

    if (!channelRaw) {
      skippedRowCount++
      warnings.push(`Строка ${r + 1}: не удалось определить канал, строка пропущена`)
      continue
    }

    const metrics: NormalizedRow['metrics'] = {}
    for (const col of byRole.metric) {
      if (col.role.type !== 'metric') continue
      const value = parseNumber(row[col.columnIndex])
      if (value === null) continue
      const metric = col.role.metric as BaseMetric
      const bucket = (metrics[metric] ??= {})
      bucket[col.role.kind] = value
    }

    if (Object.keys(metrics).length === 0) {
      skippedRowCount++
      warnings.push(
        `Строка ${r + 1} ("${firstLabel}"): нет ни одного числового значения, строка пропущена`
      )
      continue
    }

    rows.push({
      campaignName: campaignCol
        ? cellToString(row[campaignCol.columnIndex]) || campaignNameFallback
        : campaignNameFallback,
      placementName:
        placementRaw ||
        `${channelRaw}${formatCol ? ' / ' + cellToString(row[formatCol.columnIndex]) : ''}`,
      channel: channelRaw,
      platform: platformCol ? cellToString(row[platformCol.columnIndex]) || null : null,
      format: formatCol ? cellToString(row[formatCol.columnIndex]) || null : null,
      audience: audienceCol ? cellToString(row[audienceCol.columnIndex]) || null : null,
      date: dateCol ? cellToDateString(row[dateCol.columnIndex], fallbackDate) : fallbackDate,
      metrics
    })
  }

  return { rows, warnings, skippedRowCount }
}
