import { Component, input, output, signal } from '@angular/core';
import { IMessage } from '../../../../services/messages-api';

@Component({
  selector: 'app-chat-composer',
  styleUrl: './chat-composer.css',
  templateUrl: './chat-composer.html',
})
export class ChatComposer {
  readonly message = signal('');
  readonly replyTo = input<IMessage | null>(null);
  readonly disabled = input(false);
  readonly onClearReply = output<void>();
  readonly isRecording = signal(false);
  readonly onTyping = output<void>();
  readonly onMessageSend = output<string>();
  readonly onFileSelected = output<File>();
  readonly onVoiceMessage = output<Blob>();
  readonly onLocationShare = output<{ latitude: number; longitude: number }>();
  readonly onContactShare = output<{ name: string; phone: string }>();
  readonly onStickerSelected = output<File>();

  private recorder?: MediaRecorder;
  private recordingChunks: BlobPart[] = [];

  replyPreview(reply: IMessage): string {
    if (reply.deletedAtUtc) return 'Message deleted';
    if (reply.text?.trim()) return reply.text;
    return reply.type === 'VoiceNote' ? 'Voice message' : reply.type;
  }

  onMessageInput(event: Event): void {
    const input = event.target as HTMLTextAreaElement;
    this.message.set(input.value);
    this.onTyping.emit();
  }

  sendMessage(): void {
    const text = this.message().trim();
    if (!text) return;
    this.onMessageSend.emit(text);
    this.message.set('');
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.onFileSelected.emit(file);
    input.value = '';
  }

  onStickerChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.onStickerSelected.emit(file);
    input.value = '';
  }

  shareContact(): void {
    const name = window.prompt('Contact name');
    if (!name?.trim()) return;
    const phone = window.prompt('Phone number') ?? '';
    this.onContactShare.emit({ name: name.trim(), phone: phone.trim() });
  }

  async toggleRecording(): Promise<void> {
    if (this.recorder?.state === 'recording') {
      this.recorder.stop();
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.recordingChunks = [];
    this.recorder = new MediaRecorder(stream);
    this.recorder.ondataavailable = event => {
      if (event.data.size) this.recordingChunks.push(event.data);
    };
    this.recorder.onstop = () => {
      const audio = new Blob(this.recordingChunks, { type: this.recorder?.mimeType || 'audio/webm' });
      stream.getTracks().forEach(track => track.stop());
      if (audio.size) this.onVoiceMessage.emit(audio);
      this.isRecording.set(false);
    };
    this.recorder.start();
    this.isRecording.set(true);
  }

  shareLocation(): void {
    navigator.geolocation.getCurrentPosition(position => this.onLocationShare.emit({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    }));
  }
}
