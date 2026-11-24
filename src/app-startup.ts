export const API_REQUEST_TIMEOUT_MS = 12_000
export const STARTUP_TIMEOUT_MS = API_REQUEST_TIMEOUT_MS + 4_000

export function isWaitingForWorkspace(
  authLoading: boolean,
  hasUser: boolean,
  dataReady: boolean,
  timedOut: boolean,
) {
  return !timedOut && (authLoading || (hasUser && !dataReady))
}

export function needsWorkspaceRetry(authLoading: boolean, hasUser: boolean, dataReady: boolean, timedOut: boolean) {
  return timedOut && (authLoading || (hasUser && !dataReady))
}
