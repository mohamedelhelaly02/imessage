import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthStore } from './features/auth/services/store';
import { SignalrService } from './core/services/signalr';
import { NgxSonnerToaster } from 'ngx-sonner';
import { ConversationStore } from './features/chat/services/store';

@Component({
  imports: [RouterOutlet, NgxSonnerToaster],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly _authStore = inject(AuthStore);
  private readonly _conversationStore = inject(ConversationStore);
  private readonly _signalrService = inject(SignalrService);

  constructor() {
    effect(() => {
      const isAuthenticated = this._authStore.isAuthenticated();
      const token = this._authStore.accessToken();

      if (isAuthenticated && token) {
        this.connect().then(() => this._conversationStore.resetState());
      } else if (!isAuthenticated) {
        this.disconnect();
      }
    });
  }

  private async connect() {
    try {
      await this._signalrService.startConnection();
      await this._signalrService.notifyCallerOnline();
    } catch (error) {}
  }

  private async disconnect() {
    await this._signalrService.stopConnection();
  }
}
