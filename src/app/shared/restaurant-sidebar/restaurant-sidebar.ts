import {
  Component,
  OnInit,
  OnDestroy,
  EventEmitter,
  Output,
  ChangeDetectorRef,
  NgZone,
  Inject,
  PLATFORM_ID,
  HostBinding,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { Subscription, interval } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { OrderService } from '../../core/services/order.service';

import { AvatarService } from '../../core/services/avatar';
import { UploadService } from '../../core/services/upload';

@Component({
  selector: 'app-restaurant-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './restaurant-sidebar.html',
  styleUrl: './restaurant-sidebar.css',
})
export class RestaurantSidebar implements OnInit, OnDestroy {

  @Output() toggle = new EventEmitter<boolean>();

  isCollapsed = false;

  // =========================================================
  // PROFIL RESTAURANT (dynamique)
  // =========================================================
  restaurantName = '';
  restaurantAvatar = '';
  isOpen = false;

  // =========================================================
  // COMPTEURS (depuis le backend)
  // =========================================================
  stats = {
    products: 0,
    orders: 0,
    pendingOrders: 0,
    promotions: 0,
    clients: 0,
  };

  private readonly STORAGE_KEY = 'restaurantSidebarCollapsed';
  private readonly MOBILE_BREAKPOINT = 992;

  private ordersSub?: Subscription;
  private refreshSub?: Subscription;
isMobile = false;
  constructor(
    private router: Router,
    private auth: AuthService,
    private restaurantService: RestaurantService,
    private orderService: OrderService,
    public uploadService: UploadService,
    public avatarService: AvatarService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // =========================================================
  // HOST BINDING (classe .collapsed sur <app-restaurant-sidebar>)
  // =========================================================
  @HostBinding('class.collapsed')
  get hostCollapsed(): boolean {
    return this.isCollapsed;
  }

  // =========================================================
  // CYCLE DE VIE
  // =========================================================
  ngOnInit(): void {
  // Détection mobile + écoute du resize
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

  // Charger le profil restaurant
  this.loadRestaurantProfile();

  // Charger les stats
  this.loadStats();

  // Temps réel
  this.ordersSub = this.orderService.orders$.subscribe(() => {
    this.loadStats();
  });

  // Refresh toutes les 30s
  this.refreshSub = interval(30000).subscribe(() => this.loadStats());
}



/** Détecte si on est en mobile */
private checkScreenSize(): void {
  if (isPlatformBrowser(this.platformId)) {
    this.isMobile = window.innerWidth < this.MOBILE_BREAKPOINT;
  }
}

/** Handler resize (stocké pour pouvoir le supprimer) */
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

  // Passage mobile → desktop : on rouvre si sauvegardé
  if (wasMobile && !this.isMobile) {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    this.zone.run(() => {
      this.isCollapsed = saved === 'true';
      this.cdr.detectChanges();
    });
  }
};

/** Ferme le menu mobile (appelé par l'overlay) */
closeMobileMenu(): void {
  if (this.isMobile) {
    this.isCollapsed = true;
  }
}

/** Ferme automatiquement le menu après un clic sur un lien (mobile) */
onNavClick(): void {
  if (this.isMobile) {
    this.isCollapsed = true;
  }
}

  ngOnDestroy(): void {
  this.ordersSub?.unsubscribe();
  this.refreshSub?.unsubscribe();

  if (isPlatformBrowser(this.platformId)) {
    window.removeEventListener('resize', this.onResize);
  }
}

  // =========================================================
  // CHARGEMENT PROFIL (nom + logo + ouvert/fermé)
  // =========================================================
  private loadRestaurantProfile(): void {
    this.restaurantService.getMyProfile().subscribe({
      next: (r) => {
        this.zone.run(() => {
          this.restaurantName = r.name || 'Mon restaurant';
          this.restaurantAvatar = r.logo || '';
          this.isOpen = r.isOpen !== false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.warn('Erreur profil sidebar:', err);
      },
    });
  }

  // =========================================================
  // CHARGEMENT DES STATS (badges)
  // =========================================================
  loadStats(): void {
    this.restaurantService.getMyStats().subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.stats = {
            products: data.products || 0,
            orders: data.orders || 0,
            pendingOrders: data.pendingOrders || 0,
            promotions: data.promotions || 0,
            clients: data.clients || 0,
          };
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.warn('Impossible de charger les stats:', err);
      },
    });
  }

  // =========================================================
  // TOGGLE SIDEBAR
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
    if (!confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) return;

    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.STORAGE_KEY);
    }

    this.auth.logout();
    this.router.navigate(['/connexion']);
  }

  // =========================================================
  // HELPERS TEMPLATE (Avatar)
  // =========================================================
  hasLogo(): boolean {
    return this.uploadService.hasImage(this.restaurantAvatar);
  }

  getLogoUrl(): string {
    return this.uploadService.getImageUrl(this.restaurantAvatar);
  }

  getInitials(): string {
    return this.avatarService.getInitials(this.restaurantName);
  }

  getGradient(): string {
    return this.avatarService.getGradient(this.restaurantName);
  }
}