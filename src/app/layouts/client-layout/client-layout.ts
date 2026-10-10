import {
  ChangeDetectorRef,
  Component,
  HostListener,
  Inject,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { filter, Subject, takeUntil, Subscription, interval } from 'rxjs';

import { ClientSidebar } from '../../shared/client-sidebar/client-sidebar';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { AvatarService } from '../../core/services/avatar';
import { FavoriteService } from '../../core/services/favorite.service';
import { UploadService } from '../../core/services/upload';
import { OrderService } from '../../core/services/order.service';
import {
  MessageService,
  Conversation,
  Message,
} from '../../core/services/message.service';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, ClientSidebar, RouterOutlet, RouterLink],
  templateUrl: './client-layout.html',
  styleUrl: './client-layout.css',
})
export class ClientLayout implements OnInit, OnDestroy {

  /* =========================================================
   *  ÉTAT UI
   * ========================================================= */
  isSidebarCollapsed = false;
  isUserMenuOpen = false;
  isNotificationsOpen = false;
  isMessagesOpen = false;
  currentPage = 'Tableau de bord';

  /* =========================================================
   *  COMPTEURS
   * ========================================================= */
  notificationsCount = 0;
  messagesCount = 0;

  /* =========================================================
   *  PROFIL
   * ========================================================= */
  userName = '';
  userEmail = '';
  userAvatar = '';

  userStats = {
    orders: 0,
    favorites: 0,
    rating: 0,
  };

  /* =========================================================
   *  NOTIFICATIONS
   * ========================================================= */
  notifications: any[] = [];

  /* =========================================================
   *  MESSAGERIE
   * ========================================================= */
  conversations: Conversation[] = [];
  openedConversation: Conversation | null = null;
  messages: Message[] = [];
  newMessageText = '';
  isSendingMessage = false;
  isLoadingMessages = false;

  /** IDs des messages marqués lus en temps réel. */
  readMessageIds = new Set<string>();

  /* =========================================================
   *  PRIVÉ
   * ========================================================= */
  private readonly MOBILE_BREAKPOINT = 991.98;
  private destroy$ = new Subject<void>();
  private subs: Subscription[] = [];
  private ordersSub?: Subscription;
  private refreshSub?: Subscription;

