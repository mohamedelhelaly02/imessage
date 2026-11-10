import { Component, computed, DestroyRef, effect, inject, OnDestroy, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConversationStore } from '../../services/store';
import { MessagesApi, IMessage, MessageType } from '../../services/messages-api';
import { ChatHeader } from './components/chat-header/chat-header';
import { ChatMessages } from './components/chat-messages/chat-messages';
import { ChatComposer } from './components/chat-composer/chat-composer';
import { SignalrService } from '../../../../core/services/signalr';
import { AuthStore } from '../../../auth/services/store';
import { IParticipant } from '../../models/participant';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  imports: [ChatHeader, ChatMessages, ChatComposer],
  selector: 'app-conversation',
  styleUrl: './conversation.css',
  templateUrl: './conversation.html',
})
export class Conversation implements OnDestroy {
  private readonly hub = inject(SignalrService);
  private readonly authStore = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly conversationStore = inject(ConversationStore);
  private typingTimeout?: ReturnType<typeof setTimeout>;

  readonly currentUserId = computed(() => this.authStore.user()?.id ?? '');
  readonly selectedConversation = this.conversationStore.selectedConversation;
  readonly messages = this.conversationStore.messages;
  readonly isLoading = this.conversationStore.isLoading;
  readonly error = this.conversationStore.error;
  readonly activeConversationId = computed(() => this.selectedConversation()?.id ?? '');
  readonly searchResults = this.conversationStore.searchResults;

  readonly hasOlderMessages = signal(false);

  constructor() {
    effect(() => {
      const conversationId = this.activeConversationId();
      if (!conversationId) return;
      this.openConversation(conversationId);
    });

    this.hub.messageCreated$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((message) => {
      if (message.conversationId !== this.activeConversationId()) return;
      this.conversationStore.upsertMessage(message);
      // if (message.senderUserId !== this.authStore.user()?.id) this.markRead([message.id]);
    });
    this.hub.messageEdited$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => this.conversationStore.upsertMessage(message));

