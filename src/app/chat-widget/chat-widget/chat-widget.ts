import {
  Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone,
  ViewChild, ElementRef, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';

import { MessageService, Conversation, Message } from '../../core/services/message.service';
import { FriendsService } from '../../core/services/friends.service';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { UploadService } from '../../core/services/upload';
import { AvatarService } from '../../core/services/avatar';
import { ChatWidgetService } from '../../core/services/chat-widget.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.html',
  styleUrl: './chat-widget.css',
})
export class ChatWidget implements OnInit, OnDestroy {
  @ViewChild('messagesEnd') messagesEnd!: ElementRef;

  private api = environment.apiUrl;

  /* État widget */
  isOpen = false;
  unreadCount = 0;

  /* Données */
  conversations: Conversation[] = [];
  friends: any[] = [];
  activeChat: any = null;          // ami en cours de discussion
  messages: Message[] = [];
  newMessage = '';
  isSending = false;
  isLoadingMessages = false;
  isLoadingConversations = true;

  /* Recherche */
  searchQuery = '';
  searchResults: any[] = [];
  isSearching = false;

  /* Vue active : 'list' | 'chat' | 'search' */
  activeView: 'list' | 'chat' | 'search' = 'list';

  currentUserId = '';
  readMessageIds = new Set<string>();

