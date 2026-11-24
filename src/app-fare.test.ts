import { describe, expect, it } from 'vitest'
import { estimateAppPassengerFare, estimateDriverEarnings } from './app-fare'

describe('app fare reference', () => {
  it('estimates a passenger fare from the one-way distance and duration with a minimum', () => {
    expect(estimateAppPassengerFare(0, 0)).toBe(1500)
    expect(estimateAppPassengerFare(10000, 800)).toBe(5191)
  })

  it('separates gross fare, platform fee and driver net', () => {
    expect(estimateDriverEarnings(10000, 25)).toEqual({
      grossFareClp: 10000,
      platformFeeClp: 2500,
      netDriverEarningsClp: 7500,
      commissionPercent: 25,
    })
  })

  it('clamps a commission to the supported range', () => {
    expect(estimateDriverEarnings(10000, 120)).toMatchObject({ platformFeeClp: 10000, netDriverEarningsClp: 0, commissionPercent: 100 })
  })
})
