import { inject, Service, signal } from '@angular/core';
import { HubConnection } from '@microsoft/signalr';
import * as signalr from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../../features/auth/services/store';
import { ConversationStore } from '../../features/chat/services/store';
import { Observable, Subject } from 'rxjs';
import { IMessage } from '../../features/chat/services/messages-api';
@Service()
export class SignalrService {
  private _hubConnection!: HubConnection;
  private _joinedConversationId: string | null = null;
  private readonly _isConnected = signal(false);
  readonly isConnected = this._isConnected.asReadonly();
  private readonly _hubUrl = `${environment.hubUrl}/hubs/chat`;
  private readonly _authStore = inject(AuthStore);
  private readonly _conversationStore = inject(ConversationStore);
  private readonly _messageCreated = new Subject<IMessage>();
  private readonly _messageEdited = new Subject<IMessage>();
  private readonly _messageDeleted = new Subject<{ id: string; conversationId: string; deletedAtUtc: string }>();
  private readonly _messageReceiptsUpdated = new Subject<{
    userId: string; messageIds: string[]; deliveredAtUtc: string; readAtUtc: string;
  }>();
  private readonly _messageReactionChanged = new Subject<{
    messageId: string; userId: string; displayName: string; emoji: string; isRemoved: boolean;
  }>();
  private readonly _messagePinChanged = new Subject<{ id: string; isPinned: boolean }>();

  readonly messageCreated$: Observable<IMessage> = this._messageCreated.asObservable();
  readonly messageEdited$: Observable<IMessage> = this._messageEdited.asObservable();
  readonly messageDeleted$ = this._messageDeleted.asObservable();
  readonly messageReceiptsUpdated$ = this._messageReceiptsUpdated.asObservable();
  readonly messageReactionChanged$ = this._messageReactionChanged.asObservable();
  readonly messagePinChanged$ = this._messagePinChanged.asObservable();

  async startConnection(): Promise<void> {
    if (
      this._hubConnection?.state === signalr.HubConnectionState.Connected ||
      this._hubConnection?.state === signalr.HubConnectionState.Connecting
    ) {
      return;
    }

    this._hubConnection = new signalr.HubConnectionBuilder()
      .withUrl(this._hubUrl, {
        accessTokenFactory: () => this._authStore.accessToken() || '',
      })
      .withAutomaticReconnect({
        // Never give up: 0s, 2s, 5s, 10s, then every 15s.
        nextRetryDelayInMilliseconds: (context: signalr.RetryContext) =>
          [0, 2000, 5000, 10000][context.previousRetryCount] ?? 15000,
      })
      .build();

    this.registerHubEvents();

    try {
      await this._hubConnection.start();
      this._isConnected.set(true);
      console.log('Hub Connnected.');
    } catch (error) {
      console.error(`Hub connection error: ${error}`);
      this.retryStart();
    }
  }

  private retryStart(): void {
    setTimeout(() => {
      if (this._authStore.isAuthenticated()) void this.startConnection();
    }, 5000);
  }

  async stopConnection(): Promise<void> {
    if (this._hubConnection) {
      try {
        await this._hubConnection.stop();
      } catch (error) {}
    }
  }

  async notifyCallerOnline(): Promise<void> {
    try {
      await this._hubConnection.invoke('NotifyCallerOnline');
    } catch (error) {}
  }

  async getOnlineStatus(userIds: string[]) {
    if (this._hubConnection?.state !== signalr.HubConnectionState.Connected) return;
    try {
      await this._hubConnection.invoke('GetOnlineStatus', userIds);
    } catch (error) {}
  }

  async startTyping(conversationId: string): Promise<void> {
    try {
      await this._hubConnection.invoke('StartTyping', conversationId);
    } catch (error) {}
  }

  async startConversationTyping(conversationId: string) {
    try {
      await this._hubConnection.invoke('StartConversationTyping', conversationId);
    } catch (error) {}
  }

