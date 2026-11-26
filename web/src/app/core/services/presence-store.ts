import { Service, signal } from '@angular/core';

/** Shape of one entry in the server's OnlineStatus snapshot. */
export interface PresenceSnapshotEntry {
  isOnline: boolean;
  user: { id: string };
}

/**
 * Single source of truth for "who is online".
 *
 * State is one signal holding a set of user ids. Components only call isOnline(id).
 *
 * Live events (UserOnline / UserOffline) always beat a snapshot that was requested
 * before the event arrived, so a slow snapshot can never erase a newer event.
 */
@Service()
export class PresenceStore {
  private readonly _onlineIds = signal<ReadonlySet<string>>(new Set<string>());
  readonly onlineIds = this._onlineIds.asReadonly();

  /** Live events received since the last snapshot request: id -> isOnline. */
  private readonly _liveSinceRequest = new Map<string, boolean>();

  isOnline(userId: string | null | undefined): boolean {
    return !!userId && this._onlineIds().has(userId);
  }

  markOnline(userId: string): void {
    this._liveSinceRequest.set(userId, true);
    this.set(userId, true);
  }

  markOffline(userId: string): void {
    this._liveSinceRequest.set(userId, false);
    this.set(userId, false);
  }

  /** Call right before asking the server for a snapshot. */
  beginSnapshot(): void {
    this._liveSinceRequest.clear();
  }

  /** Apply a snapshot, but keep any live event that arrived after it was requested. */
  applySnapshot(entries: PresenceSnapshotEntry[]): void {
    this._onlineIds.update((current) => {
      const next = new Set(current);
      for (const entry of entries) {
        const id = entry.user.id;
        const live = this._liveSinceRequest.get(id);
        const isOnline = live ?? entry.isOnline;
        if (isOnline) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  /** Connection dropped or user logged out: nothing is known any more. */
  reset(): void {
    this._liveSinceRequest.clear();
    this._onlineIds.set(new Set<string>());
  }

  private set(userId: string, isOnline: boolean): void {
    this._onlineIds.update((current) => {
      if (current.has(userId) === isOnline) return current;
      const next = new Set(current);
      if (isOnline) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }
}
