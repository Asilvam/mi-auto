export function splitSharedTripCost(totalCostClp: number, participantCount: number) {
  const total = Math.max(0, Math.round(totalCostClp))
  const participants = Number.isFinite(participantCount)
    ? Math.max(1, Math.floor(participantCount))
    : 1

  return {
    totalCostClp: total,
    participantCount: participants,
    costPerParticipantClp: Math.ceil(total / participants),
  }
}