  constructor(
    public cartService: CartService,
    public avatarService: AvatarService,
    public uploadService: UploadService,
    public favoriteService: FavoriteService,
    private auth: AuthService,
    private router: Router,
    private orderService: OrderService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  /* =========================================================
   *  CYCLE DE VIE
   * ========================================================= */
  ngOnInit(): void {
    /* --- Panier --- */
    this.subs.push(
      this.cartService.items$.subscribe(() => {
        this.zone.run(() => this.cdr.detectChanges());
      })
    );

    /* --- Favoris --- */
    this.subs.push(
      this.favoriteService.favorites$.subscribe(() => {
        this.zone.run(() => {
          this.userStats.favorites = this.favoriteService.getCount();
          this.cdr.detectChanges();
        });
      })
    );

    if (isPlatformBrowser(this.platformId)) {
      this.loadUserFromStorage();
      this.restoreSidebarState();
    }

    /* --- Chargements initiaux --- */
    this.loadNotifications();
    this.loadConversations();

    this.listenToRouteChanges();

    /* --- Socket --- */
    this.orderService.connectSocket();

    this.ordersSub = this.orderService.orders$.subscribe(() => {
      this.loadNotifications();
    });

    /* --- 🔔 Accusés de lecture --- */
    this.subs.push(
      this.orderService.messagesRead$.subscribe((payload) => {
        this.zone.run(() => {
          for (const id of payload.messageIds) {
            this.readMessageIds.add(id);
          }
          this.messages = this.messages.map((m) =>
            payload.messageIds.includes(m._id) ? { ...m, read: true } : m
          );
          this.cdr.detectChanges();
        });
      })
    );

    /* --- ✅ Ouverture conversation depuis l'extérieur --- */
    this.subs.push(
      this.messageService.openConversation$.subscribe((recipient) => {
        this.zone.run(() => this.openMessagesWith(recipient));
      })
    );

    /* --- 🔄 Refresh périodique --- */
    this.refreshSub = interval(30000).subscribe(() => {
      this.loadNotifications();
      this.loadConversations();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subs.forEach((s) => s.unsubscribe());
    this.ordersSub?.unsubscribe();
    this.refreshSub?.unsubscribe();

    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  /* =========================================================
   *  PROFIL
   * ========================================================= */
  private loadUserFromStorage(): void {
    const user = this.auth.getUser();
    if (user) {
      this.userName = user.name || 'Client';
      this.userEmail = user.email || '';
      this.userAvatar = user.avatar || '';
      this.userStats.favorites = this.favoriteService.getCount();
    }
  }

  /* =========================================================
   *  NOTIFICATIONS
   * ========================================================= */
  loadNotifications(): void {
    this.orderService.getMyOrders().subscribe({
      next: (orders) => {
        this.zone.run(() => {
          const list = orders || [];
          this.userStats.orders = list.length;

          const ongoing = list.filter((o) =>
            ['pending', 'accepted', 'preparing', 'ready', 'delivering'].includes(o.status)
          );
          const toConfirm = list.filter((o) => o.status === 'delivered');

          this.notificationsCount = ongoing.length + toConfirm.length;
          this.notifications = [];

          if (ongoing.length > 0) {
            this.notifications.push({
              type: 'ongoing',
              icon: 'bi-bag-check',
              color: '#ff6b6b',
              title: `${ongoing.length} commande(s) en cours`,
              text: 'Suivez la livraison en direct',
              link: '/client/commandes',
              time: 'Maintenant',
            });
          }

          if (toConfirm.length > 0) {
            this.notifications.push({
              type: 'confirm',
              icon: 'bi-check-circle',
              color: '#4ecdc4',
              title: `${toConfirm.length} commande(s) à confirmer`,
              text: 'Confirmez avoir reçu + payé',
              link: '/client/commandes',
              time: 'Maintenant',
            });
          }

          this.cdr.detectChanges();
        });
      },
      error: (err) => console.warn('Erreur notifications client:', err),
    });
  }

  toggleNotifications(event?: MouseEvent): void {
    event?.stopPropagation();
    this.isNotificationsOpen = !this.isNotificationsOpen;
    this.isUserMenuOpen = false;
    this.isMessagesOpen = false;

    if (this.isNotificationsOpen) this.loadNotifications();
  }

  closeNotifications(): void {
    this.isNotificationsOpen = false;
  }

  goToNotification(notif: any): void {
    this.closeNotifications();
    if (notif.link) this.router.navigate([notif.link]);
  }

  /* =========================================================
   *  MESSAGERIE
   * ========================================================= */
  toggleMessages(event?: MouseEvent): void {
    event?.stopPropagation();
    this.isMessagesOpen = !this.isMessagesOpen;
    this.isUserMenuOpen = false;
    this.isNotificationsOpen = false;

    if (this.isMessagesOpen) {
      this.loadConversations();
    } else {
      this.closeConversation();
    }
  }

  closeMessages(): void {
    this.isMessagesOpen = false;
    this.closeConversation();
  }

  loadConversations(): void {
    this.messageService.getConversations().subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.conversations = data || [];
          this.messagesCount = this.conversations.reduce(
            (sum, c) => sum + (c.unreadCount || 0),
            0
          );
          this.cdr.detectChanges();
        });
      },
      error: (err) => console.warn('Erreur conversations client:', err),
    });
  }

  openConversation(conv: Conversation): void {
    this.openedConversation = conv;
    this.isLoadingMessages = true;

    this.messageService.getMessagesWith(conv.userId).subscribe({
      next: (msgs) => {
        this.zone.run(() => {
          this.messages = msgs || [];
          this.isLoadingMessages = false;
          conv.unreadCount = 0;
          this.recomputeUnread();
          this.cdr.detectChanges();

          setTimeout(() => this.scrollChatToBottom(), 100);
        });
      },
      error: () => {
        this.zone.run(() => {
          this.isLoadingMessages = false;
          this.cdr.detectChanges();
        });
      },
    });
  }

  closeConversation(): void {
    this.openedConversation = null;
    this.messages = [];
    this.newMessageText = '';
  }

  sendMessage(): void {
    if (
      !this.newMessageText.trim() ||
      !this.openedConversation ||
      this.isSendingMessage
    ) return;

    this.isSendingMessage = true;
    const content = this.newMessageText.trim();
    const recipientId = this.openedConversation.userId;

    /* --- Message optimiste --- */
    const tempId = `temp-${Date.now()}`;
    const tempMsg: any = {
      _id: tempId,
      senderId: this.auth.getUser()?._id,
      recipientId,
      content,
      read: false,
      _temp: true,
      createdAt: new Date().toISOString(),
    };
    this.messages.push(tempMsg);
    this.newMessageText = '';
    this.cdr.detectChanges();
    setTimeout(() => this.scrollChatToBottom(), 50);

    this.messageService.send(recipientId, content).subscribe({
      next: (msg) => {
        this.zone.run(() => {
          const idx = this.messages.findIndex((m) => m._id === tempId);
          if (idx !== -1) this.messages[idx] = msg;
          this.isSendingMessage = false;
          this.cdr.detectChanges();
          setTimeout(() => this.scrollChatToBottom(), 50);
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.messages = this.messages.filter((m) => m._id !== tempId);
          this.isSendingMessage = false;
          this.cdr.detectChanges();
          alert(err.error?.message || 'Erreur envoi');
        });
      },
    });
  }

  private scrollChatToBottom(): void {
    const body = document.querySelector('.chat-messages');
    if (body) body.scrollTop = body.scrollHeight;
  }

  private recomputeUnread(): void {
    this.messagesCount = this.conversations.reduce(
      (sum, c) => sum + (c.unreadCount || 0),
      0
    );
  }

  isMyMessage(msg: Message): boolean {
    const me = this.auth.getUser();
    if (!me) return false;
    const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
    return String(senderId) === String(me._id);
  }

  /* =========================================================
   *  COCHES DE LECTURE
   * ========================================================= */
  isRead(msg: any): boolean {
    if (!this.isMyMessage(msg)) return false;
    return msg.read === true || this.readMessageIds.has(msg._id);
  }

  isSendingMsg(msg: any): boolean {
    return msg._temp === true;
  }

  /* =========================================================
   *  AGRANDIR — Ouvrir le chat en plein écran
   * ========================================================= */
  expandChat(): void {
    if (!this.openedConversation) return;
    const id = this.openedConversation.userId;
    this.closeMessages();
    this.router.navigate(['/client/messages', id]);
  }

  /* =========================================================
   *  OUVRIR UNE CONVERSATION DEPUIS L'EXTÉRIEUR
   * ========================================================= */
  private openMessagesWith(recipient: {
    userId: string;
    name: string;
    avatar?: string;
    role: string;
    pendingMessage?: string;
  }): void {
    this.isMessagesOpen = true;
    this.isUserMenuOpen = false;
    this.isNotificationsOpen = false;

    this.loadConversations();

    setTimeout(() => {
      const existing = this.conversations.find(
        (c) => String(c.userId) === String(recipient.userId)
      );

      if (existing) {
        this.openConversation(existing);
      } else {
        const fake: Conversation = {
          userId: recipient.userId,
          name: recipient.name,
          avatar: recipient.avatar || '',
          role: recipient.role,
          lastMessage: '',
          lastMessageAt: new Date().toISOString(),
          unreadCount: 0,
        };
        this.openConversation(fake);
      }

      if (recipient.pendingMessage) {
        this.newMessageText = recipient.pendingMessage;
      }

      this.cdr.detectChanges();
    }, 400);
  }

  /* =========================================================
   *  NAVIGATION
   * ========================================================= */
  private listenToRouteChanges(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        this.updateBreadcrumb(event.urlAfterRedirects);
        this.closeAllMenus();

        if (isPlatformBrowser(this.platformId)) {
          this.loadUserFromStorage();
        }
      });
  }

  private updateBreadcrumb(url: string): void {
    const routes: Record<string, string> = {
      '/client/dashboard':   'Tableau de bord',
      '/client/restaurants': 'Restaurants',
      '/client/commandes':   'Mes commandes',
      '/client/favoris':     'Favoris',
      '/client/promotions':  'Promotions',
      '/client/profil':      'Mon profil',
      '/client/parametres':  'Paramètres',
      '/client/amis':        'Amis',
    };

    const cleanUrl = url.split('?')[0].split('#')[0];

    // Cas spéciaux : /client/messages/:id → "Messages"
    if (cleanUrl.startsWith('/client/messages')) {
      this.currentPage = 'Messages';
      return;
    }

    this.currentPage = routes[cleanUrl] ?? 'Tableau de bord';
  }

  /* =========================================================
   *  SIDEBAR
   * ========================================================= */
  private restoreSidebarState(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (window.innerWidth <= this.MOBILE_BREAKPOINT) {
      this.isSidebarCollapsed = true;
      return;
    }

    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      this.isSidebarCollapsed = saved === 'true';
    }
  }

  onSidebarToggle(collapsed: boolean): void {
    this.isSidebarCollapsed = collapsed;
    this.persistSidebarState();
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    this.persistSidebarState();
  }

  private persistSidebarState(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('sidebarCollapsed', String(this.isSidebarCollapsed));
    }
  }

  /* =========================================================
   *  MENU UTILISATEUR
   * ========================================================= */
  toggleUserMenu(event?: MouseEvent): void {
    event?.stopPropagation();
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.isNotificationsOpen = false;
    this.isMessagesOpen = false;
    this.toggleBodyScroll(this.isUserMenuOpen);
  }

  closeUserMenu(): void {
    if (!this.isUserMenuOpen) return;
    this.isUserMenuOpen = false;
    this.toggleBodyScroll(false);
  }

  /* =========================================================
   *  PANIER
   * ========================================================= */
  goToCart(): void {
    this.router.navigate(['/client/panier']);
  }

  /* =========================================================
   *  HELPERS
   * ========================================================= */
  private closeAllMenus(): void {
    this.isUserMenuOpen = false;
    this.isNotificationsOpen = false;
    this.isMessagesOpen = false;
    this.toggleBodyScroll(false);
  }

  private toggleBodyScroll(lock: boolean): void {
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = lock ? 'hidden' : '';
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (this.isUserMenuOpen) {
      const inMenu = target.closest('.user-menu-dropdown');
      const onProfile = target.closest('.user-profile');
      if (!inMenu && !onProfile) this.closeUserMenu();
    }

    if (this.isNotificationsOpen) {
      const inPanel = target.closest('.notifications-panel');
      const onBtn = target.closest('.notifications');
      if (!inPanel && !onBtn) this.closeNotifications();
    }

    if (this.isMessagesOpen) {
      const inPanel = target.closest('.messages-panel');
      const onBtn = target.closest('.messages');
      if (!inPanel && !onBtn) this.closeMessages();
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (window.innerWidth <= this.MOBILE_BREAKPOINT) {
      this.isSidebarCollapsed = true;
    }
  }

  /* =========================================================
   *  RECHERCHE
   * ========================================================= */
  onSearch(event: Event): void {
    console.log('Recherche:', (event.target as HTMLInputElement).value);
  }

  /* =========================================================
   *  DÉCONNEXION
   * ========================================================= */
  logout(): void {
    if (!confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) return;

    this.auth.logout();

    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('sidebarCollapsed');
    }

    this.closeAllMenus();
    this.router.navigate(['/connexion']);
  }

  /* =========================================================
   *  HELPERS TEMPLATE
   * ========================================================= */
  getUserInitials(): string {
    return this.avatarService.getInitials(this.userName);
  }

  getUserGradient(): string {
    return this.avatarService.getGradient(this.userName);
  }

  hasAvatar(): boolean {
    return this.avatarService.hasImage(this.userAvatar);
  }

  getAvatarUrl(): string {
    return this.uploadService.getImageUrl(this.userAvatar);
  }
}