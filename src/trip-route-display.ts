export type TripRouteDisplayInput = {
  mode: 'Viaje compartido' | 'Delivery'
  start: string
  end: string
  stops: string[]
}

export function tripRouteDisplay({ mode, start, end, stops }: TripRouteDisplayInput) {
  if (mode === 'Delivery') {
    const stopCount = stops.length
    const label = `${stopCount} parada${stopCount === 1 ? '' : 's'}`
    return {
      title: `Delivery · ${label}`,
      subtitle: stops.length ? `${start} → ${stops.join(' → ')}` : `${start} → ${end}`,
    }
  }

  return { title: start, subtitle: `→ ${end}` }
}
