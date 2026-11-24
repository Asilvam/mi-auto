import type { MapCoordinates } from './base-map'
import axios, { type AxiosInstance } from 'axios'

type ReverseGeocodeResponse = {
  features?: Array<{
    properties?: {
      full_address?: string
      name?: string
      place_formatted?: string
    }
  }>
}

export async function reverseGeocodeMapbox(
  coordinates: MapCoordinates,
  token: string | undefined,
  client: Pick<AxiosInstance, 'get'> = axios,
): Promise<string | null> {
  if (!token) throw new Error('Falta configurar el token público de Mapbox.')

  const query = new URLSearchParams({
    longitude: String(coordinates[0]),
    latitude: String(coordinates[1]),
    country: 'cl',
    types: 'address,street,neighborhood,locality,place',
    permanent: 'true',
    access_token: token,
  })
  let data: ReverseGeocodeResponse
  try {
    const response = await client.get<ReverseGeocodeResponse>(`https://api.mapbox.com/search/geocode/v6/reverse?${query}`, {
      signal: AbortSignal.timeout(10_000),
    })
    data = response.data
  } catch {
    throw new Error('Mapbox no pudo encontrar la dirección de este punto.')
  }
  const properties = data.features?.[0]?.properties
  return properties?.full_address
    ?? ([properties?.name, properties?.place_formatted].filter(Boolean).join(', ') || null)
}
