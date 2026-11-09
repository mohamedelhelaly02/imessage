import { Component, computed, DestroyRef, effect, inject, OnDestroy, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConversationStore } from '../../services/store';
import { MessagesApi, IMessage, MessageType } from '../../services/messages-api';
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
  private readonly conversationStore = inject(ConversationStore);
  private readonly messagesApi = inject(MessagesApi);
  private readonly hub = inject(SignalrService);
  private readonly authStore = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);
  private typingTimeout?: ReturnType<typeof setTimeout>;
  private activeConversationId?: string;

  readonly selectedConversation = this.conversationStore.selectedConversation;
  readonly messages = signal<IMessage[]>([]);
  readonly isSending = signal(false);
  readonly error = signal<string | null>(null);
  readonly currentUserId = computed(() => this.authStore.user()?.id ?? '');
  readonly replyingTo = signal<IMessage | null>(null);
  readonly searchResults = signal<Array<{ id: string; senderUserId: string; senderDisplayName: string; text: string | null; createdAtUtc: string; isForwarded: boolean }>>([]);
  readonly hasOlderMessages = signal(false);

  constructor() {
    effect(() => {
      const conversation = this.selectedConversation();
      if (conversation?.id && conversation.id !== this.activeConversationId) {
        this.activeConversationId = conversation.id;
        void this.openConversation(conversation.id);
      }
    });

    this.hub.messageCreated$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(message => {
      if (message.conversationId !== this.activeConversationId) return;
      this.upsertMessage(message);
      if (message.senderUserId !== this.authStore.user()?.id) this.markRead([message.id]);
    });
    this.hub.messageEdited$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(message => this.upsertMessage(message));
    this.hub.messageDeleted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      this.messages.update(items => items.map(item => item.id === event.id
        ? { ...item, text: null, contentJson: null, deletedAtUtc: event.deletedAtUtc }
        : item));
    });
    this.hub.messageReceiptsUpdated$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      this.messages.update(items => items.map(item => event.messageIds.includes(item.id)
        ? { ...item, receipts: item.receipts.map(receipt => receipt.userId === event.userId
          ? { ...receipt, deliveredAtUtc: event.deliveredAtUtc, readAtUtc: event.readAtUtc }
          : receipt) }
        : item));
    });
    this.hub.messageReactionChanged$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      this.messages.update(items => items.map(item => {
        if (item.id !== event.messageId) return item;
        const reactions = item.reactions.filter(reaction =>
          reaction.userId !== event.userId || reaction.emoji !== event.emoji);
        if (!event.isRemoved) reactions.push({ userId: event.userId, displayName: event.displayName, emoji: event.emoji });
        return { ...item, reactions };
      }));
    });
    this.hub.messagePinChanged$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      this.messages.update(items => items.map(item => item.id === event.id
        ? { ...item, isPinned: event.isPinned } : item));
    });
  }

  async openConversation(conversationId: string): Promise<void> {
    await this.hub.joinConversation(conversationId);
    try {
      this.messages.set(await firstValueFrom(this.messagesApi.getMessages(conversationId)));
      this.hasOlderMessages.set(this.messages().length === 50);
      this.markRead(this.messages().filter(item => item.senderUserId !== this.authStore.user()?.id && !item.deletedAtUtc)
        .map(item => item.id));
    } catch {
      this.error.set('Unable to load messages.');
    }
  }

  async onUserTyping(): Promise<void> {
    const id = this.activeConversationId;
    if (!id) return;
    await this.hub.startTyping(id);
    await this.hub.startConversationTyping(id);
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(async () => {
      await this.hub.stopTyping(id);
      await this.hub.stopConversationTyping(id);
    }, 1000);
  }

  async onMessageChanged(text: string): Promise<void> {
    const url = this.extractUrl(text);
    if (url) {
      await this.send({ type: 'Link', text, contentJson: JSON.stringify({ url }), attachmentUploadIds: [] });
      return;
    }
    await this.send({ type: 'Text', text, attachmentUploadIds: [] });
  }

  async onFileSelected(file: File): Promise<void> {
    const type = file.type === 'image/gif' ? 'Gif'
      : file.type.startsWith('image/') ? 'Image'
      : file.type.startsWith('video/') ? 'Video'
      : file.type.startsWith('audio/') ? 'Audio' : 'Document';
    await this.sendFile(file, type);
  }

  async onVoiceMessage(blob: Blob): Promise<void> {
    const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
    await this.sendFile(file, 'VoiceNote');
  }

  async onLocationShare(location: { latitude: number; longitude: number }): Promise<void> {
    await this.send({ type: 'Location', contentJson: JSON.stringify(location), attachmentUploadIds: [] });
  }

  async onContactShare(contact: { name: string; phone: string }): Promise<void> {
    await this.send({ type: 'Contact', text: contact.name, contentJson: JSON.stringify(contact), attachmentUploadIds: [] });
  }

  async onStickerSelected(file: File): Promise<void> {
    await this.sendFile(file, 'Sticker');
  }

  async react(event: { messageId: string; emoji: string }): Promise<void> {
    try { await firstValueFrom(this.messagesApi.toggleReaction(event.messageId, event.emoji)); }
    catch { this.error.set('Unable to update reaction.'); }
  }

  async editMessage(message: IMessage): Promise<void> {
    const text = window.prompt('Edit message', message.text ?? '');
    if (!text?.trim()) return;
    try { this.upsertMessage(await firstValueFrom(this.messagesApi.editMessage(message.id, text))); }
    catch { this.error.set('Unable to edit message.'); }
  }

  async deleteMessage(message: IMessage): Promise<void> {
    if (!window.confirm('Delete this message for everyone?')) return;
    try { await firstValueFrom(this.messagesApi.deleteMessage(message.id)); }
    catch { this.error.set('Unable to delete message.'); }
  }

  async forwardMessage(message: IMessage): Promise<void> {
    const conversationId = this.activeConversationId;
    if (!conversationId) return;
    try { this.upsertMessage(await firstValueFrom(this.messagesApi.forwardMessage(message.id, conversationId))); }
    catch { this.error.set('Unable to forward message.'); }
  }

  async setMessagePin(message: IMessage): Promise<void> {
    try {
      await firstValueFrom(this.messagesApi.setPinned(message.id, !message.isPinned));
      this.messages.update(items => items.map(item => item.id === message.id ? { ...item, isPinned: !item.isPinned } : item));
    } catch { this.error.set('Unable to update pinned message.'); }
  }

  setReply(message: IMessage): void { this.replyingTo.set(message); }
  clearReply(): void { this.replyingTo.set(null); }

  async loadOlderMessages(): Promise<void> {
    const first = this.messages()[0];
    const conversationId = this.activeConversationId;
    if (!first || !conversationId) return;
    const older = await firstValueFrom(this.messagesApi.getMessages(conversationId,
      { createdAtUtc: first.createdAtUtc, id: first.id }));
    this.messages.update(items => [...older, ...items]);
    this.hasOlderMessages.set(older.length === 50);
  }

  async search(term: string): Promise<void> {
    const conversationId = this.activeConversationId;
    if (!conversationId || !term.trim()) { this.searchResults.set([]); return; }
    try { this.searchResults.set(await firstValueFrom(this.messagesApi.searchMessages(conversationId, term.trim()))); }
    catch { this.error.set('Unable to search messages.'); }
  }

  jumpToMessage(messageId: string): void {
    document.getElementById(`message-${messageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.searchResults.set([]);
  }

  getTypingParticipants(): IParticipant[] {
    const conversation = this.selectedConversation();
    const currentUserId = this.authStore.user()?.id;
    if (!conversation || !currentUserId) return [];
    return conversation.participants
      .filter(participant => participant.userId !== currentUserId)
      .filter(participant => this.authStore.isUserTyping(conversation.id, participant.userId));
  }

  ngOnDestroy(): void {
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    if (this.activeConversationId) void this.hub.leaveConversation(this.activeConversationId);
    this.conversationStore.resetState();
  }

  private async sendFile(file: File, type: MessageType): Promise<void> {
    const conversationId = this.activeConversationId;
    if (!conversationId) return;
    this.isSending.set(true);
    this.error.set(null);
    try {
      const upload = await firstValueFrom(this.messagesApi.uploadFile(conversationId, file, file.name));
      await this.send({ type, text: '', attachmentUploadIds: [upload.uploadId] });
    } catch { this.error.set('Unable to upload attachment.'); }
    finally { this.isSending.set(false); }
  }

  private async send(request: { type: MessageType; text?: string; contentJson?: string; attachmentUploadIds: string[] }): Promise<void> {
    const conversationId = this.activeConversationId;
    if (!conversationId) return;
    this.isSending.set(true);
    this.error.set(null);
    try {
      const message = await firstValueFrom(this.messagesApi.sendMessage(conversationId, {
        clientMessageId: crypto.randomUUID(),
        type: request.type,
        text: request.text,
        contentJson: request.contentJson,
        replyToMessageId: this.replyingTo()?.id ?? null,
        attachmentUploadIds: request.attachmentUploadIds,
      }));
      this.upsertMessage(message);
      this.replyingTo.set(null);
    } catch { this.error.set('Unable to send message.'); }
    finally { this.isSending.set(false); }
  }

  private markRead(messageIds: string[]): void {
    if (!this.activeConversationId || messageIds.length === 0) return;
    void firstValueFrom(this.messagesApi.markRead(this.activeConversationId, messageIds)).catch(() => undefined);
  }

  private upsertMessage(message: IMessage): void {
    if (message.conversationId !== this.activeConversationId) return;
    this.messages.update(items => {
      const index = items.findIndex(item => item.id === message.id);
      if (index < 0) return [...items, message].sort((left, right) =>
        left.createdAtUtc.localeCompare(right.createdAtUtc));
      return items.map(item => item.id === message.id ? message : item);
    });
  }

  private extractUrl(text: string): string | null {
    const match = text.match(/https?:\/\/\S+/i)?.[0];
    if (!match) return null;
    try { return new URL(match).toString(); } catch { return null; }
  }
}
