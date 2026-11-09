import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable, switchMap, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SKIP_API_AUTH, SKIP_API_COOKIES } from '../../../core/interceptor/request-context';

export type MessageType =
  | 'Text' | 'Image' | 'Video' | 'Audio' | 'VoiceNote' | 'Document'
  | 'Location' | 'Contact' | 'Sticker' | 'Gif' | 'Link' | 'System';

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

export interface IStartUpload {
  uploadId: string;
  putUrl: string;
  expiresAtUtc: string;
  maximumSizeBytes: number;
}

export interface ICompletedUpload {
  uploadId: string;
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

@Service()
export class MessagesApi {
  private readonly baseUrl = `${environment.apiUrl}/api`;
  private readonly http = inject(HttpClient);

  getMessages(conversationId: string, before?: { createdAtUtc: string; id: string }, limit = 50): Observable<IMessage[]> {
    let params = new HttpParams().set('limit', limit);
    if (before) params = params.set('beforeUtc', before.createdAtUtc).set('beforeId', before.id);
    return this.http.get<IMessage[]>(`${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}/messages`, { params });
  }

  sendMessage(conversationId: string, request: ISendMessageRequest): Observable<IMessage> {
    return this.http.post<IMessage>(`${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}/messages`, request);
  }

  startAttachmentUpload(conversationId: string, file: File): Observable<IStartUpload> {
    return this.http.post<IStartUpload>(`${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}/uploads`, {
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
    });
  }

  uploadAttachment(upload: IStartUpload, file: File | Blob): Observable<void> {
    return this.http.put(upload.putUrl, file, {
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      context: new HttpContext().set(SKIP_API_AUTH, true).set(SKIP_API_COOKIES, true),
      responseType: 'text',
    }).pipe(map(() => undefined));
  }

  completeAttachmentUpload(uploadId: string): Observable<ICompletedUpload> {
    return this.http.post<ICompletedUpload>(`${this.baseUrl}/uploads/${encodeURIComponent(uploadId)}/complete`, {});
  }

  uploadFile(conversationId: string, file: File | Blob, fileName: string): Observable<ICompletedUpload> {
    const uploadFile = file instanceof File ? file : new File([file], fileName, { type: file.type });
    return this.startAttachmentUpload(conversationId, uploadFile).pipe(
      switchMap(upload => this.uploadAttachment(upload, uploadFile).pipe(
        switchMap(() => this.completeAttachmentUpload(upload.uploadId)),
      )),
    );
  }

  getAttachment(attachmentId: string): Observable<{ blob: Blob; fileName: string; contentType: string }> {
    return this.http.get<{ downloadUrl: string; fileName: string; contentType: string; sizeBytes: number }>(
      `${this.baseUrl}/attachments/${encodeURIComponent(attachmentId)}/download`,
    ).pipe(switchMap(({ downloadUrl, fileName, contentType }) => this.http.get(downloadUrl, {
      responseType: 'blob',
      context: new HttpContext().set(SKIP_API_AUTH, true).set(SKIP_API_COOKIES, true),
    }).pipe(map(blob => ({ blob, fileName, contentType })))));
  }

  editMessage(messageId: string, text: string): Observable<IMessage> {
    return this.http.put<IMessage>(`${this.baseUrl}/messages/${encodeURIComponent(messageId)}`, { text });
  }

  deleteMessage(messageId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/messages/${encodeURIComponent(messageId)}`);
  }

  markRead(conversationId: string, messageIds: string[]): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}/messages/read`, { messageIds });
  }

  toggleReaction(messageId: string, emoji: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/messages/${encodeURIComponent(messageId)}/reactions`, { emoji });
  }

  forwardMessage(messageId: string, targetConversationId: string): Observable<IMessage> {
    return this.http.post<IMessage>(`${this.baseUrl}/messages/${encodeURIComponent(messageId)}/forward`, { targetConversationId });
  }

  setPinned(messageId: string, isPinned: boolean): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/messages/${encodeURIComponent(messageId)}/pin`, { isPinned });
  }

  searchMessages(conversationId: string, term: string): Observable<Array<Pick<IMessage,
    'id' | 'senderUserId' | 'senderDisplayName' | 'text' | 'createdAtUtc' | 'isForwarded'>>> {
    const params = new HttpParams().set('term', term);
    return this.http.get<Array<Pick<IMessage,
      'id' | 'senderUserId' | 'senderDisplayName' | 'text' | 'createdAtUtc' | 'isForwarded'>>>(
      `${this.baseUrl}/conversations/${encodeURIComponent(conversationId)}/messages/search`, { params });
  }
}
