import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { IConversation } from '../models/conversation';

@Service()
export class ConversationApi {
  private readonly BASE_URL = `${environment.apiUrl}/api/conversations`;
  private readonly httpClient = inject(HttpClient);

  getConversations(): Observable<IConversation[]> {
    return this.httpClient.get<IConversation[]>(this.BASE_URL);
  }

  createPrivate(userId: string): Observable<string> {
    return this.httpClient.post<string>(`${this.BASE_URL}/private`, { userId });
  }

  createGroup(title: string, participantIds: string[]): Observable<string> {
    return this.httpClient.post<string>(`${this.BASE_URL}/group`, { title, participantIds });
  }
}
