import { describe, expect, it } from 'vitest'
import { litersPer100FromKmPerLiter, recordedFuelSpend, registeredKilometers } from './vehicle-metrics'

describe('vehicle profile metrics', () => {
  it('converts km/L into L/100 km and handles invalid efficiency', () => {
    expect(litersPer100FromKmPerLiter(12.5)).toBe(8)
    expect(litersPer100FromKmPerLiter(0)).toBe(0)
  })

  it('totals only recorded route distance and fuel expense', () => {
    const trips = [{ km: 10.5, fuel: 920 }, { km: 7, fuel: 610 }, { km: -3, fuel: -4 }]
    expect(registeredKilometers(trips)).toBe(17.5)
    expect(recordedFuelSpend(trips)).toBe(1530)
  })
})
