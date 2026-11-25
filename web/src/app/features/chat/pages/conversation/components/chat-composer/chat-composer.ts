import { Component, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IMessage } from '../../../../services/messages-api';

@Component({
  imports: [TranslatePipe],
  selector: 'app-chat-composer',
  styleUrl: './chat-composer.css',
  templateUrl: './chat-composer.html',
})
export class ChatComposer {
  readonly message = signal('');
  readonly replyTo = input<IMessage | null>(null);
  readonly disabled = input(false);
  readonly sendingVoice = input(false);
  readonly onClearReply = output<void>();
  readonly isRecording = signal(false);
  readonly onRecordingChange = output<boolean>();
  readonly onTyping = output<void>();
  readonly onMessageSend = output<string>();
  readonly onFileSelected = output<File>();
  readonly onVoiceMessage = output<Blob>();
  readonly onLocationShare = output<{ latitude: number; longitude: number }>();
  readonly onContactShare = output<{ name: string; phone: string }>();
  readonly onStickerSelected = output<File>();

  private recorder?: MediaRecorder;
  private recordingChunks: BlobPart[] = [];
  private isStarting = false;

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
    if (this.isStarting) return;
    this.isStarting = true;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return;
    } finally {
      this.isStarting = false;
    }

    this.recordingChunks = [];
    const recorder = new MediaRecorder(stream);
    this.recorder = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size) this.recordingChunks.push(event.data);
    };
    recorder.onstop = () => {
      const audio = new Blob(this.recordingChunks, { type: recorder.mimeType || 'audio/webm' });
      stream.getTracks().forEach((track) => track.stop());
      this.isRecording.set(false);
      this.onRecordingChange.emit(false);
      if (audio.size) this.onVoiceMessage.emit(audio);
    };
    recorder.start();
    this.isRecording.set(true);
    this.onRecordingChange.emit(true);
  }

  ngOnDestroy(): void {
    // Leaving the chat while recording discards the clip.
    if (this.recorder?.state === 'recording') {
      const recorder = this.recorder;
      recorder.onstop = null;
      recorder.stream.getTracks().forEach(track => track.stop());
      recorder.stop();
    }
  }
  shareLocation(): void {
    navigator.geolocation.getCurrentPosition(position => this.onLocationShare.emit({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    }));
  }
}
