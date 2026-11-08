import { Component, inject, OnDestroy } from '@angular/core';
import { ConversationStore } from '../../services/store';
import { ChatHeader } from './components/chat-header/chat-header';
import { ChatMessages } from './components/chat-messages/chat-messages';
import { ChatComposer } from './components/chat-composer/chat-composer';
import { SignalrService } from '../../../../core/services/signalr';
import { AuthStore } from '../../../auth/services/store';
import { IParticipant } from '../../models/participant';

@Component({
  imports: [ChatHeader, ChatMessages, ChatComposer],
  selector: 'app-conversation',
  styleUrl: './conversation.css',
  templateUrl: './conversation.html',
})
export class Conversation implements OnDestroy {
  private _typingTimeout: any;
  private _conversationId!: string | undefined;
  private readonly _conversationStore = inject(ConversationStore);
  private readonly _hub = inject(SignalrService);
  private readonly _authStore = inject(AuthStore);

  selectedConversation = this._conversationStore.selectedConversation;

  async onUserTyping() {
    this._conversationId = this.selectedConversation()?.id;
    if (!this._conversationId) return;

    await this._hub.startTyping(this._conversationId);
    await this._hub.startConversationTyping(this._conversationId);

    this.resetTypingTimeout(this._conversationId);
  }

  resetTypingTimeout(conversationId: string) {
    if (this._typingTimeout) {
      clearTimeout(this._typingTimeout);
    }

    this._typingTimeout = setTimeout(async () => {
      await this._hub.stopTyping(conversationId);
      await this._hub.stopConversationTyping(conversationId);
    }, 1000);
  }

  ngOnDestroy() {
    this._conversationStore.resetState();
    if (this._conversationId) {
      this.handleDestroy(this._conversationId);
    }
  }
  async handleDestroy(_conversationId: string) {
    await this._hub.leaveConversation(_conversationId);
    await this._hub.stopTyping(_conversationId);
  }

  onMessageChanged(message: string) {
    console.log('message: ' + message);
  }

  getTypingParticipants(): IParticipant[] {
    const conversation = this.selectedConversation();
    if (!conversation) return [];

    const currentUserId = this._authStore.user()?.id;

    if (!currentUserId) return [];

    const filteredParticipants = conversation.participants
      .filter((p) => p.userId !== currentUserId)
      .filter((p) => this._authStore.isUserTyping(conversation.id, p.userId));

    return filteredParticipants;
  }
}
