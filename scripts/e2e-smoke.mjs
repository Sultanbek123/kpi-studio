// One-shot verification run (no tmux available on this machine): launches
// the built KPI Studio app, screenshots the empty dashboard, exercises the
// real import pipeline against the dirty fixture via window.api (bypassing
// only the native OS file-picker dialog, which Playwright cannot drive),
// then screenshots the dashboard/data pages populated with real numbers.
import { _electron as electron } from 'playwright-core'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FIXTURE = path.join(APP_DIR, 'fixtures/samsung_kz_media_plan_sample.xlsx')
const SHOT_DIR = process.env.SCREENSHOT_DIR || '/tmp/kpi-studio-shots'
fs.mkdirSync(SHOT_DIR, { recursive: true })

const electronBin = path.join(
  APP_DIR,
  'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'
)

async function main() {
  const app = await electron.launch({
    executablePath: electronBin,
    args: ['--no-sandbox', APP_DIR],
    timeout: 30_000
  })
  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(800)

  await page.screenshot({ path: path.join(SHOT_DIR, '01-dashboard-empty.png') })
  console.log('01 dashboard (empty) captured')

  // Column map matching the fixture's header row exactly (row index 3,
  // 0-based) — same shape the wizard's UI would produce after auto-suggest
  // + user confirmation.
  const columnMap = [
    { columnIndex: 0, header: 'Канал', role: { type: 'dimension', field: 'channel' } },
    { columnIndex: 1, header: 'Кампания', role: { type: 'dimension', field: 'campaign' } },
    { columnIndex: 2, header: 'Плейсмент', role: { type: 'dimension', field: 'placement' } },
    { columnIndex: 3, header: 'Формат', role: { type: 'dimension', field: 'format' } },
    { columnIndex: 4, header: 'Дата', role: { type: 'dimension', field: 'date' } },
    {
      columnIndex: 5,
      header: 'Бюджет план',
      role: { type: 'metric', metric: 'spend', kind: 'plan' }
    },
    {
      columnIndex: 6,
      header: 'Бюджет факт',
      role: { type: 'metric', metric: 'spend', kind: 'fact' }
    },
    {
      columnIndex: 7,
      header: 'Показы план',
      role: { type: 'metric', metric: 'impressions', kind: 'plan' }
    },
    {
      columnIndex: 8,
      header: 'Показы факт',
      role: { type: 'metric', metric: 'impressions', kind: 'fact' }
    },
    {
      columnIndex: 9,
      header: 'Клики план',
      role: { type: 'metric', metric: 'clicks', kind: 'plan' }
    },
    {
      columnIndex: 10,
      header: 'Клики факт',
      role: { type: 'metric', metric: 'clicks', kind: 'fact' }
    },
    { columnIndex: 11, header: 'Охват', role: { type: 'metric', metric: 'reach', kind: 'fact' } },
    {
      columnIndex: 12,
      header: 'Просмотры',
      role: { type: 'metric', metric: 'views', kind: 'fact' }
    },
    { columnIndex: 13, header: 'Комментарий', role: { type: 'ignore' } }
  ]

  const previewResult = await page.evaluate(
    async ({ filePath, columnMap }) => {
      const sheets = await window.api.excelListSheets(filePath)
      const preview = await window.api.importPreview({
        filePath,
        sheetName: sheets[0],
        headerRowIndex: 3,
        columnMap,
        campaignName: 'Galaxy S26 Launch',
        fallbackDate: '2026-08-01'
      })
      return { sheets, preview }
    },
    { filePath: FIXTURE, columnMap }
  )
  console.log('import:preview result:', JSON.stringify(previewResult, null, 2))

  const commitResult = await page.evaluate(
    async ({ filePath, columnMap }) => {
      const sheets = await window.api.excelListSheets(filePath)
      return window.api.importCommit({
        filePath,
        sheetName: sheets[0],
        headerRowIndex: 3,
        columnMap,
        campaignName: 'Galaxy S26 Launch',
        fallbackDate: '2026-08-01',
        saveAsTemplateName: 'Fixture Agency Template',
        templateAgency: 'Test Agency'
      })
    },
    { filePath: FIXTURE, columnMap }
  )
  console.log('import:commit result:', JSON.stringify(commitResult, null, 2))

  // Now drive the actual UI: go to dashboard, then data page.
  await page.evaluate(() => (window.location.hash = '#/'))
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(SHOT_DIR, '02-dashboard-populated.png') })
  console.log('02 dashboard (populated) captured')

  await page.evaluate(() => (window.location.hash = '#/data'))
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(SHOT_DIR, '03-data-page.png') })
  console.log('03 data page captured')

  await page.evaluate(() => (window.location.hash = '#/import'))
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(SHOT_DIR, '04-import-step1.png') })
  console.log('04 import step1 captured')

  await page.evaluate(() => (window.location.hash = '#/templates'))
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(SHOT_DIR, '05-templates-page.png') })
  console.log('05 templates page captured')

  await app.close()
  console.log('DONE')
}

main().catch((e) => {
  console.error('FAILED', e)
  process.exit(1)
})
