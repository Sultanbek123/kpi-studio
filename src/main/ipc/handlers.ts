import { ipcMain, dialog, type BrowserWindow } from 'electron'
import { getDb } from '../db/connection'
import * as repo from '../db/repo'
import { listSheetNames, readSheetGrid } from '../excel/reader'
import { normalizeGrid } from '../excel/normalize'
import { IPC } from './channels'
import {
  ImportCommitRequestSchema,
  ImportPreviewRequestSchema,
  PreviewSheetRequestSchema,
  SaveTemplateRequestSchema
} from '@shared/schema'
import { aggregateBase, type BaseSums } from '@shared/metrics'
import type { NormalizedRow } from '../db/repo'

function splitByKind(rows: NormalizedRow[]): { plan: BaseSums[]; fact: BaseSums[] } {
  const plan: BaseSums[] = []
  const fact: BaseSums[] = []
  for (const row of rows) {
    const planBag: BaseSums = {}
    const factBag: BaseSums = {}
    for (const [metric, kinds] of Object.entries(row.metrics)) {
      if (kinds?.plan !== undefined) planBag[metric as keyof BaseSums] = kinds.plan
      if (kinds?.fact !== undefined) factBag[metric as keyof BaseSums] = kinds.fact
    }
    plan.push(planBag)
    fact.push(factBag)
  }
  return { plan, fact }
}

/** Registers every ipcMain.handle for the app. Each handler validates its
 * input at the boundary (zod) and lets thrown errors propagate — the
 * preload/renderer side turns a rejected invoke() into a UI error, which
 * is the standard and simplest Electron pattern. */
export function registerIpcHandlers(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IPC.dialogOpenExcel, async () => {
    const win = getMainWindow()
    const result = await dialog.showOpenDialog(win ?? (undefined as never), {
      title: 'Выбрать файл медиаплана',
      properties: ['openFile'],
      filters: [
        { name: 'Excel / CSV', extensions: ['xlsx', 'xls', 'csv'] },
        { name: 'Все файлы', extensions: ['*'] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]
    return { filePath, sheets: listSheetNames(filePath) }
  })

  ipcMain.handle(IPC.excelListSheets, (_e, filePath: string) => {
    return listSheetNames(filePath)
  })

  ipcMain.handle(IPC.excelPreview, (_e, raw: unknown) => {
    const req = PreviewSheetRequestSchema.parse(raw)
    const grid = readSheetGrid(req.filePath, req.sheetName)
    return {
      grid: grid.slice(0, req.maxRows),
      totalRows: grid.length
    }
  })

  ipcMain.handle(IPC.importPreview, (_e, raw: unknown) => {
    const req = ImportPreviewRequestSchema.parse(raw)
    const grid = readSheetGrid(req.filePath, req.sheetName)
    const { rows, warnings, skippedRowCount } = normalizeGrid(
      grid,
      req.headerRowIndex,
      req.columnMap,
      req.campaignName,
      req.fallbackDate
    )
    const { plan, fact } = splitByKind(rows)
    const { sums: planSums } = aggregateBase(plan)
    const { sums: factSums } = aggregateBase(fact)

    return {
      sampleRows: rows.slice(0, 30),
      totalNormalizedRows: rows.length,
      warnings,
      skippedRowCount,
      planSums,
      factSums
    }
  })

  ipcMain.handle(IPC.importCommit, (_e, raw: unknown) => {
    const req = ImportCommitRequestSchema.parse(raw)
    const db = getDb()
    const grid = readSheetGrid(req.filePath, req.sheetName)
    const { rows, warnings, skippedRowCount } = normalizeGrid(
      grid,
      req.headerRowIndex,
      req.columnMap,
      req.campaignName,
      req.fallbackDate
    )

    let templateId: string | null = null
    if (req.saveAsTemplateName) {
      const template = repo.saveMappingTemplate(db, {
        name: req.saveAsTemplateName,
        agency: req.templateAgency ?? null,
        headerRow: req.headerRowIndex,
        sheetNameHint: req.sheetName,
        columnMap: req.columnMap
      })
      templateId = template.id
    }

    const filename = req.filePath.split(/[\\/]/).pop() ?? req.filePath
    const commit = repo.commitNormalizedRows(
      db,
      { filename, sheet: req.sheetName, templateId },
      rows
    )

    return {
      ...commit,
      warnings,
      skippedRowCount,
      totalRowsRead: grid.length - req.headerRowIndex - 1
    }
  })

  ipcMain.handle(IPC.templatesList, () => {
    return repo.listMappingTemplates(getDb())
  })

  ipcMain.handle(IPC.templatesSave, (_e, raw: unknown) => {
    const req = SaveTemplateRequestSchema.parse(raw)
    return repo.saveMappingTemplate(getDb(), {
      name: req.name,
      agency: req.agency ?? null,
      headerRow: req.headerRow,
      sheetNameHint: req.sheetNameHint ?? null,
      columnMap: req.columnMap
    })
  })

  ipcMain.handle(IPC.dataListMetricRows, () => {
    return repo.listMetricRows(getDb())
  })

  ipcMain.handle(IPC.sourcesList, () => {
    return repo.listSources(getDb())
  })
}
