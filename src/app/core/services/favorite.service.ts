import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class FavoriteService {
  private readonly STORAGE_KEY = 'favorite_restaurants';
  private favoritesSubject = new BehaviorSubject<any[]>([]);
  favorites$ = this.favoritesSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // ✅ Charger depuis localStorage AU DÉMARRAGE
    this.loadFromStorage();
  }

  // =========================================================
  // AJOUTER
  // =========================================================
  add(restaurant: any): void {
    if (this.isFavorite(restaurant._id)) return;

    const current = this.favoritesSubject.value;
    const updated = [...current, restaurant];
    this.update(updated);
  }

  // =========================================================
  // RETIRER
  // =========================================================
  remove(restaurantId: string): void {
    const updated = this.favoritesSubject.value.filter(
      (r) => r._id !== restaurantId
    );
    this.update(updated);
  }

  // =========================================================
  // TOGGLE
  // =========================================================
  toggle(restaurant: any): boolean {
    if (this.isFavorite(restaurant._id)) {
      this.remove(restaurant._id);
      return false;
    }
    this.add(restaurant);
    return true;
  }

  // =========================================================
  // GETTERS
  // =========================================================
  isFavorite(restaurantId: string): boolean {
    return this.favoritesSubject.value.some((r) => r._id === restaurantId);
  }

  getAll(): any[] {
    return this.favoritesSubject.value;
  }

  getCount(): number {
    return this.favoritesSubject.value.length;
  }

  clear(): void {
    this.update([]);
  }

  // =========================================================
  // PERSISTANCE — ÉCRITURE
  // =========================================================
  private update(favorites: any[]): void {
    // 1. Mettre à jour l'observable
    this.favoritesSubject.next(favorites);

    // 2. Sauvegarder dans localStorage
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites));
        console.log('💾 Favoris sauvegardés:', favorites.length);
      } catch (err) {
        console.error('Erreur sauvegarde favoris:', err);
      }
    }
  }

  // =========================================================
  // PERSISTANCE — LECTURE
  // =========================================================
  private loadFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) {
        this.favoritesSubject.next([]);
        return;
      }

      const parsed = JSON.parse(raw);
      const favorites = Array.isArray(parsed) ? parsed : [];
      this.favoritesSubject.next(favorites);
      console.log('📂 Favoris chargés:', favorites.length);
    } catch (err) {
      console.error('Erreur chargement favoris:', err);
      this.favoritesSubject.next([]);
    }
  }
}