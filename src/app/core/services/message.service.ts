import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment.prod';


// =========================================================
// TYPES
// =========================================================

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

// =========================================================
// SERVICE
// =========================================================

@Injectable({ providedIn: 'root' })
export class MessageService {
  private api = `${environment.apiUrl}/messages`;



   // ✅ NOUVEAU : demande d'ouverture d'une conversation
  private openConversationSubject = new Subject<{
    userId: string;
    name: string;
    avatar?: string;
    role: string;
    pendingMessage?: string;   // message pré-rempli optionnel
  }>();

  openConversation$ = this.openConversationSubject.asObservable();

  // ✅ Méthode publique pour demander l'ouverture
  requestOpenConversation(recipient: {
    userId: string;
    name: string;
    avatar?: string;
    role: string;
    pendingMessage?: string;
  }) {
    this.openConversationSubject.next(recipient);
  }

  constructor(private http: HttpClient) {}

  /** Liste des conversations */
  getConversations() {
    return this.http.get<Conversation[]>(`${this.api}/conversations`);
  }

  /** Messages d'une conversation avec un utilisateur */
  getMessagesWith(userId: string) {
    return this.http.get<Message[]>(`${this.api}/with/${userId}`);
  }

  /** Envoyer un message */
  send(recipientId: string, content: string, orderId?: string) {
    return this.http.post<Message>(this.api, {
      recipientId,
      content,
      orderId,
    });
  }

  /** Marquer un message comme lu */
  markAsRead(messageId: string) {
    return this.http.patch<Message>(`${this.api}/${messageId}/read`, {});
  }

  /** Supprimer un message */
  delete(messageId: string) {
    return this.http.delete(`${this.api}/${messageId}`);
  }
}