  private subs: Subscription[] = [];

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private friendsService: FriendsService,
    private orderService: OrderService,
    private auth: AuthService,
    private chatWidgetService: ChatWidgetService,
    public uploadService: UploadService,
    public avatarService: AvatarService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  /* =========================================================
   *  CYCLE DE VIE
   * ========================================================= */
  ngOnInit(): void {
    this.currentUserId = this.auth.getUser()?._id || '';

    /* --- Widget ouvert / fermé --- */
    this.subs.push(
      this.chatWidgetService.isOpen$.subscribe((open) => {
        this.zone.run(() => {
          this.isOpen = open;
          if (open) this.loadConversations();
          this.cdr.detectChanges();
        });
      })
    );

    /* --- Nombre non lus --- */
    this.subs.push(
      this.chatWidgetService.unread$.subscribe((n) => {
        this.zone.run(() => {
          this.unreadCount = n;
          this.cdr.detectChanges();
        });
      })
    );

    /* --- Nouveau message reçu (temps réel) --- */
    this.orderService.connectSocket();

    if (this.orderService['socket']) {
      this.orderService['socket'].on('new-message', (msg: any) => {
        this.zone.run(() => {
          // Ajouter au chat actif si ouvert
          if (this.activeChat && (
            msg.senderId === this.activeChat._id ||
            msg.recipientId === this.activeChat._id
          )) {
            this.messages.push(msg);
            this.scrollToBottom();
          }
          // Rafraîchir la liste des conversations
          this.loadConversations();
          this.cdr.detectChanges();
        });
      });
    }

    /* --- Messages lus (accusés) --- */
    this.subs.push(
      this.orderService.messagesRead$.subscribe((payload) => {
        this.zone.run(() => {
          for (const id of payload.messageIds) this.readMessageIds.add(id);
          this.messages = this.messages.map((m) =>
            payload.messageIds.includes(m._id) ? { ...m, read: true } : m
          );
          this.cdr.detectChanges();
        });
      })
    );

    /* --- Charger amis + non lus --- */
    this.loadFriends();
    this.refreshUnreadCount();
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  /* =========================================================
   *  OUVERTURE / FERMETURE
   * ========================================================= */
  toggleWidget(): void {
    this.chatWidgetService.toggle();
    if (!this.isOpen) this.resetView();
  }

  closeWidget(): void {
    this.chatWidgetService.close();
    this.resetView();
  }

  private resetView(): void {
    this.activeView = 'list';
    this.activeChat = null;
    this.messages = [];
    this.searchQuery = '';
    this.searchResults = [];
  }

  /* =========================================================
   *  CHARGEMENT
   * ========================================================= */
  loadConversations(): void {
    this.messageService.getConversations().subscribe({
      next: (list) => this.zone.run(() => {
        this.conversations = list || [];
        this.isLoadingConversations = false;

        // Total non lus
        const total = this.conversations.reduce(
          (sum, c) => sum + (c.unreadCount || 0), 0
        );
        this.chatWidgetService.setUnread(total);

        this.cdr.detectChanges();
      }),
      error: () => this.zone.run(() => {
        this.isLoadingConversations = false;
        this.cdr.detectChanges();
      }),
    });
  }

  private refreshUnreadCount(): void {
    this.messageService.getConversations().subscribe({
      next: (list) => {
        const total = (list || []).reduce(
          (sum, c) => sum + (c.unreadCount || 0), 0
        );
        this.chatWidgetService.setUnread(total);
      },
    });
  }

  private loadFriends(): void {
    this.friendsService.getMyFriends().subscribe({
      next: (res) => this.zone.run(() => {
        this.friends = res || [];
        this.cdr.detectChanges();
      }),
    });
  }

  /* =========================================================
   *  OUVRIR UN CHAT
   * ========================================================= */
  openChat(user: any): void {
    this.activeChat = user;
    this.activeView = 'chat';
    this.isLoadingMessages = true;
    this.messages = [];

    const userId = user.userId || user._id;

    this.messageService.getMessagesWith(userId).subscribe({
      next: (msgs) => this.zone.run(() => {
        this.messages = msgs || [];
        this.isLoadingMessages = false;
        this.cdr.detectChanges();
        this.scrollToBottom();

        // Rafraîchit les non lus après lecture
        this.loadConversations();
      }),
      error: () => this.zone.run(() => {
        this.isLoadingMessages = false;
        this.cdr.detectChanges();
      }),
    });
  }

  backToList(): void {
    this.activeView = 'list';
    this.activeChat = null;
    this.messages = [];
    this.loadConversations();
  }

  /* =========================================================
   *  RECHERCHE
   * ========================================================= */
  onSearch(): void {
    const q = this.searchQuery.trim();
    if (q.length < 2) {
      this.searchResults = [];
      return;
    }

    this.isSearching = true;
    this.activeView = 'search';

    this.friendsService.search(q).subscribe({
      next: (res) => this.zone.run(() => {
        this.searchResults = res || [];
        this.isSearching = false;
        this.cdr.detectChanges();
      }),
      error: () => this.zone.run(() => {
        this.searchResults = [];
        this.isSearching = false;
        this.cdr.detectChanges();
      }),
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.activeView = 'list';
  }

  startChatWith(user: any): void {
    this.openChat(user);
    this.searchQuery = '';
    this.searchResults = [];
  }

  /* =========================================================
   *  ENVOYER
   * ========================================================= */
  send(): void {
    const content = this.newMessage.trim();
    if (!content || this.isSending || !this.activeChat) return;

    this.isSending = true;
    const recipientId = this.activeChat.userId || this.activeChat._id;

    // Message optimiste
    const tempId = `temp-${Date.now()}`;
    const tempMsg: any = {
      _id: tempId,
      senderId: this.currentUserId,
      recipientId,
      content,
      read: false,
      _temp: true,
      createdAt: new Date().toISOString(),
    };
    this.messages.push(tempMsg);
    this.newMessage = '';
    this.scrollToBottom();
    this.cdr.detectChanges();

    this.http.post<any>(`${this.api}/messages`, { recipientId, content }).subscribe({
      next: (msg) => this.zone.run(() => {
        const idx = this.messages.findIndex((m) => m._id === tempId);
        if (idx !== -1) this.messages[idx] = msg;
        this.isSending = false;
        this.cdr.detectChanges();
      }),
      error: () => this.zone.run(() => {
        this.messages = this.messages.filter((m) => m._id !== tempId);
        this.isSending = false;
        this.cdr.detectChanges();
      }),
    });
  }

  /* =========================================================
   *  HELPERS
   * ========================================================= */
  isMine(msg: any): boolean {
    const sid = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
    return sid === this.currentUserId;
  }

  isRead(msg: any): boolean {
    if (!this.isMine(msg)) return false;
    return msg.read === true || this.readMessageIds.has(msg._id);
  }

  isSendingMsg(msg: any): boolean {
    return msg._temp === true;
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  hasAvatar(u: any): boolean {
    return this.uploadService.hasImage(u?.avatar);
  }

  getAvatarUrl(u: any): string {
    return this.uploadService.getImageUrl(u?.avatar);
  }

  getInitials(name: string): string {
    return this.avatarService.getInitials(name || '');
  }

  getGradient(name: string): string {
    return this.avatarService.getGradient(name || '');
  }

  formatTime(d: string): string {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDate(d: string): string {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diff === 0) return this.formatTime(d);
    if (diff === 1) return 'Hier';
    if (diff < 7) return `Il y a ${diff}j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) this.closeWidget();
  }
}