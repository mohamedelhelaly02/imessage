import { DestroyRef, inject, Service, signal } from '@angular/core';
import { ConversationApi } from './conversation-api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { IConversation } from '../models/conversation';
import { Router } from '@angular/router';

@Service()
export class ConversationStore {
  resetState() {
    this._selectedConversation.set(null);
  }
  private readonly _api = inject(ConversationApi);
  private readonly _router = inject(Router);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _typingConversations = signal<Set<string>>(new Set());
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _conversations = signal<IConversation[]>([]);
  private readonly _selectedConversation = signal<IConversation | null>(null);

  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly typingConversations = this._typingConversations.asReadonly();
  readonly conversations = this._conversations.asReadonly();
  readonly selectedConversation = this._selectedConversation.asReadonly();

  loadConversations(): Observable<IConversation[]> {
    this._isLoading.set(true);
    this._error.set(null);
    return this._api.getConversations().pipe(
      takeUntilDestroyed(this._destroyRef),
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

    this._selectedConversation.set(conversation);
    this._router.navigate(['conversations', conversation.publicId]);
  }

  createPrivate(userId: string): Observable<IConversation> {
    return this.createConversation(this._api.createPrivate(userId));
  }

  createGroup(title: string, participantIds: string[]): Observable<IConversation> {
    return this.createConversation(this._api.createGroup(title, participantIds));
  }

  private createConversation(request: Observable<string>): Observable<IConversation> {
    this._isLoading.set(true);
    this._error.set(null);

    return request.pipe(
      switchMap((conversationId) =>
        this._api.getConversations().pipe(
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
}
