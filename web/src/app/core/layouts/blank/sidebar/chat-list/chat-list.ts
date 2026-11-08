import { Component, inject, OnInit } from '@angular/core';
import { ConversationStore } from '../../../../../features/chat/services/store';
import { IConversation } from '../../../../../features/chat/models/conversation';
import { AuthStore } from '../../../../../features/auth/services/store';
import { DatePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { SignalrService } from '../../../../services/signalr';

@Component({
  imports: [DatePipe, TranslatePipe],
  selector: 'app-chat-list',
  styleUrl: './chat-list.css',
  templateUrl: './chat-list.html',
})
export class ChatList implements OnInit {
  private readonly _conversationStore = inject(ConversationStore);
  private readonly _authStore = inject(AuthStore);
  private readonly _hub = inject(SignalrService);
  readonly conversations = this._conversationStore.conversations;
  readonly currentUser = this._authStore.user;
  readonly selected = this._conversationStore.selectedConversation;
  readonly typingConversations = this._conversationStore.typingConversations;

  ngOnInit(): void {
    this._conversationStore.loadConversations().subscribe(() => {
      this.loadOnlineUserStatus();
    });
  }
  private async loadOnlineUserStatus() {
    const userIds = this.conversations()
      .map((c) => this.getOtherParticipant(c)?.userId)
      .filter((userId): userId is string => !!userId);
    if (userIds.length === 0) return;
    await this._hub.getOnlineStatus(userIds);
  }

  getOtherParticipant(conversation: IConversation) {
    return conversation.participants.find((p) => p.userId !== this.currentUser()?.id);
  }

  isGroup(conversation: IConversation) {
    return conversation.conversationType === 'Group';
  }

  isUserOnline(conversation: IConversation) {
    var otherParticipant = this.getOtherParticipant(conversation);
    if (!otherParticipant) return;

    return this._authStore.isOnline(otherParticipant.userId);
  }

  getDisplayName(conversation: IConversation) {
    if (conversation.conversationType === 'Group') {
      return conversation.title;
    }

    return this.getOtherParticipant(conversation)?.displayName;
  }

  async selectConversation(conversation: IConversation) {
    console.log(`Selected Conversation: ${conversation.id}`);

    if (this.selected()?.id === conversation.id) {
      console.log('User selected the same conversation');
      return;
    }

    const activeConversationId = this.selected()?.id;

    if (activeConversationId) {
      console.log(`Leaving conversation: ${activeConversationId}`);
      await this._hub.leaveConversation(activeConversationId);
    }

    this._conversationStore.selectConversation(conversation);
    await this._hub.joinConversation(conversation.id);
  }

  isConversationTyping(id: string) {
    return this.typingConversations().has(id);
  }
}
