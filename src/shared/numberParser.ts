/**
 * Parses numbers out of the mess that real agency spreadsheets contain:
 * currency symbols, thousand separators (space/NBSP/comma/dot), a decimal
 * comma OR dot, percent suffixes, K/M/тыс/млн magnitude suffixes, dashes
 * used as "no value", and native Excel numeric cells.
 *
 * Returns `null` when the input cannot be read as a number — callers
 * decide whether that is an error or an intentional blank.
 */

const CURRENCY_SYMBOLS = /[₸$€₽¥£]/g

// Values commonly used in spreadsheets to mean "no data".
const EMPTY_TOKENS = new Set(['', '-', '–', '—', 'n/a', 'na', 'nan', 'null', '#n/a', '#div/0!'])

const MAGNITUDE_SUFFIXES: Record<string, number> = {
  k: 1_000,
  тыс: 1_000,
  m: 1_000_000,
  млн: 1_000_000,
  b: 1_000_000_000,
  млрд: 1_000_000_000
}

export function parseNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null

  let s = String(raw).trim()
  if (EMPTY_TOKENS.has(s.toLowerCase())) return null
  if (s === '') return null

  // Excel formula error strings, e.g. "#REF!"
  if (s.startsWith('#')) return null

  let sign = 1
  // Accounting-style negatives: (1 234)
  if (/^\(.*\)$/.test(s)) {
    sign = -1
    s = s.slice(1, -1)
  }
  if (s.startsWith('-')) {
    sign = -1
    s = s.slice(1)
  } else if (s.startsWith('+')) {
    s = s.slice(1)
  }

  s = s.replace(CURRENCY_SYMBOLS, '').trim()

  let isPercent = false
  if (s.endsWith('%')) {
    isPercent = true
    s = s.slice(0, -1).trim()
  }

  let magnitude = 1
  const suffixMatch = s.match(/([a-zA-Zа-яА-Я]+)\s*$/)
  if (suffixMatch) {
    const suffix = suffixMatch[1].toLowerCase()
    if (suffix in MAGNITUDE_SUFFIXES) {
      magnitude = MAGNITUDE_SUFFIXES[suffix]
      s = s.slice(0, -suffixMatch[1].length).trim()
    } else {
      // Unrecognized trailing letters (a stray unit, a typo) — not a number.
      return null
    }
  }

  // Strip all whitespace (incl. NBSP / narrow NBSP used as thousand separators)
  s = s.replace(/[\s\u00A0\u202F]/g, '')
  if (s === '') return null

  const hasComma = s.includes(',')
  const hasDot = s.includes('.')

  if (hasComma && hasDot) {
    // Whichever separator appears last is the decimal separator.
    const lastComma = s.lastIndexOf(',')
    const lastDot = s.lastIndexOf('.')
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.')
    } else {
      s = s.replace(/,/g, '')
    }
  } else if (hasComma) {
    // Single separator type: a comma is a decimal mark only when it looks
    // like one (1-2 trailing digits, single occurrence) — "12,5" → 12.5,
    // but "1,234,567" (thousands) → 1234567.
    const parts = s.split(',')
    const looksDecimal = parts.length === 2 && parts[1].length <= 2
    s = looksDecimal ? s.replace(',', '.') : s.replace(/,/g, '')
  } else if (hasDot) {
    const parts = s.split('.')
    const looksThousands =
      parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3)
    if (looksThousands && parts.every((p, i) => (i === 0 ? p.length <= 3 : p.length === 3))) {
      s = s.replace(/\./g, '')
    }
    // otherwise leave as-is: "12.5" stays a decimal
  }

  if (!/^\d+(\.\d+)?$/.test(s)) return null

  const n = parseFloat(s)
  if (!Number.isFinite(n)) return null

  const value = n * magnitude * (isPercent ? 0.01 : 1) * sign
  return value
}

/** True if the raw cell parses to a usable number. Convenience wrapper. */
export function isParsableNumber(raw: unknown): boolean {
  return parseNumber(raw) !== null
}
