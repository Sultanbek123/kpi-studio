import { describe, expect, it } from 'vitest'
import { aggregateBase, computeDerived, pacing } from './metrics'

describe('aggregateBase + computeDerived: group CTR is not the average of row CTRs', () => {
  it('computes CTR from summed clicks/impressions, not averaged per-row CTR', () => {
    // Row A: 100 clicks / 10,000 impressions -> CTR 1%
    // Row B: 5 clicks / 100 impressions -> CTR 5%
    // Naive average of CTRs would be 3% — wrong. Correct group CTR is
    // (100+5)/(10000+100) ≈ 1.04%.
    const { sums } = aggregateBase([
      { clicks: 100, impressions: 10000 },
      { clicks: 5, impressions: 100 }
    ])
    const ctr = computeDerived('ctr', sums)
    expect(ctr).not.toBeCloseTo(0.03)
    expect(ctr).toBeCloseTo(105 / 10100)
  })

  it('sums additive base metrics across rows', () => {
    const { sums } = aggregateBase([
      { spend: 1000, impressions: 50000 },
      { spend: 2000, impressions: 70000 }
    ])
    expect(sums.spend).toBe(3000)
    expect(sums.impressions).toBe(120000)
  })
})

describe('reach aggregation safety', () => {
  it('marks reach unreliable when more than one row contributes', () => {
    const { reach } = aggregateBase([{ reach: 1000 }, { reach: 800 }])
    expect(reach.isReliable).toBe(false)
    expect(computeDerived('frequency', { impressions: 5000 }, reach)).toBeNull()
  })

  it('trusts reach and computes frequency for a single contributing row', () => {
    const { sums, reach } = aggregateBase([{ impressions: 5000, reach: 1000 }])
    expect(reach.isReliable).toBe(true)
    expect(computeDerived('frequency', sums, reach)).toBeCloseTo(5)
  })
})

describe('derived metric formulas', () => {
  it('cpm', () => {
    expect(computeDerived('cpm', { spend: 500, impressions: 100000 })).toBeCloseTo(5)
  })

  it('cpc', () => {
    expect(computeDerived('cpc', { spend: 300, clicks: 150 })).toBeCloseTo(2)
  })

  it('roas and drr are inverses', () => {
    const sums = { spend: 1000, revenue: 4000 }
    expect(computeDerived('roas', sums)).toBeCloseTo(4)
    expect(computeDerived('drr', sums)).toBeCloseTo(0.25)
  })

  it('returns null instead of dividing by zero', () => {
    expect(computeDerived('ctr', { clicks: 10, impressions: 0 })).toBeNull()
    expect(computeDerived('cpa', { spend: 100 })).toBeNull()
  })
})

describe('pacing', () => {
  it('is 1.0 when spend exactly matches the elapsed-time share of budget', () => {
    const result = pacing({ spendPlan: 10000, spendFact: 5000, elapsedDays: 15, totalDays: 30 })
    expect(result).toBeCloseTo(1)
  })

  it('is >1 when overspending relative to elapsed time', () => {
    const result = pacing({ spendPlan: 10000, spendFact: 8000, elapsedDays: 15, totalDays: 30 })
    expect(result).toBeGreaterThan(1)
  })

  it('returns null before the flight has any elapsed budget window', () => {
    expect(pacing({ spendPlan: 0, spendFact: 0, elapsedDays: 0, totalDays: 30 })).toBeNull()
  })
})