  async stopTyping(conversatioId: string): Promise<void> {
    try {
      await this._hubConnection.invoke('StopTyping', conversatioId);
    } catch (error) {}
  }

  async stopConversationTyping(conversationId: string): Promise<void> {
    try {
      await this._hubConnection.invoke('StopConversationTyping', conversationId);
    } catch (error) {}
  }

  async startRecordingVoice(conversationId: string): Promise<void> {
    try {
      await this._hubConnection.invoke('StartRecordingVoice', conversationId);
    } catch (error) {}
  }

  async stopRecordingVoice(conversationId: string): Promise<void> {
    try {
      await this._hubConnection.invoke('StopRecordingVoice', conversationId);
    } catch (error) {}
  }
  async joinConversation(conversationId: string): Promise<void> {
    try {
      this._joinedConversationId = conversationId;
      await this._hubConnection.invoke('JoinConversation', conversationId);
      console.log(`Joined conversation: ${conversationId}`);
    } catch (error) {}
  }

  async leaveConversation(conversationId: string): Promise<void> {
    try {
      if (this._joinedConversationId === conversationId) this._joinedConversationId = null;
      await this._hubConnection.invoke('LeaveConversation', conversationId);
    } catch (error) {}
  }

  private registerHubEvents(): void {
    this._hubConnection.on('ReceiveCallerConnected', () => {
      console.log('User connected.');
    });

    this._hubConnection.onreconnecting((error) => {
      console.warn('signalr reconnecting', error);
      this._isConnected.set(false);
      this._authStore.clearOnline();
    });

    this._hubConnection.onreconnected((connectionId) => {
      console.log('signalr reconnected:', connectionId);
      this._isConnected.set(true);
      if (this._joinedConversationId) void this.joinConversation(this._joinedConversationId);
    });

    this._hubConnection.onclose((error) => {
      console.log(error);
      this._isConnected.set(false);
      this._authStore.clearOnline();
      this.retryStart();
    });

    this._hubConnection.on('UserOnline', (user) => {
      this._authStore.userOnline(user);
    });

    this._hubConnection.on('UserOffline', (user) => {
      this._authStore.userOffline(user);
    });

    this._hubConnection.on('OnlineStatus', (onlineStatus) => {
      this._authStore.onlineStatus(onlineStatus);
    });

    this._hubConnection.on('UserTyping', (conversationId, userId) => {
      this._authStore.userTyping(conversationId, userId);
    });

    this._hubConnection.on('ConversationStartedTyping', (conversationId) => {
      this._conversationStore.conversationStartedTyping(conversationId);
    });

    this._hubConnection.on('ConversationStoppedTyping', (conversationId) => {
      this._conversationStore.conversationStoppedTyping(conversationId);
    });

    this._hubConnection.on('UserStoppedTyping', (conversationId, userId) => {
      this._authStore.userStopedTyping(conversationId, userId);
    });

    this._hubConnection.on('UserRecordingVoice', (conversationId, userId) => {
      this._conversationStore.userRecordingVoice(conversationId, userId);
    });

    this._hubConnection.on('UserStoppedRecordingVoice', (conversationId, userId) => {
      this._conversationStore.userStoppedRecordingVoice(conversationId, userId);
    });
    this._hubConnection.on('MessageCreated', (event: IMessage) => this._messageCreated.next(event));
    this._hubConnection.on('MessageEdited', (event: IMessage) => this._messageEdited.next(event));
    this._hubConnection.on('MessageDeleted', event => this._messageDeleted.next(event));
    this._hubConnection.on('MessageReceiptsUpdated', event => this._messageReceiptsUpdated.next(event));
    this._hubConnection.on('MessageReactionChanged', event => this._messageReactionChanged.next(event));
    this._hubConnection.on('MessagePinChanged', event => this._messagePinChanged.next(event));
  }
}
