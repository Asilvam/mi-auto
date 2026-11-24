export type DisplayRouteGeometry = { type: 'LineString'; coordinates: [number, number][] } | null | undefined

export function hasRouteGeometry(geometry: DisplayRouteGeometry): geometry is Exclude<DisplayRouteGeometry, null | undefined> {
  return Boolean(geometry?.coordinates.length)
}
