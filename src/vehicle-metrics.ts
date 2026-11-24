export type VehicleTripMetric = { km: number; fuel: number }

export function litersPer100FromKmPerLiter(kmPerLiter: number) {
  return kmPerLiter > 0 ? 100 / kmPerLiter : 0
}

export function registeredKilometers(trips: VehicleTripMetric[]) {
  return trips.reduce((sum, trip) => sum + Math.max(0, trip.km || 0), 0)
}

export function recordedFuelSpend(trips: VehicleTripMetric[]) {
  return trips.reduce((sum, trip) => sum + Math.max(0, trip.fuel || 0), 0)
}
