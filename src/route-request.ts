export type RouteMode = 'Viaje compartido' | 'Delivery'

export function appendDeliveryStop(stops: string[], address: string) {
  return [...stops, address]
}

type RouteRequestInput = {
  mode: RouteMode
  baseAddress: string
  destination: string
  stops: string[]
  tollsClp: number
  participantCount: number
  destinationCoordinates?: [number, number] | null
}

export function buildRouteRequest({ mode, baseAddress, destination, stops, tollsClp, participantCount, destinationCoordinates }: RouteRequestInput) {
  const isDelivery = mode === 'Delivery'
  const base = baseAddress.trim()
  return {
    origin: base,
    destination: isDelivery ? base : destination,
    stops: isDelivery ? stops : [],
    type: isDelivery ? 'delivery' as const : 'shared' as const,
    tollsClp,
    participantCount,
    ...(!isDelivery && destinationCoordinates ? { destinationCoordinates } : {}),
  }
}
