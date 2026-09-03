import { describe, expect, it } from 'vitest'
import { parseNumber } from './numberParser'

describe('parseNumber', () => {
  it('passes through native numbers', () => {
    expect(parseNumber(42)).toBe(42)
    expect(parseNumber(0)).toBe(0)
  })

  it('reads space-separated thousands with a comma decimal (RU style)', () => {
    expect(parseNumber('1 234 567,89')).toBeCloseTo(1234567.89)
  })

  it('reads comma-separated thousands with a dot decimal (EN style)', () => {
    expect(parseNumber('1,234,567.89')).toBeCloseTo(1234567.89)
  })

  it('strips currency symbols and their own spacing', () => {
    expect(parseNumber('₸ 500 000')).toBe(500000)
    expect(parseNumber('$1,200')).toBe(1200)
  })

  it('converts percent strings to a fraction', () => {
    expect(parseNumber('12%')).toBeCloseTo(0.12)
  })

  it('applies magnitude suffixes', () => {
    expect(parseNumber('1.2M')).toBeCloseTo(1_200_000)
    expect(parseNumber('1,2M')).toBeCloseTo(1_200_000)
    expect(parseNumber('3k')).toBe(3000)
    expect(parseNumber('2 тыс')).toBe(2000)
  })

  it('treats a lone comma with 1-2 trailing digits as a decimal mark', () => {
    expect(parseNumber('12,5')).toBeCloseTo(12.5)
  })

  it('treats a lone comma with 3+ digit groups as a thousands separator', () => {
    expect(parseNumber('12,500')).toBe(12500)
  })

  it('returns null for blanks, dashes and Excel error tokens', () => {
    expect(parseNumber('')).toBeNull()
    expect(parseNumber('-')).toBeNull()
    expect(parseNumber('—')).toBeNull()
    expect(parseNumber('#DIV/0!')).toBeNull()
    expect(parseNumber(null)).toBeNull()
    expect(parseNumber(undefined)).toBeNull()
  })

  it('reads accounting-style negatives in parentheses', () => {
    expect(parseNumber('(1 234)')).toBe(-1234)
  })

  it('reads a plain negative number', () => {
    expect(parseNumber('-500')).toBe(-500)
  })

  it('rejects strings with an unrecognized trailing unit', () => {
    expect(parseNumber('42 шт')).toBeNull()
  })
})
