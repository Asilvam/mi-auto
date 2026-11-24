export type TripMetric = { dateISO: string; km: number; amount: number }

export function monthMetrics(trips: TripMetric[], today = new Date()) {
  const monthTrips = trips.filter((trip) => {
    const date = new Date(trip.dateISO)
    return Number.isFinite(date.getTime()) && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()
  })
  return {
    routeCount: trips.length,
    monthKm: monthTrips.reduce((sum, trip) => sum + trip.km, 0),
    monthSpend: monthTrips.reduce((sum, trip) => sum + trip.amount, 0),
  }
}

export function weekDistance(trips: TripMetric[], today = new Date()) {
  const firstDay = new Date(today)
  firstDay.setHours(0, 0, 0, 0)
  firstDay.setDate(firstDay.getDate() - 6)
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(firstDay)
    date.setDate(firstDay.getDate() + index)
    const km = trips.filter((trip) => {
      const saved = new Date(trip.dateISO)
      return saved.getFullYear() === date.getFullYear() && saved.getMonth() === date.getMonth() && saved.getDate() === date.getDate()
    }).reduce((sum, trip) => sum + trip.km, 0)
    return { day: new Intl.DateTimeFormat('es-CL', { weekday: 'short' }).format(date).replace('.', ''), km }
  })
  const maxKm = Math.max(...days.map((day) => day.km), 1)
  return days.map(({ day, km }) => ({ day, km, height: km ? Math.max(7, km / maxKm * 90) : 4 }))
}
