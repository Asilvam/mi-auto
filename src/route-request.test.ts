import { describe, expect, it } from 'vitest'
import { appendDeliveryStop, buildRouteRequest } from './route-request'

describe('buildRouteRequest', () => {
  it('keeps shared trips separate and anchored at the vehicle base', () => {
    expect(buildRouteRequest({
      mode: 'Viaje compartido', baseAddress: ' Base Quintero ', destination: 'Plaza de Quintero',
      stops: ['No debe mezclarse'], tollsClp: 500, participantCount: 3,
    })).toEqual({
      origin: 'Base Quintero', destination: 'Plaza de Quintero', stops: [], type: 'shared', tollsClp: 500, participantCount: 3,
    })
  })

  it('sends the exact map-picked coordinates for a shared trip destination', () => {
    expect(buildRouteRequest({
      mode: 'Viaje compartido', baseAddress: 'Base Quintero', destination: 'Pasaje 2, Quintero',
      destinationCoordinates: [-71.53, -32.8], stops: [], tollsClp: 0, participantCount: 2,
    })).toMatchObject({ destination: 'Pasaje 2, Quintero', destinationCoordinates: [-71.53, -32.8] })
  })

  it('sends delivery stops with the base as both route endpoints', () => {
    expect(buildRouteRequest({
      mode: 'Delivery', baseAddress: ' Base Quintero ', destination: 'Ignored',
      stops: ['Cliente 1', 'Cliente 2'], tollsClp: 0, participantCount: 1,
    })).toEqual({
      origin: 'Base Quintero', destination: 'Base Quintero', stops: ['Cliente 1', 'Cliente 2'], type: 'delivery', tollsClp: 0, participantCount: 1,
    })
  })
})

describe('appendDeliveryStop', () => {
  it('preserves existing delivery stops and appends the newly selected address', () => {
    expect(appendDeliveryStop(['Parada A'], 'Parada B')).toEqual(['Parada A', 'Parada B'])
  })
})
