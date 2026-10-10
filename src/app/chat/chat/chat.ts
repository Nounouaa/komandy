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

  friendId = '';
  friend: any = null;
  messages: any[] = [];
  newMessage = '';
  isLoading = true;
  isSending = false;

  currentUserId = '';
  private refreshSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private friendsService: FriendsService,
    private auth: AuthService,
    public uploadService: UploadService,
    public avatarService: AvatarService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.auth.getUser()?._id || '';
    this.friendId = this.route.snapshot.paramMap.get('id') || '';

    if (!this.friendId) {
      this.router.navigate(['/client/amis']);
      return;
    }

    this.loadFriend();
    this.loadMessages();

    // 🔄 Refresh toutes les 5s (fallback temps réel)
    this.refreshSub = new Subscription();
    const interval = setInterval(() => this.loadMessages(true), 5000);
    this.refreshSub.add(() => clearInterval(interval));
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
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
          const hasNew = msgs.length !== this.messages.length;
          this.messages = msgs || [];
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

    this.http.post<any>(`${this.api}/messages`, {
      recipientId: this.friendId,
      content,
    }).subscribe({
      next: (msg) => {
        this.zone.run(() => {
          this.messages.push(msg);
          this.newMessage = '';
          this.isSending = false;
          this.cdr.detectChanges();
          this.scrollToBottom();
        });
      },
      error: (err) => {
        this.zone.run(() => {
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