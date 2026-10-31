/**
 * A tiny in-renderer bus for "the signed-in account changed".
 *
 * Login and sign-out happen in account surfaces (the sidebar account dialog,
 * Settings' model sign-in, the sign-out button), but everything that *displays*
 * account state — the composer credits chip, the voice bar — reads the
 * entitlement on its own slow poll. Without a signal, a chip that mounted while
 * signed out stays hidden until its next poll lands, which reads as "the
 * balance never came back".
 *
 * Any completed vendor login may change the Nib account (the sign-in could have
 * been started from Settings rather than the account menu), and sign-out always
 * does, so the dialog and the sign-out action announce here and every reader
 * refreshes the moment it happens instead of waiting out its interval.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/** Subscribe to account-state changes; returns the unsubscribe function. */
export function onAuthChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Announce that the signed-in account may have changed. */
export function notifyAuthChanged(): void {
  // Snapshot first: a listener that unsubscribes mid-emit must not skip its
  // neighbours, and a throwing one must not take the caller (a dialog's OAuth
  // event handler) down with it.
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch {
      // Reader errors are that reader's problem.
    }
  }
}
