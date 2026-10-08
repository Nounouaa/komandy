import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostBinding,
  Inject,
  Input,
  OnInit,
  OnDestroy,
  Output,
  PLATFORM_ID,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { AvatarService } from '../../core/services/avatar';
import { UploadService } from '../../core/services/upload';
import { FavoriteService } from '../../core/services/favorite.service';
import { OrderService } from '../../core/services/order.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { PromotionService } from '../../core/services/promotion.service';

@Component({
  selector: 'app-client-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './client-sidebar.html',
  styleUrl: './client-sidebar.css',
})
export class ClientSidebar implements OnInit, OnDestroy {

  // =========================================================
  // ÉVÉNEMENTS VERS LE PARENT
  // =========================================================
  @Output() toggle = new EventEmitter<boolean>();
  @Output() logout = new EventEmitter<void>();

  // =========================================================
  // ÉTAT INTERNE
  // =========================================================
  isCollapsed = false;
  isMobile = false;

  // Profil client (dynamique)
  userName = '';
  userEmail = '';
  userAvatar = '';

  // Compteurs (dynamiques)
  ordersCount = 0;
  favoritesCount = 0;
  restaurantsCount = 0;
  promotionsCount = 0;

  private readonly STORAGE_KEY = 'sidebarCollapsed';
  private readonly MOBILE_BREAKPOINT = 992;

  private subs: Subscription[] = [];

  constructor(
    private router: Router,
    private auth: AuthService,
    public avatarService: AvatarService,
    public uploadService: UploadService,
    public favoriteService: FavoriteService,
    private orderService: OrderService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
     private restaurantService: RestaurantService,   // ← ajout
  private promoService: PromotionService, 
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // =========================================================
  // INPUT : état reçu du parent
  // =========================================================
  @Input()
  set collapsed(value: boolean) {
    this.isCollapsed = value;
  }
  get collapsed(): boolean {
    return this.isCollapsed;
  }

  // =========================================================
  // HOST BINDING
  // =========================================================
  @HostBinding('class.collapsed')
  get hostCollapsed(): boolean {
    return this.isCollapsed;
  }

  // =========================================================
  // CYCLE DE VIE
  // =========================================================
  ngOnInit(): void {
    // Charger le profil
    this.loadProfile();
    // Charger les compteurs
this.loadRestaurantsCount();
this.loadPromotionsCount();
    // Charger les favoris
    this.loadFavorites();
    this.subs.push(
      this.favoriteService.favorites$.subscribe(() => {
        this.zone.run(() => {
          this.favoritesCount = this.favoriteService.getCount();
          this.cdr.detectChanges();
        });
      })
    );

    // Charger les commandes
    this.loadOrders();
    this.subs.push(
      this.orderService.orders$.subscribe(() => {
        this.zone.run(() => {
          this.loadOrders();
        });
      })
    );

    // Restaurer l'état sidebar
    // Restaurer l'état sidebar
// Restaurer l'état sidebar (avec détection mobile)
if (isPlatformBrowser(this.platformId)) {
  this.checkScreenSize();
  window.addEventListener('resize', this.onResize);

  if (this.isMobile) {
    // Sur mobile : la sidebar démarre TOUJOURS cachée
    this.isCollapsed = true;
  } else {
    // Sur desktop : on restaure le state sauvegardé
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved !== null) {
      this.isCollapsed = saved === 'true';
    }
  }
}
  }

ngOnDestroy(): void {
  this.subs.forEach((s) => s.unsubscribe());

  if (isPlatformBrowser(this.platformId)) {
    window.removeEventListener('resize', this.onResize);
  }
}
  // =========================================================
  // PROFIL (depuis AuthService)
  // =========================================================
  private loadProfile(): void {
    const user = this.auth.getUser();
    if (user) {
      this.userName = user.name || 'Client';
      this.userEmail = user.email || '';
      this.userAvatar = user.avatar || '';
      this.cdr.detectChanges();
    }
  }

  // =========================================================
  // FAVORIS
  // =========================================================
  private loadFavorites(): void {
    this.favoritesCount = this.favoriteService.getCount();
  }

  // =========================================================
  // COMMANDES
  // =========================================================
  private loadOrders(): void {
    this.orderService.getMyOrders().subscribe({
      next: (orders) => {
        this.zone.run(() => {
          // Commandes en cours (pending, accepted, preparing, ready, delivering)
          this.ordersCount = (orders || []).filter((o) =>
            ['pending', 'accepted', 'preparing', 'ready', 'delivering'].includes(o.status)
          ).length;
          this.cdr.detectChanges();
        });
      },
      error: () => {},
    });
  }

  // =========================================================
  // HELPERS AVATAR
  // =========================================================
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


  /* =========================================================
 *  COMPTEURS
 * ========================================================= */

/** Nombre total de restaurants disponibles. */
private loadRestaurantsCount(): void {
  this.restaurantService.getAll().subscribe({
    next: (res) => {
      this.zone.run(() => {
        this.restaurantsCount = Array.isArray(res) ? res.length : 0;
        this.cdr.detectChanges();
      });
    },
    error: () => {
      this.restaurantsCount = 0;
    },
  });
}

/** Nombre total de promotions actives. */
private loadPromotionsCount(): void {
  this.promoService.getAll().subscribe({
    next: (res: any) => {
      this.zone.run(() => {
        const list = Array.isArray(res)
          ? res
          : res?.promotions ?? res?.data ?? [];
        this.promotionsCount = list.length;
        this.cdr.detectChanges();
      });
    },
    error: () => {
      this.promotionsCount = 0;
    },
  });
}

  // =========================================================
  // TOGGLE
  // =========================================================
  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.STORAGE_KEY, String(this.isCollapsed));
    }

    this.toggle.emit(this.isCollapsed);
  }

  // =========================================================
  // DÉCONNEXION
  // =========================================================
  onLogout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    this.logout.emit();
  }


  /* =========================================================
 *  MOBILE — Détection & gestion
 * ========================================================= */

/** Détecte si on est en mobile. */
private checkScreenSize(): void {
  if (isPlatformBrowser(this.platformId)) {
    this.isMobile = window.innerWidth < this.MOBILE_BREAKPOINT;
  }
}

/** Handler resize (stocké pour pouvoir le supprimer). */
private onResize = (): void => {
  const wasMobile = this.isMobile;
  this.checkScreenSize();

  // Passage desktop → mobile : on ferme
  if (!wasMobile && this.isMobile) {
    this.zone.run(() => {
      this.isCollapsed = true;
      this.cdr.detectChanges();
    });
  }

  // Passage mobile → desktop : on rouvre selon le state sauvegardé
  if (wasMobile && !this.isMobile) {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      this.zone.run(() => {
        this.isCollapsed = saved === 'true';
        this.cdr.detectChanges();
      });
    }
  }
};

/** Ferme le menu mobile (appelé par l'overlay). */
closeMobileMenu(): void {
  if (this.isMobile) {
    this.isCollapsed = true;
  }
}

/** Ferme automatiquement le menu après un clic sur un lien (mobile). */
onNavClick(): void {
  if (this.isMobile) {
    this.isCollapsed = true;
  }
}
}