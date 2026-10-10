import {
  Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import {
  MessageService, Conversation,
} from '../../core/services/message.service';
import { FriendsService } from '../../core/services/friends.service';
import { AuthService } from '../../core/services/auth.service';
import { UploadService } from '../../core/services/upload';
import { AvatarService } from '../../core/services/avatar';
import { OrderService } from '../../core/services/order.service';

@Component({
  selector: 'app-messages-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './messages-list.html',
  styleUrl: './messages-list.css',
})
export class MessagesList implements OnInit, OnDestroy {

  /* =========================================================
   *  CONTEXTE ('client' | 'restaurant')
   * ========================================================= */
  context: 'client' | 'restaurant' = 'client';

  /* =========================================================
   *  ÉTAT
   * ========================================================= */
  conversations: Conversation[] = [];
  filteredConversations: Conversation[] = [];
  isLoading = true;

  /** Recherche */
  searchQuery = '';
  searchResults: any[] = [];
  isSearching = false;
  searchMode = false;

  /** Onglet : 'conversations' | 'search' */
  activeTab: 'conversations' | 'search' = 'conversations';

  /** Messages non lus total */
  unreadTotal = 0;

  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService,
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
    /* --- Récupère le contexte depuis route.data --- */
    const data = this.route.snapshot.data;
    this.context = data?.['context'] === 'restaurant' ? 'restaurant' : 'client';

    this.loadConversations();

    /* --- Socket : recharger si nouveau message --- */
    this.orderService.connectSocket();

    if (this.orderService['socket']) {
      this.orderService['socket'].on('new-message', () => {
        this.zone.run(() => this.loadConversations());
      });
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  /* =========================================================
   *  CHARGEMENT
   * ========================================================= */
  loadConversations(): void {
    this.messageService.getConversations().subscribe({
      next: (list) => {
        this.zone.run(() => {
          this.conversations = list || [];
          this.filteredConversations = [...this.conversations];
          this.unreadTotal = this.conversations.reduce(
            (s, c) => s + (c.unreadCount || 0), 0
          );
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
    });
  }

  /* =========================================================
   *  RECHERCHE — filtre sur les conversations + recherche amis
   * ========================================================= */
  onSearchInput(): void {
    const q = this.searchQuery.trim().toLowerCase();

    /* --- Filtre local sur les conversations --- */
    if (!q) {
      this.filteredConversations = [...this.conversations];
      this.searchResults = [];
      return;
    }

    this.filteredConversations = this.conversations.filter(
      (c) => c.name?.toLowerCase().includes(q)
    );

    /* --- Recherche dans la liste des amis (backend) --- */
    if (q.length >= 2) {
      this.isSearching = true;
      this.friendsService.search(this.searchQuery.trim()).subscribe({
        next: (res) => {
          this.zone.run(() => {
            this.searchResults = res || [];
            this.isSearching = false;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.searchResults = [];
            this.isSearching = false;
            this.cdr.detectChanges();
          });
        },
      });
    } else {
      this.searchResults = [];
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.filteredConversations = [...this.conversations];
  }

  setTab(tab: 'conversations' | 'search'): void {
    this.activeTab = tab;
    if (tab === 'conversations') {
      this.searchQuery = '';
      this.searchResults = [];
      this.filteredConversations = [...this.conversations];
    }
  }

  /* =========================================================
   *  OUVRIR UN CHAT
   * ========================================================= */
  openChat(userId: string): void {
    this.router.navigate([`/${this.context}/messages`, userId]);
  }

  /* =========================================================
   *  HELPERS
   * ========================================================= */
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

  formatDate(d: string): string {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diff === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    if (diff === 1) return 'Hier';
    if (diff < 7) return `Il y a ${diff}j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }
}