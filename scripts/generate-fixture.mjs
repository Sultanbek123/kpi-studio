// Generates a deliberately messy synthetic Samsung KZ media plan, used to
// exercise the import wizard end-to-end without a real agency file.
// Run: node scripts/generate-fixture.mjs
import ExcelJS from 'exceljs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '..', 'fixtures', 'samsung_kz_media_plan_sample.xlsx')

const wb = new ExcelJS.Workbook()
const sheet = wb.addWorksheet('Media Plan')

// Row 1: a title row above the real header — the wizard's "click the
// header row" step must skip this, not assume row 1 is always the header.
sheet.mergeCells('A1:M1')
sheet.getCell('A1').value = 'Samsung Electronics Kazakhstan — Media Plan Q3 2026 (draft v3)'
sheet.getCell('A1').font = { bold: true }

// Row 2: blank spacer row.

// Row 3: a merged group-header row above the real column names — common
// in agency files, and irrelevant once the user picks row 4 as the header.
sheet.mergeCells('F3:G3')
sheet.getCell('F3').value = 'Бюджет'
sheet.mergeCells('H3:I3')
sheet.getCell('H3').value = 'Показы'
sheet.mergeCells('J3:K3')
sheet.getCell('J3').value = 'Клики'

// Row 4: the actual header row.
const headers = [
  'Канал',
  'Кампания',
  'Плейсмент',
  'Формат',
  'Дата',
  'Бюджет план',
  'Бюджет факт',
  'Показы план',
  'Показы факт',
  'Клики план',
  'Клики факт',
  'Охват',
  'Просмотры',
  'Комментарий'
]
sheet.getRow(4).values = headers

// Helper to push a data row after the header (row 4), values array must
// match `headers` order exactly.
let r = 5
function addRow(values) {
  sheet.getRow(r).values = values
  r++
}

// A realistic, intentionally messy set of rows.
addRow([
  'Google Ads Search',
  'Galaxy S26 Launch',
  'Search Brand',
  'Search',
  new Date('2026-08-03'),
  '1 200 000,00',
  '1 150 340,50',
  '—',
  '—',
  '18 000',
  '17 214',
  '-',
  '-',
  ''
])
addRow([
  'Google Ads YouTube',
  'Galaxy S26 Launch',
  'YouTube TrueView',
  'Video',
  new Date('2026-08-03'),
  '₸ 3 000 000',
  '₸ 2 940 000',
  '2 500 000',
  '2 410 550',
  '9 000',
  '8 802',
  '410 000',
  '1 205 400',
  'creative v2'
])
addRow([
  'Meta',
  'Galaxy S26 Launch',
  'Reels Awareness',
  'Video',
  new Date('2026-08-03'),
  2500000,
  2480500,
  3200000,
  3150200,
  15000,
  14650,
  980000,
  1890000,
  ''
])
addRow([
  'TikTok',
  'Galaxy S26 Launch',
  'In-Feed Ads',
  'Video',
  new Date('2026-08-03'),
  '1,800,000.00',
  '1,795,000.00',
  '1.5M',
  '1.46M',
  '12 000',
  '11 480',
  '650 000',
  '1 020 000',
  'ссылка на бриф: см. почту'
])
addRow([
  'Итого',
  '',
  '',
  '',
  '',
  '8 500 000',
  '8 365 840,50',
  '7 200 000',
  '7 026 750',
  '54 000',
  '52 146',
  '',
  '',
  'строка с итогами — должна быть пропущена'
])
sheet.getRow(r).values = [] // fully blank separator row
r++
addRow([
  'Yandex Direct',
  'Galaxy S26 Launch',
  'РСЯ',
  'Display',
  new Date('2026-08-10'),
  '900 000',
  '888 200',
  '4 000 000',
  '3 910 000',
  '7 500',
  '7 122',
  '-',
  '-',
  ''
])
addRow([
  'DV360',
  'Galaxy S26 Launch',
  'Programmatic Display',
  'Display',
  new Date('2026-08-10'),
  '1 400 000',
  '1 250 000',
  '9 000 000',
  '7 800 000',
  '10 000',
  '8 900',
  '2 100 000',
  '-',
  'недооткрутка — see comment'
])
addRow([
  'Kaspi Ads',
  'Galaxy S26 Launch',
  'Marketplace Banner',
  'Display',
  new Date('2026-08-10'),
  '600 000',
  '605 000',
  '1 200 000',
  '1 240 000',
  '6 000',
  '6 340',
  '-',
  '-',
  ''
])
addRow([
  '',
  'Galaxy S26 Launch',
  'без канала — тест валидации',
  'Display',
  new Date('2026-08-10'),
  '100 000',
  '95 000',
  '10 000',
  '9 000',
  '100',
  '90',
  '-',
  '-',
  'эта строка должна быть пропущена (нет канала)'
])
addRow([
  'Инфлюенсеры',
  'Galaxy S26 Launch',
  'Instagram Stories bundle',
  'UGC',
  new Date('2026-08-17'),
  '2 000 000',
  '2 000 000',
  '-',
  '-',
  '-',
  '-',
  '1 500 000',
  '-',
  'фикс. бюджет, без план/факт по показам'
])
addRow([
  'Google Ads Search',
  'Galaxy S26 Launch',
  'Search Brand',
  'Search',
  new Date('2026-08-17'),
  '1 200 000',
  '1 180 000',
  '-',
  '-',
  '18 000',
  '17 900',
  '-',
  '-',
  ''
])
addRow([
  'Meta',
  'Galaxy S26 Launch',
  'Reels Awareness',
  'Video',
  new Date('2026-08-17'),
  2500000,
  2510000,
  3200000,
  3260000,
  15000,
  15320,
  975000,
  1910000,
  ''
])

await wb.xlsx.writeFile(outPath)
console.log('Fixture written to', outPath)
