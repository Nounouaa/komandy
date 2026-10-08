import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

// =========================================================
// TYPES
// =========================================================

export interface RestaurantBranding {
  name: string;
  logo: string;           // base64 ou URL
  avatar: string;         // image avatar utilisateur
  type: string;
  email: string;
  phone: string;
  role: string;
}

const DEFAULT_BRANDING: RestaurantBranding = {
  name: 'Mon Restaurant',
  logo: '',
  avatar: 'assets/images/restaurant-avatar.jpg',
  type: 'Fast Food • Burgers',
  email: 'contact@monrestaurant.mg',
  phone: '+261 34 12 345 67',
  role: 'Restaurateur',
};

// =========================================================
// SERVICE
// =========================================================

@Injectable({ providedIn: 'root' })
export class RestaurantProfileService {

  private readonly STORAGE_KEY = 'restaurantBranding';
  private readonly branding$ = new BehaviorSubject<RestaurantBranding>(DEFAULT_BRANDING);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.loadFromStorage();
  }

  /** Observable à écouter dans les composants */
  getBranding(): Observable<RestaurantBranding> {
    return this.branding$.asObservable();
  }

  /** Snapshot synchrone */
  getCurrent(): RestaurantBranding {
    return this.branding$.value;
  }

  /** Mise à jour partielle */
  update(partial: Partial<RestaurantBranding>): void {
    const updated = { ...this.branding$.value, ...partial };
    this.branding$.next(updated);
    this.saveToStorage(updated);
  }

  /** Raccourcis */
  updateLogo(logo: string): void {
    this.update({ logo });
  }

  updateAvatar(avatar: string): void {
    this.update({ avatar });
  }

  // ---------------------------------------------------------------
  // Persistance
  // ---------------------------------------------------------------
  private loadFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed: RestaurantBranding = JSON.parse(stored);
        this.branding$.next({ ...DEFAULT_BRANDING, ...parsed });
      }
    } catch (err) {
      console.warn('Impossible de charger le branding:', err);
    }
  }

  private saveToStorage(branding: RestaurantBranding): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(branding));
    } catch (err) {
      console.warn('Impossible de sauvegarder le branding:', err);
    }
  }
}