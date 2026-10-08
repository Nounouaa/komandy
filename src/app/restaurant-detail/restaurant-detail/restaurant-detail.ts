import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { RestaurantService } from '../../core/services/restaurant.service';
import { PromotionService } from '../../core/services/promotion.service';
import { CartService } from '../../core/services/cart.service';
import { FavoriteService } from '../../core/services/favorite.service';

import { AvatarService } from '../../core/services/avatar';
import { UploadService } from '../../core/services/upload';

const API_URL = 'http://localhost:3000/api';

@Component({
  selector: 'app-restaurant-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './restaurant-detail.html',
  styleUrl: './restaurant-detail.css',
})
export class RestaurantDetail implements OnInit {

  /* =========================================================
   *  ÉTAT
   * ========================================================= */
  restaurant: any = null;
  products: any[] = [];
  promotions: any[] = [];
  groupedProducts: { category: string; items: any[] }[] = [];

  isLoading = true;
  selectedCategory = 'all';
  categories: string[] = [];

  /* =========================================================
   *  MODAL
   * ========================================================= */
  showProductModal = false;
  selectedProduct: any = null;
  productQuantity = 1;
  productNote = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private restaurantService: RestaurantService,
    private promoService: PromotionService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    public cartService: CartService,
    public favoriteService: FavoriteService,
    public uploadService: UploadService,
    public avatarService: AvatarService
  ) {}

  /* =========================================================
   *  CYCLE DE VIE
   * ========================================================= */
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.router.navigate(['/client/restaurants']);
      return;
    }

    this.loadRestaurant(id);
    this.loadProducts(id);
    this.loadPromotions(id);
  }

  /* =========================================================
   *  CHARGEMENT
   * ========================================================= */
  private loadRestaurant(id: string): void {
    this.restaurantService.getById(id).subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.restaurant = data;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.router.navigate(['/client/restaurants']);
      },
    });
  }

  private loadProducts(id: string): void {
    this.http.get<any[]>(`${API_URL}/products/restaurant/${id}`).subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.products = data ?? [];
          this.buildCategories();
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

  /** Charge les promos actives du restaurant. */
  /** Charge les promos actives du restaurant. */
private loadPromotions(restaurantId: string): void {
  this.promoService.getByRestaurant(restaurantId).subscribe({
    next: (res: any) => {
      this.zone.run(() => {
        this.promotions = Array.isArray(res)
          ? res
          : (res?.promotions ?? res?.data ?? []);
        this.cdr.detectChanges();
      });
    },
    error: () => {
      this.promotions = [];
    },
  });
}

  private buildCategories(): void {
    const map = new Map<string, any[]>();

    for (const p of this.products) {
      const cat = p.category || 'Autres';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }

    this.categories = Array.from(map.keys());
    this.groupedProducts = this.categories.map((c) => ({
      category: c,
      items: map.get(c)!,
    }));
  }

  /* =========================================================
   *  CATÉGORIES
   * ========================================================= */
  setCategory(cat: string): void {
    this.selectedCategory = cat;
  }

  get displayedProducts(): any[] {
    if (this.selectedCategory === 'all') return this.products;
    return this.products.filter((p) => (p.category || 'Autres') === this.selectedCategory);
  }

  /* =========================================================
   *  FAVORIS
   * ========================================================= */
  toggleFavorite(): void {
    if (!this.restaurant) return;
    this.favoriteService.toggle(this.restaurant);
  }

  isFavorite(): boolean {
    return this.restaurant
      ? this.favoriteService.isFavorite(this.restaurant._id)
      : false;
  }

  /* =========================================================
   *  MODAL PRODUIT
   * ========================================================= */
  openProduct(product: any): void {
    this.selectedProduct = product;
    this.productQuantity = 1;
    this.productNote = '';
    this.showProductModal = true;
    this.cdr.detectChanges();
  }

  closeProductModal(): void {
    this.showProductModal = false;
    this.selectedProduct = null;
  }

  incrementQty(): void {
    this.productQuantity++;
  }

  decrementQty(): void {
    if (this.productQuantity > 1) this.productQuantity--;
  }

  /* =========================================================
   *  PANIER
   * ========================================================= */
  addToCart(): void {
    if (!this.selectedProduct || !this.restaurant) return;

    const finalPrice = this.getFinalPrice(this.selectedProduct);

    const success = this.cartService.addItem(
      {
        productId: this.selectedProduct._id,
        name: this.selectedProduct.name,
        price: finalPrice,
        quantity: this.productQuantity,
        image: this.selectedProduct.image,
      },
      this.restaurant._id,
      this.restaurant.name
    );

    if (success) this.closeProductModal();
  }

  goToCart(): void {
    this.router.navigate(['/client/panier']);
  }

  /* =========================================================
   *  PROMOTIONS
   * ========================================================= */

  /**
   * Retourne la promo active qui s'applique à un produit.
   *
   * Règles :
   *  - Une promo avec `productId = null` → s'applique à TOUS les produits du resto.
   *  - Une promo avec `productId = X`     → s'applique UNIQUEMENT au produit X.
   *  - Si plusieurs promos matchent, on garde la plus avantageuse.
   */
 /**
 * Retourne la promo active qui s'applique à CE produit précis.
 *  - Une promo SANS `productId` → n'est PAS appliquée (promo orpheline).
 *  - Une promo AVEC `productId` → appliquée UNIQUEMENT au produit correspondant.
 *  - Si plusieurs promos matchent, la plus avantageuse gagne.
 */
/**
 * Retourne la promo active qui s'applique à CE produit.
 *  - `productId` peut être : ObjectId brut, string, ou objet peuplé { _id, name, ... }
 *  - On compare TOUJOURS en string pour éviter les faux négatifs.
 */
getPromoForProduct(productId: string): any | null {
  if (!productId) return null;

  const targetId = String(productId);

  const applicable = this.promotions.filter((p) => {
    if (!p.isActive || this.isPromoExpired(p)) return false;

    const pid = this.extractId(p.productId);
    if (!pid) return false;

    return pid === targetId;
  });

  if (applicable.length === 0) return null;

  return applicable.sort((a, b) => this.scorePromo(b) - this.scorePromo(a))[0];
}




/**
 * Extrait proprement l'ID d'un champ qui peut être :
 *  - ObjectId   → "65a0b1..."
 *  - string     → "65a0b1..."
 *  - objet peuplé { _id: "65a0b1..." } → "65a0b1..."
 *  - null / undefined → null
 */
private extractId(value: any): string | null {
  if (!value) return null;

  // Objet peuplé (a une propriété _id)
  if (typeof value === 'object' && '_id' in value) {
    return value._id ? String(value._id) : null;
  }

  // ObjectId ou string → String() renvoie l'hex
  return String(value);
}
  /** Score de remise pour comparer deux promos. */
  private scorePromo(promo: any): number {
    if (promo.type === 'percent') return promo.discount;
    if (promo.type === 'fixed')   return promo.discount / 100;
    return 0;
  }

  /** Vrai si le produit a une promo active. */
  hasPromo(product: any): boolean {
    return !!this.getPromoForProduct(product._id);
  }

  /** Prix final après application de la promo (ou prix normal). */
  getFinalPrice(product: any): number {
    const promo = this.getPromoForProduct(product._id);
    const price = Number(product.price) || 0;
    if (!promo) return price;

    if (promo.type === 'percent') {
      return Math.max(0, price - (price * promo.discount) / 100);
    }
    if (promo.type === 'fixed') {
      return Math.max(0, price - promo.discount);
    }
    return price;
  }

  /** Libellé de la remise (ex: "-20%", "-5000 Ar", "Livraison offerte"). */
  getPromoLabel(promo: any): string {
    if (!promo) return '';
    if (promo.type === 'percent') return `-${promo.discount}%`;
    if (promo.type === 'fixed')   return `-${promo.discount} Ar`;
    return 'Livraison offerte';
  }

  /** Couleur de la promo (fallback). */
  getPromoColor(promo: any): string {
    return promo?.color || '#ff6b6b';
  }

  isPromoExpired(promo: any): boolean {
    if (!promo?.expiresAt) return false;
    return new Date(promo.expiresAt).getTime() < Date.now();
  }

  /* =========================================================
   *  HELPERS RESTAURANT
   * ========================================================= */
  getInitials(): string {
    return this.avatarService.getInitials(this.restaurant?.name || '');
  }

  getGradient(): string {
    return this.avatarService.getGradient(this.restaurant?.name || '');
  }

  hasLogo(): boolean {
    return this.uploadService.hasImage(this.restaurant?.logo);
  }

  hasCover(): boolean {
    return this.uploadService.hasImage(this.restaurant?.coverImage);
  }


  
}