    this.hub.messageDeleted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      this.conversationStore.updateMessages(event);
    });

    // this.hub.messageReceiptsUpdated$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
    //   this.messages.update(items => items.map(item => event.messageIds.includes(item.id)
    //     ? { ...item, receipts: item.receipts.map(receipt => receipt.userId === event.userId
    //       ? { ...receipt, deliveredAtUtc: event.deliveredAtUtc, readAtUtc: event.readAtUtc }
    //       : receipt) }
    //     : item));
    // });
    // this.hub.messageReactionChanged$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
    //   this.messages.update(items => items.map(item => {
    //     if (item.id !== event.messageId) return item;
    //     const reactions = item.reactions.filter(reaction =>
    //       reaction.userId !== event.userId || reaction.emoji !== event.emoji);
    //     if (!event.isRemoved) reactions.push({ userId: event.userId, displayName: event.displayName, emoji: event.emoji });
    //     return { ...item, reactions };
    //   }));
    // });
    // this.hub.messagePinChanged$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
    //   this.messages.update(items => items.map(item => item.id === event.id
    //     ? { ...item, isPinned: event.isPinned } : item));
    // });
  }

  private openConversation(conversationId: string): void {
    if (!conversationId) return;
    this.conversationStore
      .getMessages(conversationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();

    // this.hasOlderMessages.set(this.messages().length === 50);
    // this.markRead(this.messages().filter(item => item.senderUserId !== this.authStore.user()?.id && !item.deletedAtUtc)
    //   .map(item => item.id));
  }

  async onUserTyping(): Promise<void> {
    const id = this.activeConversationId();
    console.log(`User is typing in conversation: ${id}`);
    if (!id) return;
    await this.hub.startTyping(id);
    await this.hub.startConversationTyping(id);
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(async () => {
      await this.hub.stopTyping(id);
      await this.hub.stopConversationTyping(id);
    }, 1000);
  }

  onMessageChanged(text: string) {
    const url = this.extractUrl(text);
    if (url) {
      this.send({
        type: 'Link',
        text,
        contentJson: JSON.stringify({ url }),
        attachmentUploadIds: [],
      });
      return;
    }

    this.send({ type: 'Text', text, attachmentUploadIds: [] });
  }

  async onFileSelected(file: File): Promise<void> {
    const type =
      file.type === 'image/gif'
        ? 'Gif'
        : file.type.startsWith('image/')
          ? 'Image'
          : file.type.startsWith('video/')
            ? 'Video'
            : file.type.startsWith('audio/')
              ? 'Audio'
              : 'Document';
    await this.sendFile(file, type);
  }

  onVoiceMessage(blob: Blob): void {
    console.log('Received voice message blob:', blob);
    const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
    this.sendFile(file, 'VoiceNote');
  }

  onLocationShare(location: { latitude: number; longitude: number }) {
    this.send({ type: 'Location', contentJson: JSON.stringify(location), attachmentUploadIds: [] });
  }

  onContactShare(contact: { name: string; phone: string }) {
    this.send({
      type: 'Contact',
      text: contact.name,
      contentJson: JSON.stringify(contact),
      attachmentUploadIds: [],
    });
  }

  // async onStickerSelected(file: File): Promise<void> {
  //   await this.sendFile(file, 'Sticker');
  // }

  // async react(event: { messageId: string; emoji: string }): Promise<void> {
  //   try { await firstValueFrom(this.messagesApi.toggleReaction(event.messageId, event.emoji)); }
  //   catch { this.error.set('Unable to update reaction.'); }
  // }

  editMessage(message: IMessage): void {
    const text = window.prompt('Edit message', message.text ?? '');
    if (!text?.trim()) return;

    this.conversationStore
      .editMessage(message.id, text)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  deleteMessage(message: IMessage): void {
    if (!window.confirm('Delete this message for everyone?')) return;

    this.conversationStore
      .deleteMessage(message.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  // async forwardMessage(message: IMessage): Promise<void> {
  //   const conversationId = this.activeConversationId;
  //   if (!conversationId) return;
  //   try { this.upsertMessage(await firstValueFrom(this.messagesApi.forwardMessage(message.id, conversationId))); }
  //   catch { this.error.set('Unable to forward message.'); }
  // }

  // async setMessagePin(message: IMessage): Promise<void> {
  //   try {
  //     await firstValueFrom(this.messagesApi.setPinned(message.id, !message.isPinned));
  //     this.messages.update(items => items.map(item => item.id === message.id ? { ...item, isPinned: !item.isPinned } : item));
  //   } catch { this.error.set('Unable to update pinned message.'); }
  // }

  // setReply(message: IMessage): void { this.replyingTo.set(message); }
  // clearReply(): void { this.replyingTo.set(null); }

  async loadOlderMessages(): Promise<void> {
    // const first = this.messages()[0];
    // const conversationId = this.activeConversationId;
    // if (!first || !conversationId) return;
    // const older = await firstValueFrom(this.messagesApi.getMessages(conversationId,
    //   { createdAtUtc: first.createdAtUtc, id: first.id }));
    // this.messages.update(items => [...older, ...items]);
    // this.hasOlderMessages.set(older.length === 50);
  }

  search(term: string) {
    const conversationId = this.activeConversationId();
    if (!conversationId || !term.trim()) return;
    this.conversationStore
      .searchMessages(term, conversationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  jumpToMessage(messageId: string): void {
    document
      .getElementById(`message-${messageId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.conversationStore.resetSearchResults();
  }

  getTypingParticipants(): IParticipant[] {
    const conversation = this.selectedConversation();
    const currentUserId = this.authStore.user()?.id;
    if (!conversation || !currentUserId) return [];
    return conversation.participants
      .filter((participant) => participant.userId !== currentUserId)
      .filter((participant) => this.authStore.isUserTyping(conversation.id, participant.userId));
  }

  ngOnDestroy(): void {
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    if (this.activeConversationId()) void this.hub.leaveConversation(this.activeConversationId());
    this.conversationStore.resetState();
  }

  private async sendFile(file: File, type: MessageType): Promise<void> {
    const conversationId = this.activeConversationId();
    if (!conversationId) return;

    this.conversationStore
      .uploadAttachment(conversationId, type, file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((upload) => this.send({ type, attachmentUploadIds: [upload.uploadId] }));
  }

  private send(request: {
    type: MessageType;
    text?: string;
    contentJson?: string;
    attachmentUploadIds: string[];
  }) {
    const conversationId = this.activeConversationId();
    if (!conversationId) return;

    this.conversationStore
      .sendMessage(conversationId, {
        clientMessageId: crypto.randomUUID(),
        type: request.type,
        text: request.text,
        contentJson: request.contentJson,
        replyToMessageId: null,
        attachmentUploadIds: request.attachmentUploadIds,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  // private markRead(messageIds: string[]): void {
  //   if (!this.activeConversationId || messageIds.length === 0) return;
  //   void firstValueFrom(this.messagesApi.markRead(this.activeConversationId, messageIds)).catch(() => undefined);
  // }

  private extractUrl(text: string): string | null {
    const match = text.match(/https?:\/\/\S+/i)?.[0];
    if (!match) return null;
    try {
      return new URL(match).toString();
    } catch {
      return null;
    }
  }
}
