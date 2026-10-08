import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private itemsSubject = new BehaviorSubject<CartItem[]>(this.loadFromStorage());
  items$ = this.itemsSubject.asObservable();

  private restaurantId: string | null = null;
  private restaurantName = '';

  // ---------------------------------------------------------
  // Ajouter un produit
  // ---------------------------------------------------------
  addItem(item: CartItem, restaurantId: string, restaurantName: string): boolean {
    // Changement de restaurant → vider le panier
    if (this.restaurantId && this.restaurantId !== restaurantId) {
      if (!confirm('Votre panier contient des articles d\'un autre restaurant. Voulez-vous le vider ?')) {
        return false;
      }
      this.clear();
    }

    this.restaurantId = restaurantId;
    this.restaurantName = restaurantName;

    const items = [...this.itemsSubject.value];
    const existing = items.find((i) => i.productId === item.productId);

    if (existing) {
      existing.quantity += item.quantity;
    } else {
      items.push({ ...item });
    }

    this.updateItems(items);
    return true;
  }

  // ---------------------------------------------------------
  // Modifier la quantité
  // ---------------------------------------------------------
  increment(productId: string): void {
    const items = this.itemsSubject.value.map((i) =>
      i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
    );
    this.updateItems(items);
  }

  decrement(productId: string): void {
    const items = this.itemsSubject.value
      .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i))
      .filter((i) => i.quantity > 0);
    this.updateItems(items);
  }

  removeItem(productId: string): void {
    const items = this.itemsSubject.value.filter((i) => i.productId !== productId);
    this.updateItems(items);
  }

  clear(): void {
    this.updateItems([]);
    this.restaurantId = null;
    this.restaurantName = '';
  }

  // ---------------------------------------------------------
  // Getters
  // ---------------------------------------------------------
  getItems(): CartItem[] {
    return this.itemsSubject.value;
  }

  getRestaurantId(): string | null {
    return this.restaurantId;
  }

  getRestaurantName(): string {
    return this.restaurantName;
  }

  getCount(): number {
    return this.itemsSubject.value.reduce((sum, i) => sum + i.quantity, 0);
  }

  getSubtotal(): number {
    return this.itemsSubject.value.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }

  isEmpty(): boolean {
    return this.itemsSubject.value.length === 0;
  }

  // ---------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------
  private updateItems(items: CartItem[]): void {
    this.itemsSubject.next(items);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cart_items', JSON.stringify(items));
      if (this.restaurantId) {
        localStorage.setItem('cart_restaurantId', this.restaurantId);
        localStorage.setItem('cart_restaurantName', this.restaurantName);
      } else {
        localStorage.removeItem('cart_restaurantId');
        localStorage.removeItem('cart_restaurantName');
      }
    }
  }

  private loadFromStorage(): CartItem[] {
    if (typeof localStorage === 'undefined') return [];

    try {
      const raw = localStorage.getItem('cart_items');
      const items = raw ? JSON.parse(raw) : [];

      this.restaurantId = localStorage.getItem('cart_restaurantId');
      this.restaurantName = localStorage.getItem('cart_restaurantName') || '';

      return items;
    } catch {
      return [];
    }
  }
}