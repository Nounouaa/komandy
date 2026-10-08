import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { RestaurantService } from '../core/services/restaurant.service';
import { PromotionService } from '../core/services/promotion.service';
import { AvatarService } from '../core/services/avatar';
import { UploadService } from '../core/services/upload';

type PromoSummary = {
  count: number;
  bestDiscount: number;
  color: string;
};

@Component({
  selector: 'app-restaurants',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './restaurants.html',
  styleUrl: './restaurants.css',
})
export class Restaurants implements OnInit {

  /* =========================================================
   *  ÉTAT
   * ========================================================= */
  restaurants: any[] = [];
  filtered: any[] = [];
  isLoading = true;
  searchQuery = '';
  activeFilter: 'all' | 'open' | 'rating' | 'fast' | 'promo' = 'all';

  /**
   * Map restaurantId → résumé promo
   * Alimentée par `PromotionService.getActiveRestaurants()`.
   */
  private promoMap = new Map<string, PromoSummary>();

  constructor(
    private restaurantService: RestaurantService,
    private promoService: PromotionService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    public uploadService: UploadService,
    public avatarService: AvatarService
  ) {}

  ngOnInit(): void {
    this.loadRestaurants();
    this.loadPromotions();
  }

  /* =========================================================
   *  CHARGEMENT DES RESTAURANTS
   * ========================================================= */
  loadRestaurants(): void {
    this.restaurantService.getAll().subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.restaurants = data ?? [];
          this.applyFilter();
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
   *  CHARGEMENT DES PROMOS AGRÉGÉES
   * ========================================================= */

  /**
   * Récupère un résumé par restaurant via le service :
   *   [{ restaurantId, count, bestDiscount, color }, ...]
   */
  private loadPromotions(): void {
    this.promoService.getActiveRestaurants().subscribe({
      next: (res) => {
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

          // Rafraîchit la liste pour afficher les badges immédiatement
          this.applyFilter();
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.promoMap.clear();
      },
    });
  }

  /* =========================================================
   *  FILTRES
   * ========================================================= */
  setFilter(f: typeof this.activeFilter): void {
    this.activeFilter = f;
    this.applyFilter();
  }

  onSearch(): void {
    this.applyFilter();
  }

  private applyFilter(): void {
    let list = [...this.restaurants];

    if (this.activeFilter === 'open') {
      list = list.filter((r) => r.isOpen);
    } else if (this.activeFilter === 'rating') {
      list = list.filter((r) => r.rating >= 4);
    } else if (this.activeFilter === 'fast') {
      list = list.filter((r) => r.avgPrepTime <= 20);
    } else if (this.activeFilter === 'promo') {
      list = list.filter((r) => this.hasPromos(r._id));
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

    this.filtered = list;
  }

  /* =========================================================
   *  HELPERS PROMO (lus depuis promoMap)
   * ========================================================= */

  /** Vrai si le restaurant a au moins une promo active. */
  hasPromos(restaurantId: string): boolean {
    return (this.promoMap.get(restaurantId)?.count ?? 0) > 0;
  }

  /** Nombre de promos actives pour un restaurant. */
  countPromosForRestaurant(restaurantId: string): number {
    return this.promoMap.get(restaurantId)?.count ?? 0;
  }

  /** Meilleure remise en % (0 s'il n'y a que des fixed/free-delivery). */
  getBestDiscount(restaurantId: string): number {
    return this.promoMap.get(restaurantId)?.bestDiscount ?? 0;
  }

  /** Couleur du badge promo. */
  getPromoColor(restaurantId: string): string {
    return this.promoMap.get(restaurantId)?.color ?? '#ff6b6b';
  }
}