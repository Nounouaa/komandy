import {
  Component,
  HostListener,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ChangeDetectorRef,
  NgZone,
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

import { AuthService } from '../../core/services/auth.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { OrderService } from '../../core/services/order.service';
import { AvatarService } from '../../core/services/avatar';
import { UploadService } from '../../core/services/upload';
import {
  MessageService,
  Conversation,
  Message,
} from '../../core/services/message.service';
import { RestaurantSidebar } from '../../shared/restaurant-sidebar/restaurant-sidebar';

@Component({
  selector: 'app-restaurant-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RestaurantSidebar, RouterOutlet, RouterLink],
  templateUrl: './restaurant-layout.html',
  styleUrl: './restaurant-layout.css',
})
export class RestaurantLayout implements OnInit, OnDestroy {

  // =========================================================
  // ÉTAT UI
  // =========================================================
  isSidebarCollapsed = false;
  isUserMenuOpen = false;
  isNotificationsOpen = false;
  isMessagesOpen = false;
  currentPage = 'Tableau de bord';

  // =========================================================
  // COMPTEURS
  // =========================================================
  notificationsCount = 0;
  messagesCount = 0;

  // =========================================================
  // PROFIL RESTAURANT
  // =========================================================
  restaurantName = '';
  restaurantEmail = '';
  restaurantRole = 'Restaurant';
  restaurantAvatar = '';
  restaurantStats = {
    rating: 0,
    totalReviews: 0,
    totalOrders: 0,
    growth: '+0%',
  };

  // =========================================================
  // NOTIFICATIONS
  // =========================================================
  notifications: any[] = [];

  // =========================================================
  // MESSAGERIE
  // =========================================================
  conversations: Conversation[] = [];
  openedConversation: Conversation | null = null;
  messages: Message[] = [];
  newMessageText = '';
  isSendingMessage = false;
  isLoadingMessages = false;

  // =========================================================
  // PRIVÉ
  // =========================================================
  private destroy$ = new Subject<void>();
  private ordersSub?: Subscription;
  private refreshSub?: Subscription;
  private storageListener?: () => void;
  private readonly MOBILE_BREAKPOINT = 991.98;

  constructor(
    private router: Router,
    private auth: AuthService,
    private restaurantService: RestaurantService,
    private orderService: OrderService,
    private messageService: MessageService,
    public avatarService: AvatarService,
    public uploadService: UploadService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  // =========================================================
  // CYCLE DE VIE
  // =========================================================
  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.restoreSidebarState();

      // ✅ Recharger le profil si avatar modifié ailleurs
      this.storageListener = () => {
        this.zone.run(() => this.loadProfile());
      };
      window.addEventListener('storage', this.storageListener);
    }

    // Charge tout au démarrage
    this.loadProfile();
    this.loadNotifications();
    this.loadConversations();
    this.loadCounters();
    this.listenToRouteChanges();

    // 🔌 Recharger les compteurs sur nouvelle commande
    this.ordersSub = this.orderService.orders$.subscribe(() => {
      this.loadCounters();
      this.loadNotifications();
    });

    // 🔄 Rafraîchir toutes les 30 secondes
    this.refreshSub = interval(30000).subscribe(() => {
      this.loadCounters();
      this.loadNotifications();
      this.loadConversations();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.ordersSub?.unsubscribe();
    this.refreshSub?.unsubscribe();

    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';

      if (this.storageListener) {
        window.removeEventListener('storage', this.storageListener);
      }
    }
  }

  // =========================================================
  // PROFIL
  // =========================================================
  private loadProfile(): void {
    this.restaurantService.getMyProfile().subscribe({
      next: (r) => {
        this.zone.run(() => {
          this.restaurantName = r.name || 'Mon restaurant';
          this.restaurantAvatar = r.logo || '';
          this.restaurantEmail = this.auth.getUser()?.email || '';
          this.restaurantRole = r.type || 'Restaurant';
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.warn('Profil restaurant indisponible:', err);
      },
    });
  }

  // =========================================================
  // COMPTEURS (sidebar, badge)
  // =========================================================
  private loadCounters(): void {
    this.restaurantService.getMyDashboard().subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.restaurantStats.totalOrders = data.month?.orders || 0;

          const today = data.today?.revenue || 0;
          const month = data.month?.revenue || 0;
          if (today > 0 && month > 0) {
            const pct = Math.round(((today * 30) / month) * 100 - 100);
            this.restaurantStats.growth = (pct >= 0 ? '+' : '') + pct + '%';
          }

          if (data.restaurant) {
            this.restaurantStats.rating = data.restaurant.rating || 0;
            this.restaurantStats.totalReviews = data.restaurant.totalReviews || 0;
          }

          this.cdr.detectChanges();
        });
      },
      error: () => {},
    });
  }

  // =========================================================
  // NAVIGATION
  // =========================================================
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
          this.loadProfile();
        }
      });
  }

  private updateBreadcrumb(url: string): void {
    const routes: Record<string, string> = {
      '/restaurant/dashboard':    'Tableau de bord',
      '/restaurant/produits':     'Mes produits',
      '/restaurant/commandes':    'Commandes',
      '/restaurant/promotions':   'Promotions',
      '/restaurant/clients':      'Clients',
      '/restaurant/statistiques': 'Statistiques',
      '/restaurant/profil':       'Mon profil',
    };

    const cleanUrl = url.split('?')[0].split('#')[0];
    this.currentPage = routes[cleanUrl] ?? 'Tableau de bord';
  }

  // =========================================================
  // SIDEBAR
  // =========================================================
  private restoreSidebarState(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (window.innerWidth <= this.MOBILE_BREAKPOINT) {
      this.isSidebarCollapsed = true;
      return;
    }

    const saved = localStorage.getItem('restaurantSidebarCollapsed');
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
      localStorage.setItem(
        'restaurantSidebarCollapsed',
        String(this.isSidebarCollapsed)
      );
    }
  }

  // =========================================================
  // MENU UTILISATEUR
  // =========================================================
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

  // =========================================================
  // NOTIFICATIONS
  // =========================================================
  toggleNotifications(event?: MouseEvent): void {
    event?.stopPropagation();
    this.isNotificationsOpen = !this.isNotificationsOpen;
    this.isUserMenuOpen = false;
    this.isMessagesOpen = false;

    if (this.isNotificationsOpen) {
      this.loadNotifications();
    }
  }

  closeNotifications(): void {
    this.isNotificationsOpen = false;
  }

  loadNotifications(): void {
    this.restaurantService.getMyNotifications().subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.notificationsCount = data.notificationsCount || 0;
          this.notifications = [];

          if (data.pendingOrders > 0) {
            this.notifications.push({
              type: 'order',
              icon: 'bi-bag-check',
              color: '#ff6b6b',
              title: `${data.pendingOrders} commande(s) en attente`,
              text: 'Cliquez pour les traiter',
              link: '/restaurant/commandes',
              time: 'Maintenant',
            });
          }

          if (data.openDisputes > 0) {
            this.notifications.push({
              type: 'dispute',
              icon: 'bi-exclamation-triangle-fill',
              color: '#ffd93d',
              title: `${data.openDisputes} litige(s) en cours`,
              text: 'Un client signale un problème',
              link: '/restaurant/commandes',
              time: 'Maintenant',
            });
          }

          this.cdr.detectChanges();
        });
      },
      error: () => {},
    });
  }

  goToNotification(notif: any): void {
    this.closeNotifications();
    if (notif.link) this.router.navigate([notif.link]);
  }

  // =========================================================
  // MESSAGERIE
  // =========================================================
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
      error: (err) => console.warn('Erreur conversations:', err),
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

    this.messageService.send(this.openedConversation.userId, content).subscribe({
      next: (msg) => {
        this.zone.run(() => {
          this.messages.push(msg);
          this.newMessageText = '';
          this.isSendingMessage = false;
          this.cdr.detectChanges();

          setTimeout(() => this.scrollChatToBottom(), 50);
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.isSendingMessage = false;
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

  // =========================================================
  // HELPERS GÉNÉRAUX
  // =========================================================
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

  // =========================================================
  // DIVERS
  // =========================================================
  onSearch(event: Event): void {
    console.log('Recherche:', (event.target as HTMLInputElement).value);
  }

  logout(): void {
    if (!confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) return;

    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('restaurantSidebarCollapsed');
    }

    this.auth.logout();
    this.closeAllMenus();
    this.router.navigate(['/connexion']);
  }

  // =========================================================
  // HELPERS TEMPLATE
  // =========================================================
  getUserInitials(): string {
    return this.avatarService.getInitials(this.restaurantName);
  }

  getUserGradient(): string {
    return this.avatarService.getGradient(this.restaurantName);
  }

  hasAvatar(): boolean {
    return this.avatarService.hasImage(this.restaurantAvatar);
  }

  getAvatarUrl(): string {
    return this.uploadService.getImageUrl(this.restaurantAvatar);
  }
}