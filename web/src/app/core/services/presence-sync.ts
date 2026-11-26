import { computed, effect, inject, Service, untracked } from '@angular/core';
import { AuthStore } from '../../features/auth/services/store';
import { ConversationStore } from '../../features/chat/services/store';
import { SignalrService } from './signalr';
import { PresenceStore } from './presence-store';

/**
 * Keeps PresenceStore in sync with the server.
 *
 * Asks for a snapshot of every chat partner whenever the hub (re)connects, the partner
 * list changes, or the tab becomes visible again. Live events are handled in SignalrService.
 */
@Service()
export class PresenceSync {
  private readonly _hub = inject(SignalrService);
  private readonly _auth = inject(AuthStore);
  private readonly _conversations = inject(ConversationStore);
  private readonly _presence = inject(PresenceStore);

  private readonly _partnerIds = computed(
    () => {
      const me = this._auth.user()?.id;
      const ids = new Set<string>();
      for (const conversation of this._conversations.conversations()) {
        for (const p of conversation.participants) {
          if (p.userId !== me) ids.add(p.userId);
        }
      }
      return [...ids].sort();
    },
    { equal: (a, b) => a.length === b.length && a.every((id, i) => id === b[i]) },
  );

  constructor() {
    effect(() => {
      if (!this._hub.isConnected()) return;
      const ids = this._partnerIds();
      untracked(() => this.request(ids));
    });

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this._hub.isConnected()) {
          this.request(this._partnerIds());
        }
      });
    }
  }

  private request(ids: string[]): void {
    if (ids.length === 0) return;
    this._presence.beginSnapshot();
    void this._hub.getOnlineStatus(ids);
  }
}
