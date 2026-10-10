import {
  Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone,
  ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { FriendsService } from '../../core/services/friends.service';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { UploadService } from '../../core/services/upload';
import { AvatarService } from '../../core/services/avatar';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat implements OnInit, OnDestroy {
  @ViewChild('messagesEnd') messagesEnd!: ElementRef;

  private api = environment.apiUrl;

  /* =========================================================
   *  ÉTAT
   * ========================================================= */
  friendId = '';
  friend: any = null;
  messages: any[] = [];
  newMessage = '';
  isLoading = true;
  isSending = false;

  currentUserId = '';

  /** IDs des messages marqués lus en temps réel (via socket). */
  readMessageIds = new Set<string>();

  private refreshSub?: Subscription;
  private readSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private friendsService: FriendsService,
    private auth: AuthService,
    private orderService: OrderService,
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
    this.friendId = this.route.snapshot.paramMap.get('id') || '';

    if (!this.friendId) {
      this.router.navigate(['/client/amis']);
      return;
    }

    this.loadFriend();
    this.loadMessages();

    /* ---------------------------------------------------------
     *  Socket — connect + écoute accusés de lecture
     * --------------------------------------------------------- */
    this.orderService.connectSocket();

    this.readSub = this.orderService.messagesRead$.subscribe((payload) => {
      this.zone.run(() => {
        // Ajoute les IDs lus
        for (const id of payload.messageIds) {
          this.readMessageIds.add(id);
        }

        // Met à jour les messages en mémoire
        this.messages = this.messages.map((m) =>
          payload.messageIds.includes(m._id) ? { ...m, read: true } : m
        );

        this.cdr.detectChanges();
      });
    });

    /* ---------------------------------------------------------
     *  Polling (fallback toutes les 5s)
     * --------------------------------------------------------- */
    this.refreshSub = new Subscription();
    const interval = setInterval(() => this.loadMessages(true), 5000);
    this.refreshSub.add(() => clearInterval(interval));
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
    this.readSub?.unsubscribe();
  }

  /* =========================================================
   *  CHARGEMENT
   * ========================================================= */
  private loadFriend(): void {
    this.friendsService.getMyFriends().subscribe({
      next: (friends) => {
        this.friend = friends.find((f) => f._id === this.friendId);
        this.cdr.detectChanges();
      },
    });
  }

  private loadMessages(silent = false): void {
    this.http.get<any[]>(`${this.api}/messages/with/${this.friendId}`).subscribe({
      next: (msgs) => {
        this.zone.run(() => {
          const list = msgs || [];
          const hasNew = list.length !== this.messages.length;

          // Fusionne en gardant l'état `read: true` local (socket)
          this.messages = list.map((newMsg) => {
            const wasReadLocally = this.readMessageIds.has(newMsg._id);
            if (wasReadLocally) return { ...newMsg, read: true };
            return newMsg;
          });

          if (!silent) this.isLoading = false;
          this.cdr.detectChanges();
          if (hasNew || !silent) this.scrollToBottom();
        });
      },
      error: () => {
        if (!silent) {
          this.zone.run(() => {
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        }
      },
    });
  }

  /* =========================================================
   *  ENVOYER
   * ========================================================= */
  send(): void {
    const content = this.newMessage.trim();
    if (!content || this.isSending) return;

    this.isSending = true;

    // Message temporaire (affiche immédiatement avec 🕐)
    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      _id: tempId,
      senderId: this.currentUserId,
      recipientId: this.friendId,
      content,
      read: false,
      _temp: true,
      createdAt: new Date().toISOString(),
    };

    this.messages.push(tempMsg);
    this.newMessage = '';
    this.scrollToBottom();
    this.cdr.detectChanges();

    this.http.post<any>(`${this.api}/messages`, {
      recipientId: this.friendId,
      content,
    }).subscribe({
      next: (msg) => {
        this.zone.run(() => {
          // Remplace le message temporaire par le vrai
          const idx = this.messages.findIndex((m) => m._id === tempId);
          if (idx !== -1) this.messages[idx] = msg;
          this.isSending = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          // Retire le message temporaire en cas d'erreur
          this.messages = this.messages.filter((m) => m._id !== tempId);
          this.isSending = false;
          this.cdr.detectChanges();
          alert(err.error?.message || 'Erreur envoi');
        });
      },
    });
  }

  /* =========================================================
   *  HELPERS
   * ========================================================= */
  isMine(msg: any): boolean {
    const sid = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
    return sid === this.currentUserId;
  }

  /** Vrai si ce message (envoyé par moi) a été lu par l'autre. */
  isRead(msg: any): boolean {
    if (!this.isMine(msg)) return false;
    return msg.read === true || this.readMessageIds.has(msg._id);
  }

  /** Vrai si ce message est en cours d'envoi (temporaire). */
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
    const date = new Date(d);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}