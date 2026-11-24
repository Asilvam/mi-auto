import { describe, expect, it } from 'vitest'
import { BASE_AREA_ZOOM, mapStartView, QUINTERO_CENTER } from './base-map'

describe('mapStartView', () => {
  it('centers at the saved vehicle base with a close neighborhood zoom', () => {
    expect(mapStartView([-71.5, -32.8])).toEqual({ center: [-71.5, -32.8], zoom: BASE_AREA_ZOOM })
    expect(BASE_AREA_ZOOM).toBeGreaterThanOrEqual(16)
  })

  it('uses Quintero overview when no base has been saved', () => {
    expect(mapStartView()).toEqual({ center: QUINTERO_CENTER, zoom: 12 })
  })
})
