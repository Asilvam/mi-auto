import { describe, expect, it } from 'vitest'
import { monthMetrics, weekDistance } from './trip-metrics'

describe('trip dashboard metrics', () => {
  const today = new Date(2026, 10, 24, 12)

  it('sums only this month for the monthly cards while counting all saved routes', () => {
    expect(monthMetrics([
      { dateISO: new Date(2026, 10, 2).toISOString(), km: 10.5, amount: 1200 },
      { dateISO: new Date(2026, 9, 30).toISOString(), km: 7, amount: 800 },
    ], today)).toEqual({ routeCount: 2, monthKm: 10.5, monthSpend: 1200 })
  })

  it('groups kilometers over the last seven calendar days and scales the chart', () => {
    const result = weekDistance([
      { dateISO: new Date(2026, 10, 24, 8).toISOString(), km: 8, amount: 0 },
      { dateISO: new Date(2026, 10, 24, 9).toISOString(), km: 4, amount: 0 },
      { dateISO: new Date(2026, 9, 30).toISOString(), km: 99, amount: 0 },
    ], today)
    expect(result).toHaveLength(7)
    expect(result[result.length - 1]).toMatchObject({ km: 12, height: 90 })
    expect(result.some((day) => day.km === 99)).toBe(false)
  })
})
