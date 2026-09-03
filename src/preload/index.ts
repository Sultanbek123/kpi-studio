import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC } from '../main/ipc/channels'
import type {
  ImportCommitRequest,
  ImportPreviewRequest,
  PreviewSheetRequest,
  SaveTemplateRequest
} from '@shared/schema'
import type { BaseSums } from '@shared/metrics'
import type { MappingTemplate, MetricRow, NormalizedRow, RawCell } from '@shared/types'

const api = {
  dialogOpenExcel: (): Promise<{ filePath: string; sheets: string[] } | null> =>
    ipcRenderer.invoke(IPC.dialogOpenExcel),

  excelListSheets: (filePath: string): Promise<string[]> =>
    ipcRenderer.invoke(IPC.excelListSheets, filePath),

  excelPreview: (req: PreviewSheetRequest): Promise<{ grid: RawCell[][]; totalRows: number }> =>
    ipcRenderer.invoke(IPC.excelPreview, req),

  importPreview: (
    req: ImportPreviewRequest
  ): Promise<{
    sampleRows: NormalizedRow[]
    totalNormalizedRows: number
    warnings: string[]
    skippedRowCount: number
    planSums: BaseSums
    factSums: BaseSums
  }> => ipcRenderer.invoke(IPC.importPreview, req),

  importCommit: (
    req: ImportCommitRequest
  ): Promise<{
    sourceId: string
    placementCount: number
    metricValueCount: number
    warnings: string[]
    skippedRowCount: number
    totalRowsRead: number
  }> => ipcRenderer.invoke(IPC.importCommit, req),

  templatesList: (): Promise<MappingTemplate[]> => ipcRenderer.invoke(IPC.templatesList),

  templatesSave: (req: SaveTemplateRequest): Promise<MappingTemplate> =>
    ipcRenderer.invoke(IPC.templatesSave, req),

  dataListMetricRows: (): Promise<MetricRow[]> => ipcRenderer.invoke(IPC.dataListMetricRows),

  sourcesList: (): Promise<
    Array<{ id: string; filename: string; sheet: string; importedAt: string; rowCount: number }>
  > => ipcRenderer.invoke(IPC.sourcesList)
}

export type KpiApi = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
