/**
 * Marks the sessions whose current turn was started from a remote controller.
 *
 * A turn driven from the phone ends with the desktop window unfocused by
 * definition, so the normal task-notification policy (notify unless the
 * finished chat is visible in a focused window) fires a banner for every
 * single remote message. The person who sent the message is watching the
 * answer on the phone; the desktop banner is noise with a badge that never
 * stops growing.
 *
 * The flag is set when a remote prompt arrives and consumed once — at that
 * turn's finalization. A later prompt typed locally re-arms notifications.
 */
const remoteTurns = new Map<string, number>();

/** A remote prompt entered this session; its completion is not news. */
export function markRemoteDrivenTurn(sessionId: string): void {
  if (!sessionId) return;
  remoteTurns.set(sessionId, Date.now());
}

/** True when this session's latest turn came from a controller; consumes it. */
export function consumeRemoteDrivenTurn(sessionId: string): boolean {
  if (!sessionId) return false;
  const marked = remoteTurns.delete(sessionId);
  return marked;
}

/** A locally typed prompt re-arms notifications for the session. */
export function clearRemoteDrivenTurn(sessionId: string): void {
  if (!sessionId) return;
  remoteTurns.delete(sessionId);
}
