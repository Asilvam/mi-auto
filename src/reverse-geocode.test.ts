import { describe, expect, it, vi } from 'vitest'
import { reverseGeocodeMapbox } from './reverse-geocode'

describe('reverseGeocodeMapbox', () => {
  it('looks up an address from the selected map coordinates', async () => {
    const client = { get: vi.fn().mockResolvedValue({ data: { features: [{ properties: { full_address: 'Pasaje 2, Quintero, Valparaíso, Chile' } }] } }) }

    await expect(reverseGeocodeMapbox([-71.53, -32.8], 'public-token', client))
      .resolves.toBe('Pasaje 2, Quintero, Valparaíso, Chile')
    const requestUrl = new URL(client.get.mock.calls[0][0] as string)
    expect(requestUrl.pathname).toBe('/search/geocode/v6/reverse')
    expect(requestUrl.searchParams.get('longitude')).toBe('-71.53')
    expect(requestUrl.searchParams.get('latitude')).toBe('-32.8')
    expect(requestUrl.searchParams.get('country')).toBe('cl')
    expect(requestUrl.searchParams.get('permanent')).toBe('true')
  })

  it('falls back to the formatted place when a full address is unavailable', async () => {
    const client = { get: vi.fn().mockResolvedValue({ data: { features: [{ properties: { name: 'Quintero', place_formatted: 'Valparaíso, Chile' } }] } }) }

    await expect(reverseGeocodeMapbox([-71.53, -32.8], 'public-token', client))
      .resolves.toBe('Quintero, Valparaíso, Chile')
  })

  it('rejects when Mapbox cannot return a point address', async () => {
    const client = { get: vi.fn().mockRejectedValue(new Error('network error')) }
    await expect(reverseGeocodeMapbox([-71.53, -32.8], 'public-token', client))
      .rejects.toThrow('Mapbox no pudo encontrar la dirección de este punto.')
  })
})
