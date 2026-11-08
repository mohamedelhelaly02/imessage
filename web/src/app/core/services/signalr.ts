import { inject, Service } from '@angular/core';
import { HubConnection } from '@microsoft/signalr';
import * as signalr from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../../features/auth/services/store';
import { ConversationStore } from '../../features/chat/services/store';
import { toast } from 'ngx-sonner';
@Service()
export class SignalrService {
  private _hubConnection!: HubConnection;
  private readonly _hubUrl = `${environment.apiUrl}/hubs/chat`;
  private readonly _authStore = inject(AuthStore);
  private readonly _conversationStore = inject(ConversationStore);

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
      .withAutomaticReconnect()
      .build();

    this.registerHubEvents();

    try {
      await this._hubConnection.start();
      console.log('Hub Connnected.');
    } catch (error) {
      console.error(`Hub connection error: ${error}`);
    }
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

  async joinConversation(conversationId: string): Promise<void> {
    try {
      await this._hubConnection.invoke('JoinConversation', conversationId);
    } catch (error) {}
  }

  async leaveConversation(conversationId: string): Promise<void> {
    try {
      await this._hubConnection.invoke('LeaveConversation', conversationId);
    } catch (error) {}
  }

  private registerHubEvents(): void {
    this._hubConnection.on('ReceiveCallerConnected', () => {
      console.log('User connected.');
      toast.success('User Connected');
    });

    this._hubConnection.onreconnecting((error) => {
      console.warn('signalr reconnecting', error);
    });

    this._hubConnection.onreconnected((connectionId) => {
      console.log('signalr reconnected:', connectionId);
    });

    this._hubConnection.onclose((error) => {
      console.log(error);
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
  }
}
