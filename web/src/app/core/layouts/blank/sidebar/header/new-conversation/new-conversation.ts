import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { ConversationStore } from '../../../../../../features/chat/services/store';
import { UsersStore } from '../../../../../../features/users/store';
import { AuthStore } from '../../../../../../features/auth/services/store';
import { DirectoryUser } from '../../../../../../features/users/user';

type ConversationMode = 'private' | 'group';

@Component({
  imports: [TranslatePipe],
  selector: 'app-new-conversation',
  styleUrl: './new-conversation.css',
  templateUrl: './new-conversation.html',
})
export class NewConversation {
  private readonly _authStore = inject(AuthStore);
  private readonly _usersStore = inject(UsersStore);
  private readonly _conversationStore = inject(ConversationStore);

  readonly isOpen = signal(false);
  readonly mode = signal<ConversationMode>('private');
  readonly searchQuery = signal('');
  readonly selectedPrivateUserId = signal<string | null>(null);
  readonly selectedGroupUserIds = signal<Set<string>>(new Set());
  readonly groupTitle = signal('');
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly users = this._usersStore.users;
  readonly error = this._usersStore.error;
  readonly isLoadingUsers = this._usersStore.isLoading;

  readonly availableUsers = computed(() => {
    const currentUserId = this._authStore.user()?.id;
    const query = this.searchQuery().trim().toLocaleLowerCase();

    return this.users()
      .filter((user) => user.id !== currentUserId)
      .filter((user) => {
        if (!query) return true;
        return `${user.displayName} ${user.userName ?? ''} ${user.email ?? ''}`
          .toLocaleLowerCase()
          .includes(query);
      });
  });

  open(): void {
    this.reset();
    this.isOpen.set(true);
    this._usersStore.loadUsers().subscribe();
  }

  close(): void {
    if (!this.isSubmitting()) {
      this.isOpen.set(false);
    }
  }

  setMode(mode: ConversationMode): void {
    this.mode.set(mode);
    this.errorMessage.set(null);
  }

  setSearchQuery(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  setGroupTitle(event: Event): void {
    this.groupTitle.set((event.target as HTMLInputElement).value);
  }

  selectPrivateUser(user: DirectoryUser): void {
    this.selectedPrivateUserId.set(user.id);
  }

  toggleGroupUser(user: DirectoryUser): void {
    this.selectedGroupUserIds.update((selected) => {
      const updated = new Set(selected);
      if (updated.has(user.id)) {
        updated.delete(user.id);
      } else {
        updated.add(user.id);
      }
      return updated;
    });
  }

  create(): void {
    this.errorMessage.set(null);

    if (this.mode() === 'private') {
      const userId = this.selectedPrivateUserId();
      if (!userId) {
        this.errorMessage.set('NEW_CONVERSATION.ERROR.SELECT_PERSON');
        return;
      }

      this.isSubmitting.set(true);
      this._conversationStore
        .createPrivate(userId)
        .pipe(finalize(() => this.isSubmitting.set(false)))
        .subscribe({
          next: () => this.isOpen.set(false),
        });
      return;
    }

    const title = this.groupTitle().trim();
    const participantIds = [...this.selectedGroupUserIds()];
    if (!title) {
      this.errorMessage.set('NEW_CONVERSATION.ERROR.GROUP_TITLE');
      return;
    }
    if (participantIds.length === 0) {
      this.errorMessage.set('NEW_CONVERSATION.ERROR.SELECT_GROUP_MEMBER');
      return;
    }

    this.isSubmitting.set(true);
    this._conversationStore
      .createGroup(title, participantIds)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => this.isOpen.set(false),
      });
  }

  getDisplayName(user: DirectoryUser): string {
    return user.displayName || user.userName || user.email || '';
  }

  private reset(): void {
    this.errorMessage.set(null);
    this.searchQuery.set('');
    this.selectedPrivateUserId.set(null);
    this.selectedGroupUserIds.set(new Set());
    this.groupTitle.set('');
    this.mode.set('private');
  }
}
