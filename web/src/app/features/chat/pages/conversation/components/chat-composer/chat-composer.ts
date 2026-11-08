import { Component, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  imports: [TranslatePipe],
  selector: 'app-chat-composer',
  styleUrl: './chat-composer.css',
  templateUrl: './chat-composer.html',
})
export class ChatComposer {
  message = signal<string>('');
  onTyping = output<void>();
  onMessageSend = output<string>();

  onMessageInput(event: InputEvent) {
    const sendMessageInput = event.target as HTMLInputElement;
    this.message.set(sendMessageInput.value);
    this.onTyping.emit();
  }
  sendMessage() {
    const message = this.message().trim();
    if (!message) return;

    this.onMessageSend.emit(message);
  }
}
