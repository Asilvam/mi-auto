import { describe, expect, it } from 'vitest'
import { hasRouteGeometry } from './route-display'

describe('hasRouteGeometry', () => {
  it('returns false when changing route mode clears the displayed route', () => {
    expect(hasRouteGeometry(undefined)).toBe(false)
    expect(hasRouteGeometry({ type: 'LineString', coordinates: [] })).toBe(false)
  })

  it('returns true when a new route has coordinates to display', () => {
    expect(hasRouteGeometry({ type: 'LineString', coordinates: [[-71.53, -32.78]] })).toBe(true)
  })
})
