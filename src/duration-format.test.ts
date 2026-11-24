import { describe, expect, it } from 'vitest'
import { formatDuration } from './duration-format'

describe('formatDuration', () => {
  it('formats minutes and hours for route estimates', () => {
    expect(formatDuration(65)).toBe('1 min')
    expect(formatDuration(3660)).toBe('1 h 1 min')
  })

  it('shows a placeholder when an old trip has no duration', () => {
    expect(formatDuration(0)).toBe('—')
  })
})
