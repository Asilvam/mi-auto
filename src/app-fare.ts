export const DEFAULT_PLATFORM_COMMISSION_PERCENT = 25

// Public Cabify Valparaíso passenger tariff used only as a local comparison model.
export const CABIFY_VALPARAISO_REFERENCE = {
  baseFareClp: 724,
  farePerKmClp: 320,
  farePerKmOver50Clp: 1110,
  farePerMinuteClp: 95,
  minimumFareClp: 1500,
} as const

export function estimateAppPassengerFare(distanceMeters: number, durationSeconds: number) {
  const distanceKm = Math.max(0, distanceMeters) / 1000
  const durationMinutes = Math.max(0, durationSeconds) / 60
  const ratePerKm = distanceKm > 50
    ? CABIFY_VALPARAISO_REFERENCE.farePerKmOver50Clp
    : CABIFY_VALPARAISO_REFERENCE.farePerKmClp
  const meterFare = CABIFY_VALPARAISO_REFERENCE.baseFareClp
    + distanceKm * ratePerKm
    + durationMinutes * CABIFY_VALPARAISO_REFERENCE.farePerMinuteClp

  return Math.max(CABIFY_VALPARAISO_REFERENCE.minimumFareClp, Math.round(meterFare))
}

export function estimateDriverEarnings(grossFareClp: number, commissionPercent: number) {
  const gross = Math.max(0, Math.round(grossFareClp))
  const commission = Math.min(100, Math.max(0, Number.isFinite(commissionPercent) ? commissionPercent : DEFAULT_PLATFORM_COMMISSION_PERCENT))
  const platformFeeClp = Math.round(gross * commission / 100)
  return { grossFareClp: gross, platformFeeClp, netDriverEarningsClp: gross - platformFeeClp, commissionPercent: commission }
}
