import { inject, Service, Signal, signal } from '@angular/core';
import { ConversationApi } from './conversation-api';
import { catchError, finalize, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { IConversation } from '../models/conversation';
import { Router } from '@angular/router';
import {
  IAttachmentUploadResponse,
  IMessage,
  ISearchMessageResponse,
  ISendMessageRequest,
  IToggleReactionResponse,
  MessagesApi,
  MessageType,
} from './messages-api';

@Service()
export class ConversationStore {
  private readonly _conversationApi = inject(ConversationApi);
  private readonly _messagesApi = inject(MessagesApi);
  private readonly _router = inject(Router);

  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _typingConversations = signal<Set<string>>(new Set());
  private readonly _conversations = signal<IConversation[]>([]);
  private readonly _selectedConversation = signal<IConversation | null>(null);
  private readonly _messages = signal<IMessage[]>([]);
  private readonly _replyingTo = signal<IMessage | null>(null);
  private readonly _searchResults = signal<ISearchMessageResponse[]>([]);
  private readonly _hasOlderMessages = signal<boolean>(false);

  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly typingConversations = this._typingConversations.asReadonly();
  readonly conversations = this._conversations.asReadonly();
  readonly selectedConversation = this._selectedConversation.asReadonly();
  readonly messages = this._messages.asReadonly();
  readonly replyingToMessage = this._replyingTo.asReadonly();
  readonly searchResults = this._searchResults.asReadonly();
  readonly hasOlderMessages = this._hasOlderMessages.asReadonly();

  setHasOlderMessages(value: boolean) {
    this._hasOlderMessages.set(value);
  }

  loadOlderMessages(conversationId: string, first: IMessage) {
    this._isLoading.set(true);
    this._error.set(null);

    return this._messagesApi
      .getMessages(conversationId, { createdAtUtc: first.createdAtUtc, id: first.id })
      .pipe(
        tap((older) => {
          this._messages.update((items) => [...older, ...items]);
          this._hasOlderMessages.set(older.length === 50);
        }),
        catchError((err) => {
          const message = err?.error?.detail || 'Unable to edit message.';
          this._error.set(message);
          return throwError(() => new Error(message));
        }),
        finalize(() => this._isLoading.set(false)),
      );
  }

  setReply(message: IMessage) {
    this._replyingTo.set(message);
  }

  clearReply() {
    this._replyingTo.set(null);
  }

  updateMessagePin(event: { id: string; isPinned: boolean }) {
    this._messages.update((items) =>
      items.map((item) => (item.id === event.id ? { ...item, isPinned: event.isPinned } : item)),
    );
  }

  setMessagePin(messageId: string, isPinned: boolean) {
    this._isLoading.set(true);
    this._error.set(null);
    return this._messagesApi.setPinned(messageId, isPinned).pipe(
      catchError((err) => {
        const message = err?.error?.detail || 'Unable to edit message.';
        this._error.set(message);
        return throwError(() => new Error(message));
      }),
      finalize(() => this._isLoading.set(false)),
    );
  }

  toggleMessageReactions(event: {
    messageId: string;
    userId: string;
    displayName: string;
    emoji: string;
    isRemoved: boolean;
  }) {
    this._messages.update((items) =>
      items.map((item) => {
        if (item.id !== event.messageId) return item;
        const reactions = item.reactions.filter(
          (reaction) => reaction.userId !== event.userId || reaction.emoji !== event.emoji,
        );
        if (!event.isRemoved)
          reactions.push({
            userId: event.userId,
            displayName: event.displayName,
            emoji: event.emoji,
          });
        return { ...item, reactions };
      }),
    );
  }

  toggleReaction(messageId: string, emoji: string): Observable<IToggleReactionResponse> {
    this._isLoading.set(true);
    this._error.set(null);
    return this._messagesApi.toggleReaction(messageId, emoji).pipe(
      catchError((err) => {
        const message = err?.error?.detail || 'Unable to update reaction.';
        this._error.set(message);
        return throwError(() => new Error(message));
      }),
      finalize(() => this._isLoading.set(false)),
    );
  }

  updateMessages(event: { id: string; conversationId: string; deletedAtUtc: string }) {
    this._messages.update((items) =>
      items.map((item) =>
        item.id === event.id
          ? { ...item, text: null, contentJson: null, deletedAtUtc: event.deletedAtUtc }
          : item,
      ),
    );
  }

  editMessage(messageId: string, text: string): Observable<IMessage> {
    this._isLoading.set(true);
    this._error.set(null);
    return this._messagesApi.editMessage(messageId, text).pipe(
      tap((message) => {
        this.upsertMessage(message);
      }),
      catchError((err) => {
        const message = err?.error?.detail || 'Unable to edit message.';
        this._error.set(message);
        return throwError(() => new Error(message));
      }),
      finalize(() => this._isLoading.set(false)),
    );
  }

  deleteMessage(messageId: string): Observable<void> {
    this._isLoading.set(true);
    this._error.set(null);
    return this._messagesApi.deleteMessage(messageId).pipe(
      tap(() => {
        this._messages.update((messages) => messages.filter((m) => m.id !== messageId));
      }),
      catchError((err) => {
        const message = err?.error?.detail || 'Unable to delete message.';
        this._error.set(message);
        return throwError(() => new Error(message));
      }),
      finalize(() => this._isLoading.set(false)),
    );
  }

  resetSearchResults() {
    this._searchResults.set([]);
  }

  searchMessages(term: string, conversationId: string): Observable<ISearchMessageResponse[]> {
    this._isLoading.set(true);
    this._error.set(null);

    return this._messagesApi.searchMessages(conversationId, term).pipe(
      tap((results) => {
        this._searchResults.set(results);
      }),
      catchError((err) => {
        const message = err?.error?.detail || 'Unable to search messages.';
        this._error.set(message);
        return throwError(() => new Error(message));
      }),
      finalize(() => this._isLoading.set(false)),
    );
  }

  getAttachmentDownloadUrl(attachmentId: string): Observable<string> {
    return this._messagesApi.getAttachmentDownloadUrl(attachmentId).pipe(
      map((response) => response.downloadUrl),
      catchError((err) => {
        const message = err?.error?.detail || 'Unable to load attachment.';
        this._error.set(message);
        return throwError(() => new Error(message));
      }),
    );
  }

  uploadAttachment(
    conversationId: string,
    type: MessageType,
    file: File,
  ): Observable<IAttachmentUploadResponse> {
    this._isLoading.set(true);
    this._error.set(null);

    return this._messagesApi.uploadAttachment(conversationId, type, file).pipe(
      catchError((err) => {
        console.log(err);
        const message = err?.error?.detail || 'Unable to upload attachment.';
        this._error.set(message);
        return throwError(() => new Error(message));
      }),
      finalize(() => this._isLoading.set(false)),
    );
  }

  loadConversations(): Observable<IConversation[]> {
    this._isLoading.set(true);
    this._error.set(null);
    return this._conversationApi.getConversations().pipe(
      tap((data: IConversation[]) => {
        this._conversations.set(data);
      }),
      catchError((err) => {
        const message = err?.error?.detail || 'Unable to load conversations.';
        this._error.set(message);
        return of([]);
      }),
      finalize(() => this._isLoading.set(false)),
    );
  }

  sendMessage(conversationId: string, request: ISendMessageRequest): Observable<IMessage> {
    this._isLoading.set(true);
    this._error.set(null);

    return this._messagesApi.sendMessage(conversationId, request).pipe(
      tap((message: IMessage) => {
        console.log('Message sent:', message);
        if (message.conversationId !== this._selectedConversation()?.id) return;
        this.upsertMessage(message);
        if (this._replyingTo()?.id === request.replyToMessageId) this._replyingTo.set(null);
      }),
      catchError((err) => {
        const message = err?.error?.detail || 'Unable to send message.';
        this._error.set(message);
        return throwError(() => new Error(message));
      }),
      finalize(() => this._isLoading.set(false)),
    );
  }

  getMessages(
    conversationId: string,
    before?: { createdAtUtc: string; id: string },
    limit?: number,
  ): Observable<IMessage[]> {
    this._isLoading.set(true);
    this._error.set(null);
    return this._messagesApi.getMessages(conversationId, before, limit).pipe(
      tap((messages: IMessage[]) => {
        this._messages.set(messages);
      }),
      catchError((err) => {
        const message = err?.error?.detail || 'Unable to load messages.';
        this._error.set(message);
        return of([]);
      }),
      finalize(() => this._isLoading.set(false)),
    );
  }

  upsertMessage(message: IMessage) {
    this._messages.update((messages) => {
      const index = messages.findIndex((m) => m.id === message.id);
      if (index < 0)
        return [...messages, message].sort((left, right) =>
          left.createdAtUtc.localeCompare(right.createdAtUtc),
        );
      return messages.map((m) => (m.id === message.id ? message : m));
    });
  }

  private updateConversationTyping(conversationId: string): void {
    this._typingConversations.update((conversations) => {
      const updatedTypingConversations = new Set(conversations);
      updatedTypingConversations.add(conversationId);
      return updatedTypingConversations;
    });
  }

  private deleteConversationTyping(conversationId: string): void {
    this._typingConversations.update((typingConversations) => {
      const updatedTypingConversations = new Set(typingConversations);
      updatedTypingConversations.delete(conversationId);
      return updatedTypingConversations;
    });
  }

  conversationStartedTyping(conversationId: string): void {
    if (!conversationId) return;
    this.updateConversationTyping(conversationId);
  }

  conversationStoppedTyping(conversationId: string): void {
    if (!conversationId) return;
    this.deleteConversationTyping(conversationId);
  }

  selectConversation(conversation: IConversation) {
    const isExists = this.conversations().some((c) => c.id === conversation.id);
    if (!isExists) return;

    if (this._selectedConversation()?.id !== conversation.id) this._replyingTo.set(null);
    this._selectedConversation.set(conversation);
    this._router.navigate(['conversations', conversation.publicId]);
  }

  createPrivate(userId: string): Observable<IConversation> {
    return this.createConversation(this._conversationApi.createPrivate(userId));
  }

  createGroup(title: string, participantIds: string[]): Observable<IConversation> {
    return this.createConversation(this._conversationApi.createGroup(title, participantIds));
  }

  private createConversation(request: Observable<string>): Observable<IConversation> {
    this._isLoading.set(true);
    this._error.set(null);

    return request.pipe(
      switchMap((conversationId) =>
        this._conversationApi.getConversations().pipe(
          tap((conversations) => this._conversations.set(conversations)),
          map((conversations) => {
            const conversation = conversations.find((item) => item.id === conversationId);
            if (!conversation) {
              throw new Error('The new conversation was not returned by the server.');
            }
            return conversation;
          }),
          tap((conversation) => this.selectConversation(conversation)),
        ),
      ),
      catchError((err) => {
        return throwError(() => err);
      }),
      finalize(() => this._isLoading.set(false)),
    );
  }

  resetState() {
    console.log('Resetting conversation store state...');
    this._selectedConversation.set(null);
    this._replyingTo.set(null);
  }
}
