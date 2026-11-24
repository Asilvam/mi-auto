import { describe, expect, it } from 'vitest'
import { BASE_AREA_ZOOM, basePickerMarkerCoordinates, canvasPointFromClick, mapStartView, QUINTERO_CENTER } from './base-map'

describe('mapStartView', () => {
  it('centers at the saved vehicle base with a close neighborhood zoom', () => {
    expect(mapStartView([-71.5, -32.8])).toEqual({ center: [-71.5, -32.8], zoom: BASE_AREA_ZOOM })
    expect(BASE_AREA_ZOOM).toBeGreaterThanOrEqual(16)
  })

  it('uses Quintero overview when no base has been saved', () => {
    expect(mapStartView()).toEqual({ center: QUINTERO_CENTER, zoom: 12 })
  })
})

describe('basePickerMarkerCoordinates', () => {
  it('shows the selected base point only while the base picker is open', () => {
    const coordinates = [-71.5, -32.8] as [number, number]
    expect(basePickerMarkerCoordinates(true, coordinates)).toEqual(coordinates)
    expect(basePickerMarkerCoordinates(false, coordinates)).toBeNull()
  })

  it('waits for a point when the picker has no saved coordinates', () => {
    expect(basePickerMarkerCoordinates(true, null)).toBeNull()
  })
})

describe('canvasPointFromClick', () => {
  it('converts viewport click coordinates to map canvas coordinates', () => {
    expect(canvasPointFromClick(270, 480, { left: 20, top: 110 })).toEqual([250, 370])
  })
})
