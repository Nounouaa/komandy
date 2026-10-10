import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

/* =========================================================
 * TYPES
 * ========================================================= */
export interface Conversation {
  userId: string;
  name: string;
  avatar?: string;
  role: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface Message {
  _id: string;
  senderId: any;
  senderName: string;
  senderRole: string;
  recipientId: any;
  content: string;
  read: boolean;
  createdAt: string;
}

/* =========================================================
 * SERVICE
 * ========================================================= */
@Injectable({ providedIn: 'root' })
export class MessageService {
  private api = `${environment.apiUrl}/messages`;

  /* --- Flux d'ouverture de conversation (widget) --- */
  private openConversationSubject = new Subject<{
    userId: string;
    name: string;
    avatar?: string;
    role: string;
    pendingMessage?: string;
  }>();

  openConversation$ = this.openConversationSubject.asObservable();

  constructor(private http: HttpClient) {}

  /* ---------------------------------------------------------
   *  WIDGET — Ouvrir une conversation programmatiquement
   * --------------------------------------------------------- */
  requestOpenConversation(recipient: {
    userId: string;
    name: string;
    avatar?: string;
    role: string;
    pendingMessage?: string;
  }) {
    this.openConversationSubject.next(recipient);
  }

  /* ---------------------------------------------------------
   *  CONVERSATIONS
   * --------------------------------------------------------- */
  getConversations() {
    return this.http.get<Conversation[]>(`${this.api}/conversations`);
  }

  getMessagesWith(userId: string) {
    return this.http.get<Message[]>(`${this.api}/with/${userId}`);
  }

  /* ---------------------------------------------------------
   *  ENVOI / LECTURE / SUPPRESSION
   * --------------------------------------------------------- */
  send(recipientId: string, content: string, orderId?: string) {
    return this.http.post<Message>(this.api, {
      recipientId,
      content,
      orderId,
    });
  }

  markAsRead(messageId: string) {
    return this.http.patch<Message>(`${this.api}/${messageId}/read`, {});
  }

  delete(messageId: string) {
    return this.http.delete(`${this.api}/${messageId}`);
  }
}