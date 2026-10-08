import {
  Component,
  OnInit,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { FavoriteService } from '../core/services/favorite.service';
import { CartService } from '../core/services/cart.service';

import { AvatarService } from '../core/services/avatar';
import { UploadService } from '../core/services/upload';

@Component({
  selector: 'app-favoris',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './favoris.html',
  styleUrl: './favoris.css',
})
export class Favoris implements OnInit {

  favorites: any[] = [];
  isLoading = true;

  constructor(
    public favoriteService: FavoriteService,
    public uploadService: UploadService,
    public avatarService: AvatarService,
    private cartService: CartService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  // =========================================================
  // CYCLE DE VIE
  // =========================================================
  ngOnInit(): void {
    this.loadFavorites();

    this.favoriteService.favorites$.subscribe((favs) => {
      this.zone.run(() => {
        this.favorites = favs || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      });
    });
  }

  loadFavorites(): void {
    this.favorites = this.favoriteService.getAll() || [];
    this.isLoading = false;
  }

  // =========================================================
  // ACTIONS
  // =========================================================
  removeFavorite(restaurant: any, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    if (!confirm(`Retirer "${restaurant.name}" de vos favoris ?`)) return;
    this.favoriteService.remove(restaurant._id);
  }

  goToRestaurant(restaurant: any): void {
    this.router.navigate(['/client/restaurants', restaurant._id]);
  }

  clearAll(): void {
    if (!confirm('Vider tous vos favoris ?')) return;
    this.favoriteService.clear();
  }

  // =========================================================
  // HELPERS IMAGES
  // =========================================================
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

  getInitials(name: string): string {
    return this.avatarService.getInitials(name || '');
  }

  getGradient(name: string): string {
    return this.avatarService.getGradient(name || '');
  }
}