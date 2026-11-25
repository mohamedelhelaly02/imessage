import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { from, Observable, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type MessageType =
  | 'Text'
  | 'Image'
  | 'Video'
  | 'Audio'
  | 'VoiceNote'
  | 'Document'
  | 'Location'
  | 'Contact'
  | 'Sticker'
  | 'Gif'
  | 'Link'
  | 'System';

export interface IMessageAttachment {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
}

export interface IMessageReaction {
  userId: string;
  displayName: string;
  emoji: string;
}

export interface IMessageReceipt {
  userId: string;
  displayName: string;
  deliveredAtUtc: string | null;
  readAtUtc: string | null;
}

export interface IMessage {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderDisplayName: string;
  type: MessageType;
  text: string | null;
  contentJson: string | null;
  replyToMessageId: string | null;
  isPinned: boolean;
  isForwarded: boolean;
  createdAtUtc: string;
  editedAtUtc: string | null;
  deletedAtUtc: string | null;
  attachments: IMessageAttachment[];
  reactions: IMessageReaction[];
  receipts: IMessageReceipt[];
}

export interface IAttachmentUploadResponse {
  uploadId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  expiresAtUtc: string;
}

export interface IAttachmentDownloadUrlResponse {
  downloadUrl: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface ISendMessageRequest {
  clientMessageId: string;
  type: MessageType;
  text?: string | null;
  contentJson?: string | null;
  replyToMessageId?: string | null;
  attachmentUploadIds: string[];
}

export interface IToggleReactionResponse {
  messageId: string;
  userId: string;
  displayName: string;
  emoji: string;
  isRemoved: boolean;
}

export interface ISearchMessageResponse {
  id: string;
  senderUserId: string;
  senderDisplayName: string;
  text: string | null;
  createdAtUtc: string;
  isForwarded: boolean;
}

@Service()
export class MessagesApi {
  private readonly baseUrl = `${environment.apiUrl}/api`;
  private readonly http = inject(HttpClient);

  getMessages(
    conversationId: string,
    before?: { createdAtUtc: string; id: string },
    limit?: number,
  ): Observable<IMessage[]> {
    let params = new HttpParams();
    if (limit) params = params.set('limit', limit);
    if (before) params = params.set('beforeUtc', before.createdAtUtc).set('beforeId', before.id);

    return this.http.get<IMessage[]>(
      `${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}/messages`,
      { params },
    );
  }

  sendMessage(conversationId: string, request: ISendMessageRequest): Observable<IMessage> {
    return this.http.post<IMessage>(
      `${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}/messages`,
      request,
    );
  }

  uploadAttachment(
    conversationId: string,
    type: MessageType,
    file: File,
  ): Observable<IAttachmentUploadResponse> {
    return from(type === 'Image' ? compressImage(file) : Promise.resolve(file)).pipe(
      switchMap((prepared) => this.uploadPrepared(conversationId, type, prepared)),
    );
  }

  private uploadPrepared(
    conversationId: string,
    type: MessageType,
    file: File,
  ): Observable<IAttachmentUploadResponse> {
    const formData = new FormData();

    formData.append('type', type.toString());
    formData.append('file', file, file.name);

    return this.http.post<IAttachmentUploadResponse>(
      `${environment.hubUrl}/api/conversations/${encodeURIComponent(conversationId)}/attachments`,
      formData,
    );
  }

  getAttachmentDownloadUrl(attachmentId: string): Observable<IAttachmentDownloadUrlResponse> {
    return this.http.get<IAttachmentDownloadUrlResponse>(
      `${this.baseUrl}/attachments/${encodeURIComponent(attachmentId)}/download`,
    );
  }

  editMessage(messageId: string, text: string): Observable<IMessage> {
    return this.http.put<IMessage>(`${this.baseUrl}/messages/${encodeURIComponent(messageId)}`, {
      text,
    });
  }

  deleteMessage(messageId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/messages/${encodeURIComponent(messageId)}`);
  }

  markRead(conversationId: string, messageIds: string[]): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}/messages/read`,
      { messageIds },
    );
  }

  toggleReaction(messageId: string, emoji: string): Observable<IToggleReactionResponse> {
    return this.http.post<IToggleReactionResponse>(
      `${this.baseUrl}/messages/${encodeURIComponent(messageId)}/reactions`,
      {
        emoji,
      },
    );
  }

  forwardMessage(messageId: string, targetConversationId: string): Observable<IMessage> {
    return this.http.post<IMessage>(
      `${this.baseUrl}/messages/${encodeURIComponent(messageId)}/forward`,
      { targetConversationId },
    );
  }

  setPinned(messageId: string, isPinned: boolean): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/messages/${encodeURIComponent(messageId)}/pin`, {
      isPinned,
    });
  }

  searchMessages(
    conversationId: string,
    term: string,
    limit?: number,
  ): Observable<ISearchMessageResponse[]> {
    let params = new HttpParams().set('term', term);

    if (limit) params = params.set('limit', limit);

    return this.http.get<ISearchMessageResponse[]>(
      `${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}/messages/search`,
      {
        params,
      },
    );
  }
}


async function compressImage(file: File): Promise<File> {
  const maxSide = 1600;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 300 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      return file;
    }
    const keepsAlpha = file.type !== 'image/jpeg';
    if (!keepsAlpha) {
      context.fillStyle = '#fff';
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const mime = keepsAlpha ? 'image/webp' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.82));
    if (!blob || blob.type !== mime || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + (keepsAlpha ? '.webp' : '.jpg');
    return new File([blob], name, { type: mime });
  } catch {
    return file;
  }
}
