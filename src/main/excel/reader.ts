import * as XLSX from 'xlsx'
import type { RawCell } from '@shared/types'

export type { RawCell }

/** Lists sheet names in a workbook without loading full cell data. */
export function listSheetNames(filePath: string): string[] {
  const wb = XLSX.readFile(filePath, { bookSheets: true })
  return wb.SheetNames
}

/** Reads one sheet as a raw grid of rows/cells — no header assumptions,
 * numbers and dates preserved in their native type so the caller
 * (numberParser, date normalizer) decides how to read them. */
export function readSheetGrid(filePath: string, sheetName: string): RawCell[][] {
  const wb = XLSX.readFile(filePath, { cellDates: true })
  const sheet = wb.Sheets[sheetName]
  if (!sheet) throw new Error(`Лист "${sheetName}" не найден в файле`)

  const grid = XLSX.utils.sheet_to_json<RawCell[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true
  })
  return grid
}
