export const IPC = {
  dialogOpenExcel: 'dialog:openExcel',
  excelListSheets: 'excel:listSheets',
  excelPreview: 'excel:preview',
  importPreview: 'import:preview',
  importCommit: 'import:commit',
  templatesList: 'templates:list',
  templatesSave: 'templates:save',
  dataListMetricRows: 'data:listMetricRows',
  sourcesList: 'sources:list'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
