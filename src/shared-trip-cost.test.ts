import { describe, expect, it } from 'vitest'
import { splitSharedTripCost } from './shared-trip-cost'

describe('splitSharedTripCost', () => {
  it('shows the total and rounds the per-person share up to a whole peso', () => {
    expect(splitSharedTripCost(1000, 3)).toEqual({
      totalCostClp: 1000,
      participantCount: 3,
      costPerParticipantClp: 334,
    })
  })

  it('uses one person when the participant count is invalid', () => {
    expect(splitSharedTripCost(1500, 0)).toMatchObject({ participantCount: 1, costPerParticipantClp: 1500 })
    expect(splitSharedTripCost(1500, Number.NaN)).toMatchObject({ participantCount: 1, costPerParticipantClp: 1500 })
  })
})
