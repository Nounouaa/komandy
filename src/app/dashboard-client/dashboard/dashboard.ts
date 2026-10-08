import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { OrderService } from '../../core/services/order.service';

import { AvatarService } from '../../core/services/avatar';
import { UploadService } from '../../core/services/upload';
import { PromotionService } from '../../core/services/promotion.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {

  // =========================================================
  // DONNÉES
  // =========================================================
  user: any = null;
  restaurants: any[] = [];
  filteredRestaurants: any[] = [];
  ongoingOrders: any[] = [];

  // =========================================================
  // FILTRES
  // =========================================================
  searchQuery = '';
  activeCategory = 'all';

  // =========================================================
  // ÉTAT
  // =========================================================
  isLoadingRestaurants = true;
  isLoadingOrders = true;

  // =========================================================
  // CATÉGORIES
  // =========================================================
  categories = [
    { value: 'all',       label: 'Tout',       icon: 'bi-grid' },
    { value: 'fast-food', label: 'Fast Food',  icon: 'bi-bag' },
    { value: 'italienne', label: 'Italienne',  icon: 'bi-egg-fried' },
    { value: 'japonaise', label: 'Japonaise',  icon: 'bi-egg' },
    { value: 'malgache',  label: 'Malgache',   icon: 'bi-globe' },
    { value: 'francaise', label: 'Française',  icon: 'bi-cup-hot' },
  ];

  private ordersSub?: Subscription;

  constructor(
    private auth: AuthService,
    private restaurantService: RestaurantService,
    private orderService: OrderService,
    public uploadService: UploadService,
    public avatarService: AvatarService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
     private promoService: PromotionService,  
  ) {}

  // =========================================================
  // CYCLE DE VIE
  // =========================================================



  private promoMap = new Map<string, {
  count: number;
  bestDiscount: number;
  color: string;
}>();

ngOnInit(): void {
  this.user = this.auth.getUser();
  this.loadRestaurants();
  this.loadOngoingOrders();
  this.loadPromotions();          // ← ajout

  this.orderService.connectSocket();

  this.ordersSub = this.orderService.orders$.subscribe((live) => {
    if (!live.length) return;
    this.zone.run(() => {
      this.ongoingOrders = live.filter((o) =>
        ['pending', 'accepted', 'preparing', 'ready', 'delivering'].includes(o.status)
      );
      this.cdr.detectChanges();
    });
  });
}



/* =========================================================
 *  PROMOTIONS
 * ========================================================= */

private loadPromotions(): void {
  this.promoService.getActiveRestaurants().subscribe({
    next: (res: any) => {
      this.zone.run(() => {
        this.promoMap.clear();

        const list = Array.isArray(res) ? res : [];

        for (const item of list) {
          if (!item?.restaurantId) continue;

          const rid = typeof item.restaurantId === 'object'
            ? item.restaurantId._id
            : item.restaurantId;

          this.promoMap.set(rid, {
            count:        item.count        ?? 0,
            bestDiscount: item.bestDiscount ?? 0,
            color:        item.color        || '#ff6b6b',
          });
        }

        this.cdr.detectChanges();
      });
    },
    error: () => {
      this.promoMap.clear();
    },
  });
}

/** Vrai si le restaurant a au moins une promo active. */
hasPromos(restaurantId: string): boolean {
  return (this.promoMap.get(restaurantId)?.count ?? 0) > 0;
}

/** Nombre de promos actives pour un restaurant. */
countPromosForRestaurant(restaurantId: string): number {
  return this.promoMap.get(restaurantId)?.count ?? 0;
}

/** Meilleure remise en % (0 s'il n'y a que des fixed). */
getBestDiscount(restaurantId: string): number {
  return this.promoMap.get(restaurantId)?.bestDiscount ?? 0;
}

/** Couleur du badge promo. */
getPromoColor(restaurantId: string): string {
  return this.promoMap.get(restaurantId)?.color ?? '#ff6b6b';
}
  ngOnDestroy(): void {
    this.ordersSub?.unsubscribe();
    this.orderService.disconnectSocket();
  }

  // =========================================================
  // CHARGEMENT
  // =========================================================
  loadRestaurants(): void {
    this.restaurantService.getAll().subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.restaurants = data || [];
          this.applyFilter();
          this.isLoadingRestaurants = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.isLoadingRestaurants = false;
          this.cdr.detectChanges();
        });
      },
    });
  }

  loadOngoingOrders(): void {
    this.orderService.getMyOrders().subscribe({
      next: (orders) => {
        this.zone.run(() => {
          this.ongoingOrders = (orders || []).filter((o) =>
            ['pending', 'accepted', 'preparing', 'ready', 'delivering'].includes(o.status)
          );
          this.isLoadingOrders = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.isLoadingOrders = false;
          this.cdr.detectChanges();
        });
      },
    });
  }

  // =========================================================
  // FILTRES
  // =========================================================
  setCategory(value: string): void {
    this.activeCategory = value;
    this.applyFilter();
  }

  onSearch(): void {
    this.applyFilter();
  }

  private applyFilter(): void {
    let list = [...this.restaurants];

    const normalize = (s: string | undefined): string =>
      (s || '').toLowerCase().trim().replace(/\s+/g, '-');

    if (this.activeCategory !== 'all') {
      list = list.filter((r) => normalize(r.type) === this.activeCategory);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.type?.toLowerCase().includes(q) ||
          r.city?.toLowerCase().includes(q)
      );
    }

    this.filteredRestaurants = list;
  }

  // =========================================================
  // HELPERS PROFIL
  // =========================================================
  getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }

  getUserInitials(): string {
    return this.avatarService.getInitials(this.user?.name || '');
  }

  getUserGradient(): string {
    return this.avatarService.getGradient(this.user?.name || '');
  }

  hasUserAvatar(): boolean {
    return this.avatarService.hasImage(this.user?.avatar);
  }

  getUserAvatarUrl(): string {
    return this.uploadService.getImageUrl(this.user?.avatar);
  }

  // =========================================================
  // HELPERS RESTAURANT (images)
  // =========================================================
  getRestaurantName(order: any): string {
    return order.restaurantId?.name || 'Restaurant';
  }

  hasCover(restaurant: any): boolean {
    return this.uploadService.hasImage(restaurant?.coverImage);
  }

  getCoverUrl(restaurant: any): string {
    return this.uploadService.getImageUrl(restaurant?.coverImage);
  }

  hasLogo(restaurant: any): boolean {
    return this.uploadService.hasImage(restaurant?.logo);
  }

  getLogoUrl(restaurant: any): string {
    return this.uploadService.getImageUrl(restaurant?.logo);
  }

  getRestaurantInitials(restaurant: any): string {
    return this.avatarService.getInitials(restaurant?.name || '');
  }

  getRestaurantGradient(restaurant: any): string {
    return this.avatarService.getGradient(restaurant?.name || '');
  }

  // =========================================================
  // HELPERS STATUTS
  // =========================================================
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'En attente',
      accepted: 'Acceptée',
      preparing: 'En préparation',
      ready: 'Prête',
      delivering: 'En livraison',
    };
    return labels[status] || status;
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      pending: 'bi-hourglass',
      accepted: 'bi-check-circle',
      preparing: 'bi-fire',
      ready: 'bi-bag-check',
      delivering: 'bi-truck',
    };
    return icons[status] || 'bi-clock';
  }
}