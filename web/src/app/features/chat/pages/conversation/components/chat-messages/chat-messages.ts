import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, input, OnDestroy, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MessagesApi, IMessage, IMessageAttachment } from '../../../../services/messages-api';

@Component({
  imports: [DatePipe, DecimalPipe],
  selector: 'app-chat-messages',
  styleUrl: './chat-messages.css',
  templateUrl: './chat-messages.html',
})
export class ChatMessages implements OnDestroy {
  readonly messages = input<IMessage[]>([]);
  readonly currentUserId = input('');
  readonly onReact = output<{ messageId: string; emoji: string }>();
  readonly onEdit = output<IMessage>();
  readonly onReply = output<IMessage>();
  readonly onDelete = output<IMessage>();
  readonly onForward = output<IMessage>();
  readonly onPin = output<IMessage>();
  readonly attachmentUrls = signal<Record<string, string>>({});
  readonly quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  private readonly loadedAttachments = new Set<string>();
  private readonly messagesApi = inject(MessagesApi);

  ngOnDestroy(): void {
    for (const url of Object.values(this.attachmentUrls())) URL.revokeObjectURL(url);
  }

  ngOnChanges(): void {
    for (const message of this.messages()) {
      for (const file of message.attachments) {
        if (/^(image|video|audio)\//.test(file.contentType)) void this.loadAttachment(file);
      }
    }
  }

  isMine(message: IMessage): boolean {
    return message.senderUserId === this.currentUserId();
  }

  repliedMessage(message: IMessage): IMessage | null {
    return this.messages().find(item => item.id === message.replyToMessageId) ?? null;
  }

  getUrl(attachmentId: string): string | null {
    return this.attachmentUrls()[attachmentId] ?? null;
  }

  async download(file: IMessageAttachment): Promise<void> {
    const url = this.getUrl(file.id) ?? await this.loadAttachment(file);
    if (!url) return;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.fileName;
    anchor.click();
  }

  location(message: IMessage): { latitude: number; longitude: number } | null {
    try {
      const value = JSON.parse(message.contentJson ?? '{}');
      return { latitude: Number(value.latitude), longitude: Number(value.longitude) };
    } catch { return null; }
  }

  linkUrl(message: IMessage): string | null {
    try {
      const url = JSON.parse(message.contentJson ?? '{}').url;
      return typeof url === 'string' && /^https?:\/\//i.test(url) ? url : null;
    } catch { return null; }
  }

  contact(message: IMessage): { name: string; phone: string } | null {
    try {
      const value = JSON.parse(message.contentJson ?? '{}');
      return { name: String(value.name ?? message.text ?? 'Contact'), phone: String(value.phone ?? '') };
    } catch { return null; }
  }

  receiptState(message: IMessage): string {
    if (message.receipts.some(receipt => receipt.readAtUtc)) return '✓✓';
    if (message.receipts.some(receipt => receipt.deliveredAtUtc)) return '✓✓';
    return '✓';
  }

  private async loadAttachment(file: IMessageAttachment): Promise<string | null> {
    if (this.loadedAttachments.has(file.id)) return this.getUrl(file.id);
    this.loadedAttachments.add(file.id);
    try {
      const result = await firstValueFrom(this.messagesApi.getAttachment(file.id));
      const url = URL.createObjectURL(result.blob);
      this.attachmentUrls.update(urls => ({ ...urls, [file.id]: url }));
      return url;
    } catch {
      this.loadedAttachments.delete(file.id);
      return null;
    }
  }
}
