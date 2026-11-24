export type MapCoordinates = [longitude: number, latitude: number]

export const QUINTERO_CENTER: MapCoordinates = [-71.5333, -32.7833]
// At common laptop and tablet widths this frames roughly eight city blocks.
export const BASE_AREA_ZOOM = 16.2

export function mapStartView(baseCoordinates?: MapCoordinates | null) {
  return baseCoordinates
    ? { center: baseCoordinates, zoom: BASE_AREA_ZOOM }
    : { center: QUINTERO_CENTER, zoom: 12 }
}

export function basePickerMarkerCoordinates(isPickingBase: boolean, baseCoordinates: MapCoordinates | null) {
  return isPickingBase ? baseCoordinates : null
}

export function canvasPointFromClick(clientX: number, clientY: number, canvasRect: { left: number; top: number }): [number, number] {
  return [clientX - canvasRect.left, clientY - canvasRect.top]
}
