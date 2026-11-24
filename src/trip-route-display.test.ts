import { describe, expect, it } from 'vitest'
import { tripRouteDisplay } from './trip-route-display'

describe('tripRouteDisplay', () => {
  it('shows shared trip origin and destination once instead of repeating the full route', () => {
    expect(tripRouteDisplay({ mode: 'Viaje compartido', start: 'Quintero', end: 'Viña del Mar', stops: [] })).toEqual({
      title: 'Quintero',
      subtitle: '→ Viña del Mar',
    })
  })

  it('shows the number and ordered addresses of delivery stops', () => {
    expect(tripRouteDisplay({ mode: 'Delivery', start: 'Base Quintero', end: 'Base Quintero', stops: ['Dirección 1', 'Dirección 2'] })).toEqual({
      title: 'Delivery · 2 paradas',
      subtitle: 'Base Quintero → Dirección 1 → Dirección 2',
    })
  })
})
