import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { PromotionService } from '../core/services/promotion.service';
import { RestaurantService } from '../core/services/restaurant.service';
import { FavoriteService } from '../core/services/favorite.service';

@Component({
  selector: 'app-promotions',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './promotions.html',
  styleUrl: './promotions.css',
})
export class Promotions implements OnInit {
  promotions: any[] = [];
  filteredPromotions: any[] = [];
  restaurants: any[] = [];

  isLoading = true;
  copiedCode: string | null = null;
  activeFilter: 'all' | 'percent' | 'fixed' | 'free-delivery' = 'all';

  constructor(
    private promotionService: PromotionService,
    private restaurantService: RestaurantService,
    public favoriteService: FavoriteService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadPromotions();
    this.loadRestaurants();
  }

  // =========================================================
  // CHARGEMENT
  // =========================================================
  loadPromotions(): void {
    this.promotionService.getAll().subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.promotions = (data || []).map((p) => ({
            ...p,
            restaurantName: p.restaurantId?.name || 'Restaurant',
            restaurantCover: p.restaurantId?.coverImage || '',
            restaurantType: p.restaurantId?.type || '',
          }));
          this.filteredPromotions = [...this.promotions];
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Erreur chargement promos:', err);
        this.zone.run(() => {
          this.promotions = [];
          this.filteredPromotions = [];
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
    });
  }

  loadRestaurants(): void {
    this.restaurantService.getAll().subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.restaurants = (data || []).slice(0, 4);
          this.cdr.detectChanges();
        });
      },
      error: () => {},
    });
  }

  // =========================================================
  // FILTRES
  // =========================================================
  setFilter(f: typeof this.activeFilter): void {
    this.activeFilter = f;

    if (f === 'all') {
      this.filteredPromotions = [...this.promotions];
    } else {
      this.filteredPromotions = this.promotions.filter((p) => p.type === f);
    }
  }

  hasAnyPromotion(): boolean {
    return this.promotions.length > 0;
  }

  // =========================================================
  // COPIER LE CODE
  // =========================================================
  copyCode(code: string, event: Event): void {
    event.stopPropagation();

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        this.zone.run(() => {
          this.copiedCode = code;
          this.cdr.detectChanges();

          setTimeout(() => {
            this.copiedCode = null;
            this.cdr.detectChanges();
          }, 2000);
        });
      });
    }
  }

  // =========================================================
  // ACTIONS
  // =========================================================
  usePromotion(promo: any): void {
    const restaurantId = promo.restaurantId?._id || promo.restaurantId;
    if (restaurantId) {
      this.router.navigate(['/client/restaurants', restaurantId]);
    } else {
      this.router.navigate(['/client/restaurants']);
    }
  }

  goToRestaurant(restaurant: any): void {
    this.router.navigate(['/client/restaurants', restaurant._id]);
  }

  isFavorite(restaurantId: string): boolean {
    return this.favoriteService.isFavorite(restaurantId);
  }

  toggleFavorite(restaurant: any, event: Event): void {
    event.stopPropagation();
    this.favoriteService.toggle(restaurant);
  }

  // =========================================================
  // HELPERS
  // =========================================================
  getDaysLeft(expiresAt: string): number {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  getDiscountLabel(promo: any): string {
    if (promo.type === 'percent') return `-${promo.discount}%`;
    if (promo.type === 'fixed') return `-${promo.discount} Ar`;
    return 'Livraison offerte';
  }
}