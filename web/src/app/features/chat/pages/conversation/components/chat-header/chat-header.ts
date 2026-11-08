import { Component, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IConversation } from '../../../../models/conversation';
import { AuthStore } from '../../../../../auth/services/store';
import { DatePipe } from '@angular/common';
import { IParticipant } from '../../../../models/participant';
import { RouterLink } from '@angular/router';

@Component({
  imports: [TranslatePipe, DatePipe, RouterLink],
  selector: 'app-chat-header',
  styleUrl: './chat-header.css',
  templateUrl: './chat-header.html',
})
export class ChatHeader {
  participants = input.required<IParticipant[]>();

  private readonly _authStore = inject(AuthStore);
  readonly conversation = input.required<IConversation | null>();
  readonly currentUserId = this._authStore.user()?.id;

  getAvatarPictureUrl(conversation: IConversation) {
    if (this.isGroup(conversation)) return null;

    return this.getOtherParticipant(conversation)?.pictureUrl ?? null;
  }

  private getOtherParticipant(conversation: IConversation) {
    return conversation.participants.find((p) => p.userId !== this.currentUserId);
  }

  isGroup(conversation: IConversation) {
    return conversation.conversationType === 'Group';
  }

  getDisplayName(conversation: IConversation) {
    if (this.isGroup(conversation)) {
      return conversation.title;
    }
    return this.getOtherParticipant(conversation)?.displayName;
  }

  getAvatarInitial(conversation: IConversation) {
    const name = this.getDisplayName(conversation)?.trim();
    if (!name) return '';
    return name.length > 0 ? name.charAt(0).toUpperCase() : '';
  }

  getSubtitle(conversation: IConversation): { names: string; count: number } | null {
    if (!this.isGroup(conversation)) {
      return null;
    }

    const names = conversation.participants
      .filter((p) => p.userId !== this.currentUserId)
      .map((p) => p.displayName);

    if (names.length === 0) return null;
    if (names.length <= 2) return { names: names.join(', '), count: 0 };

    return { names: names.slice(0, 2).join(', '), count: names.length - 2 };
  }
  getLastSeenAtUtc(conversation: IConversation): string | null {
    return this.getOtherParticipant(conversation)?.lastSeenAtUtc ?? null;
  }
  isUserOnline(conversation: IConversation) {
    const id = this.getOtherParticipant(conversation)?.userId;
    if (!id) return false;
    return this._authStore.isOnline(id);
  }
}
