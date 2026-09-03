import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileUp, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardValue,
  CardDescription
} from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Alert } from '@renderer/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { Stepper } from '@renderer/components/import/Stepper'
import { ColumnMapRow } from '@renderer/components/import/ColumnMapRow'
import { suggestColumnRole } from '@shared/columnMatcher'
import type { ColumnMapping, NormalizedRow, RawCell } from '@shared/types'
import { formatCurrency, formatInt } from '@renderer/lib/format'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function cellText(cell: RawCell | undefined): string {
  if (cell === null || cell === undefined) return ''
  if (cell instanceof Date) return cell.toLocaleDateString('ru-RU')
  return String(cell)
}

type ImportPreviewResult = Awaited<ReturnType<typeof window.api.importPreview>>
type ImportCommitResult = Awaited<ReturnType<typeof window.api.importCommit>>

export function ImportPage(): React.JSX.Element {
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1
  const [filePath, setFilePath] = useState<string | null>(null)
  const [fileLabel, setFileLabel] = useState('')
  const [sheets, setSheets] = useState<string[]>([])
  const [sheetName, setSheetName] = useState<string | null>(null)

  // Step 2
  const [previewGrid, setPreviewGrid] = useState<RawCell[][] | null>(null)
  const [headerRowIndex, setHeaderRowIndex] = useState<number | null>(null)

  // Step 3
  const [columnMap, setColumnMap] = useState<ColumnMapping[]>([])

  // Step 4
  const [campaignName, setCampaignName] = useState('')
  const [fallbackDate, setFallbackDate] = useState(todayISO())
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null)

  // Step 5
  const [saveTemplate, setSaveTemplate] = useState(true)
  const [templateName, setTemplateName] = useState('')
  const [templateAgency, setTemplateAgency] = useState('')
  const [commitResult, setCommitResult] = useState<ImportCommitResult | null>(null)

  const hasDateColumn = columnMap.some(
    (c) => c.role.type === 'dimension' && c.role.field === 'date'
  )

  async function handleSelectFile(): Promise<void> {
    setError(null)
    try {
      const result = await window.api.dialogOpenExcel()
      if (!result) return
      const name = result.filePath.split(/[\\/]/).pop() ?? result.filePath
      setFilePath(result.filePath)
      setFileLabel(name)
      setSheets(result.sheets)
      setSheetName(result.sheets[0] ?? null)
      setCampaignName((prev) => prev || name.replace(/\.[^.]+$/, ''))
      setTemplateName((prev) => prev || name.replace(/\.[^.]+$/, ''))
      setHeaderRowIndex(null)
      setColumnMap([])
      setPreviewGrid(null)
      setPreviewResult(null)
      setCommitResult(null)
    } catch (e) {
      setError(String((e as Error)?.message ?? e))
    }
  }

  async function loadGrid(): Promise<void> {
    if (!filePath || !sheetName) return
    setBusy(true)
    setError(null)
    try {
      const { grid } = await window.api.excelPreview({ filePath, sheetName, maxRows: 40 })
      setPreviewGrid(grid)
    } catch (e) {
      setError(String((e as Error)?.message ?? e))
    } finally {
      setBusy(false)
    }
  }

  function goToStep2(): void {
    setStep(2)
    void loadGrid()
  }

  function goToStep3(): void {
    if (headerRowIndex === null || !previewGrid) return
    if (columnMap.length === 0) {
      const headerRow = previewGrid[headerRowIndex] ?? []
      const numCols = Math.max(...previewGrid.map((r) => r.length), headerRow.length)
      const built: ColumnMapping[] = []
      for (let i = 0; i < numCols; i++) {
        const header = cellText(headerRow[i]).trim()
        const suggestion = suggestColumnRole(header)
        built.push({
          columnIndex: i,
          header,
          role: suggestion?.candidate ?? { type: 'ignore' },
          confidence: suggestion?.confidence
        })
      }
      setColumnMap(built)
    }
    setStep(3)
  }

  async function runPreview(): Promise<void> {
    if (!filePath || !sheetName || headerRowIndex === null) return
    setBusy(true)
    setError(null)
    try {
      const result = await window.api.importPreview({
        filePath,
        sheetName,
        headerRowIndex,
        columnMap,
        campaignName: campaignName || fileLabel,
        fallbackDate
      })
      setPreviewResult(result)
    } catch (e) {
      setError(String((e as Error)?.message ?? e))
    } finally {
      setBusy(false)
    }
  }

  async function handleCommit(): Promise<void> {
    if (!filePath || !sheetName || headerRowIndex === null) return
    setBusy(true)
    setError(null)
    try {
      const result = await window.api.importCommit({
        filePath,
        sheetName,
        headerRowIndex,
        columnMap,
        campaignName: campaignName || fileLabel,
        fallbackDate,
        saveAsTemplateName: saveTemplate ? templateName || fileLabel : undefined,
        templateAgency: saveTemplate ? templateAgency || undefined : undefined
      })
      setCommitResult(result)
    } catch (e) {
      setError(String((e as Error)?.message ?? e))
    } finally {
      setBusy(false)
    }
  }

  function resetAll(): void {
    setStep(1)
    setFilePath(null)
    setFileLabel('')
    setSheets([])
    setSheetName(null)
    setPreviewGrid(null)
    setHeaderRowIndex(null)
    setColumnMap([])
    setCampaignName('')
    setFallbackDate(todayISO())
    setPreviewResult(null)
    setSaveTemplate(true)
    setTemplateName('')
    setTemplateAgency('')
    setCommitResult(null)
    setError(null)
  }

  if (commitResult) {
    return (
      <div className="flex flex-col gap-4 p-6 max-w-2xl">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-success/30 bg-success/5 py-12 text-center">
          <CheckCircle2 className="size-10 text-success" />
          <h2 className="text-lg font-semibold">Импорт завершён</h2>
          <p className="text-sm text-muted-foreground">
            {commitResult.placementCount} размещений, {commitResult.metricValueCount} значений
            метрик записано в базу.
          </p>
          {commitResult.warnings.length > 0 && (
            <p className="text-xs text-muted-foreground max-w-md">
              Пропущено строк: {commitResult.skippedRowCount} из {commitResult.totalRowsRead}.
              Подробности — ниже.
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <Button asChild>
              <Link to="/">На дашборд</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/data">К данным</Link>
            </Button>
            <Button variant="ghost" onClick={resetAll}>
              Импортировать ещё файл
            </Button>
          </div>
        </div>
        {commitResult.warnings.length > 0 && <WarningsList warnings={commitResult.warnings} />}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Импорт медиаплана</h1>
      </div>
      <Stepper step={step} />

      {error && <Alert variant="destructive">{error}</Alert>}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Файл</CardTitle>
            <CardDescription>Excel-файл медиаплана или отчёта от агентства</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              onClick={handleSelectFile}
              variant={filePath ? 'outline' : 'default'}
              className="w-fit"
            >
              <FileUp /> {filePath ? 'Выбрать другой файл' : 'Выбрать файл'}
            </Button>
            {filePath && (
              <div className="flex flex-col gap-3 rounded-md border border-border p-3">
                <p className="text-sm">
                  Файл: <span className="font-medium">{fileLabel}</span>
                </p>
                {sheets.length > 1 && (
                  <div className="flex flex-col gap-1.5 w-64">
                    <Label>Лист</Label>
                    <Select value={sheetName ?? undefined} onValueChange={setSheetName}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sheets.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end">
              <Button disabled={!filePath || !sheetName} onClick={goToStep2}>
                Далее
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Лист и строка заголовков</CardTitle>
            <CardDescription>Кликните на строку, где находятся названия колонок</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {busy || !previewGrid ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Загрузка файла…
              </p>
            ) : (
              <div className="max-h-96 overflow-auto rounded-md border border-border">
                <Table>
                  <TableBody>
                    {previewGrid.map((row, r) => (
                      <TableRow
                        key={r}
                        onClick={() => setHeaderRowIndex(r)}
                        className={
                          headerRowIndex === r
                            ? 'cursor-pointer bg-primary/10 hover:bg-primary/15'
                            : 'cursor-pointer'
                        }
                      >
                        <TableCell className="text-xs text-muted-foreground w-10">
                          {r + 1}
                        </TableCell>
                        {row.slice(0, 10).map((cell, c) => (
                          <TableCell key={c} className="max-w-[140px] truncate text-xs">
                            {cellText(cell)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Назад
              </Button>
              <Button disabled={headerRowIndex === null} onClick={goToStep3}>
                Далее
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Маппинг колонок</CardTitle>
            <CardDescription>
              Роли подобраны автоматически — проверьте и поправьте, где нужно
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="max-h-[28rem] overflow-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Заголовок</TableHead>
                    <TableHead>Пример</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead colSpan={2}>Роль</TableHead>
                    <TableHead className="text-right">Уверенность</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {columnMap.map((mapping) => (
                    <ColumnMapRow
                      key={mapping.columnIndex}
                      mapping={mapping}
                      sample={cellText(
                        previewGrid?.[(headerRowIndex ?? 0) + 1]?.[mapping.columnIndex]
                      )}
                      onChange={(next) =>
                        setColumnMap((prev) =>
                          prev.map((m) => (m.columnIndex === next.columnIndex ? next : m))
                        )
                      }
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
            {!columnMap.some((c) => c.role.type === 'dimension' && c.role.field === 'channel') && (
              <Alert variant="warning">
                Не выбрана колонка «Канал» — без неё строки не будут импортированы. Отметьте нужную
                колонку как измерение «Канал».
              </Alert>
            )}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>
                Назад
              </Button>
              <Button
                disabled={
                  !columnMap.some((c) => c.role.type === 'dimension' && c.role.field === 'channel')
                }
                onClick={() => setStep(4)}
              >
                Далее
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Проверка перед импортом</CardTitle>
            <CardDescription>Что реально попадёт в базу</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 max-w-lg">
              <div className="flex flex-col gap-1.5">
                <Label>Название кампании</Label>
                <Input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder={fileLabel}
                />
              </div>
              {!hasDateColumn && (
                <div className="flex flex-col gap-1.5">
                  <Label>Дата (колонка с датой не выбрана)</Label>
                  <Input
                    type="date"
                    value={fallbackDate}
                    onChange={(e) => setFallbackDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            <Button onClick={runPreview} disabled={busy} className="w-fit">
              {busy && <Loader2 className="size-4 animate-spin" />} Проверить
            </Button>

            {previewResult && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <MiniStat
                    label="Строк будет импортировано"
                    value={String(previewResult.totalNormalizedRows)}
                  />
                  <MiniStat label="Строк пропущено" value={String(previewResult.skippedRowCount)} />
                  <MiniStat
                    label="Бюджет план"
                    value={formatCurrency(previewResult.planSums.spend)}
                  />
                  <MiniStat
                    label="Бюджет факт"
                    value={formatCurrency(previewResult.factSums.spend)}
                  />
                  <MiniStat
                    label="Показы план"
                    value={formatInt(previewResult.planSums.impressions)}
                  />
                  <MiniStat
                    label="Показы факт"
                    value={formatInt(previewResult.factSums.impressions)}
                  />
                  <MiniStat label="Клики план" value={formatInt(previewResult.planSums.clicks)} />
                  <MiniStat label="Клики факт" value={formatInt(previewResult.factSums.clicks)} />
                </div>

                {previewResult.warnings.length > 0 && (
                  <WarningsList warnings={previewResult.warnings} />
                )}

                <div className="max-h-72 overflow-auto rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Канал</TableHead>
                        <TableHead>Размещение</TableHead>
                        <TableHead>Дата</TableHead>
                        <TableHead>Метрик</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewResult.sampleRows.map((row: NormalizedRow, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{row.channel}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {row.placementName}
                          </TableCell>
                          <TableCell>{row.date}</TableCell>
                          <TableCell>{Object.keys(row.metrics).length}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(3)}>
                Назад
              </Button>
              <Button disabled={!previewResult} onClick={() => setStep(5)}>
                Далее
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Импорт</CardTitle>
            <CardDescription>Сохранить маппинг как шаблон и записать данные в базу</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={saveTemplate}
                onChange={(e) => setSaveTemplate(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Сохранить как шаблон маппинга
            </label>
            {saveTemplate && (
              <div className="grid grid-cols-2 gap-3 max-w-lg">
                <div className="flex flex-col gap-1.5">
                  <Label>Название шаблона</Label>
                  <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Агентство (опционально)</Label>
                  <Input
                    value={templateAgency}
                    onChange={(e) => setTemplateAgency(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(4)}>
                Назад
              </Button>
              <Button onClick={handleCommit} disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />} Импортировать в базу
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <CardValue className="text-lg mt-0.5">{value}</CardValue>
    </div>
  )
}

function WarningsList({ warnings }: { warnings: string[] }): React.JSX.Element {
  return (
    <Alert variant="warning" className="flex-col items-stretch">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="size-4" /> Предупреждения ({warnings.length})
      </div>
      <ul className="mt-1 max-h-32 list-disc overflow-auto pl-5 text-xs">
        {warnings.slice(0, 50).map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
    </Alert>
  )
}
