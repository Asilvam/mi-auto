import { describe, expect, it } from 'vitest'
import { API_REQUEST_TIMEOUT_MS, isWaitingForWorkspace, needsWorkspaceRetry, STARTUP_TIMEOUT_MS } from './app-startup'

describe('workspace startup states', () => {
  it('allows API requests to reach their timeout before showing the startup error', () => {
    expect(STARTUP_TIMEOUT_MS).toBeGreaterThan(API_REQUEST_TIMEOUT_MS)
  })

  it('waits while authentication or account data is loading before the limit', () => {
    expect(isWaitingForWorkspace(true, false, false, false)).toBe(true)
    expect(isWaitingForWorkspace(false, true, false, false)).toBe(true)
  })

  it('shows a recoverable error after the startup limit instead of waiting forever', () => {
    expect(isWaitingForWorkspace(true, false, false, true)).toBe(false)
    expect(needsWorkspaceRetry(true, false, false, true)).toBe(true)
    expect(needsWorkspaceRetry(false, true, false, true)).toBe(true)
  })

  it('does not show the error after startup completes', () => {
    expect(needsWorkspaceRetry(false, true, true, true)).toBe(false)
    expect(isWaitingForWorkspace(false, true, true, false)).toBe(false)
  })
})
