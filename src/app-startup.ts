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
