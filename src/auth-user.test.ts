import { describe, expect, it } from 'vitest'
import { normalizeAuthUser } from './auth-user'

describe('normalizeAuthUser', () => {
  it('normalizes the MongoDB _id returned when refreshing a session', () => {
    expect(normalizeAuthUser({ _id: 'user-123', email: 'driver@example.com', name: 'Alex', pictureUrl: 'avatar.png' })).toEqual({
      id: 'user-123',
      email: 'driver@example.com',
      name: 'Alex',
      pictureUrl: 'avatar.png',
    })
  })

  it('keeps the id returned by Google login', () => {
    expect(normalizeAuthUser({ id: 'user-456', email: 'driver@example.com' })).toEqual({
      id: 'user-456',
      email: 'driver@example.com',
      name: '',
      pictureUrl: '',
    })
  })

  it('rejects a user payload without an identifier', () => {
    expect(() => normalizeAuthUser({ email: 'driver@example.com' })).toThrow('La sesión no contiene un identificador de usuario.')
  })
})
