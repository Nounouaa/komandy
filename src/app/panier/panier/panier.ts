import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { UploadService } from '../../core/services/upload';



@Component({
  selector: 'app-panier',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './panier.html',
  styleUrl: './panier.css',
})
export class Panier implements OnInit {
  items: any[] = [];
  restaurant: any = null;

  // Adresse
  addresses: any[] = [];
  selectedAddressIndex = 0;
  showNewAddressForm = false;
  newAddress = { label: 'Maison', address: '', city: '', postalCode: '', phone: '' };

  // État
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';

  constructor(
    public cartService: CartService,
    private restaurantService: RestaurantService,
    private orderService: OrderService,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    public uploadService: UploadService
  ) {}

  ngOnInit(): void {
    this.items = this.cartService.getItems();
    this.cartService.items$.subscribe((i) => {
      this.items = i;
      this.cdr.detectChanges();
    });

    this.loadRestaurant();
    this.loadAddresses();
  }

  private loadRestaurant(): void {
    const id = this.cartService.getRestaurantId();
    if (!id) return;

    this.restaurantService.getById(id).subscribe({
      next: (r) => {
        this.zone.run(() => {
          this.restaurant = r;
          this.cdr.detectChanges();
        });
      },
    });
  }

  private loadAddresses(): void {
    const user = this.auth.getUser();
    this.addresses = user?.addresses || [];

    if (this.addresses.length === 0) {
      this.showNewAddressForm = true;
      this.newAddress.phone = user?.phone || '';
    }
  }

  // ---------------------------------------------------------
  // Panier
  // ---------------------------------------------------------
  increment(item: any): void { this.cartService.increment(item.productId); }
  decrement(item: any): void { this.cartService.decrement(item.productId); }
  remove(item: any): void {
    if (confirm(`Retirer "${item.name}" du panier ?`)) {
      this.cartService.removeItem(item.productId);
    }
  }

  clearCart(): void {
    if (confirm('Vider tout le panier ?')) {
      this.cartService.clear();
      this.router.navigate(['/client/restaurants']);
    }
  }

  // ---------------------------------------------------------
  // Adresses
  // ---------------------------------------------------------
  selectAddress(index: number): void { this.selectedAddressIndex = index; }

  addNewAddress(): void {
    if (!this.newAddress.address.trim() || !this.newAddress.city.trim()) {
      this.errorMessage = 'Adresse et ville obligatoires';
      return;
    }
    this.addresses.push({ ...this.newAddress, isDefault: this.addresses.length === 0 });
    this.selectedAddressIndex = this.addresses.length - 1;
    this.showNewAddressForm = false;
    this.newAddress = { label: 'Maison', address: '', city: '', postalCode: '', phone: '' };
    this.errorMessage = '';
  }

  // ---------------------------------------------------------
  // Commander
  // ---------------------------------------------------------
  get subtotal(): number {
    return this.cartService.getSubtotal();
  }

  get deliveryFee(): number {
    return this.restaurant?.deliveryFee || 0;
  }

  get total(): number {
    return this.subtotal + this.deliveryFee;
  }

  get canOrder(): boolean {
    return (
      this.items.length > 0 &&
      !!this.restaurant &&
      this.subtotal >= (this.restaurant.minOrder || 0) &&
      this.addresses.length > 0
    );
  }

  placeOrder(): void {
    this.errorMessage = '';

    if (!this.canOrder) {
      if (this.subtotal < (this.restaurant?.minOrder || 0)) {
        this.errorMessage = `Minimum ${this.restaurant.minOrder} Ar pour commander`;
      } else if (this.addresses.length === 0) {
        this.errorMessage = 'Ajoutez une adresse de livraison';
      }
      return;
    }

    this.isSubmitting = true;

    const address = this.addresses[this.selectedAddressIndex];

    const payload = {
      restaurantId: this.restaurant._id,
      items: this.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
      deliveryAddress: {
        label: address.label || 'Maison',
        address: address.address,
        city: address.city,
        postalCode: address.postalCode || '',
        phone: address.phone || this.auth.getUser()?.phone || '',
      },
    };

    this.orderService.createOrder(payload).subscribe({
      next: () => {
        this.zone.run(() => {
          this.isSubmitting = false;
          this.cartService.clear();
          this.router.navigate(['/client/commandes']);
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.isSubmitting = false;
          this.errorMessage = err.error?.message || 'Erreur lors de la commande';
          this.cdr.detectChanges();
        });
      },
    });
  }

  /* =========================================================
 *  HELPERS IMAGES
 * ========================================================= */

/** URL complète de l'image d'un article. */
getItemImage(item: any): string {
  if (!item?.image) return '';
  return this.uploadService.getImageUrl(item.image);
}

/** Vrai si l'article a une image affichable. */
hasItemImage(item: any): boolean {
  return this.uploadService.hasImage(item?.image);
}
}