import {
  Component,
  OnInit,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { RestaurantService } from '../core/services/restaurant.service';
import { AvatarService } from '../core/services/avatar';
import { UploadService } from '../core/services/upload';

@Component({
  selector: 'app-restaurant-client',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './restaurant-client.html',
  styleUrl: './restaurant-client.css',
})
export class RestaurantClient implements OnInit {

  /* =========================================================
   *  ÉTAT
   * ========================================================= */
  clients: any[] = [];
  filteredClients: any[] = [];
  isLoading = true;
  searchQuery = '';
  sortBy: 'spent' | 'orders' | 'recent' | 'saved' = 'spent';

  /* =========================================================
   *  STATS
   * ========================================================= */
  totalClients = 0;
  totalRevenue = 0;
  avgOrderValue = 0;
  totalSaved = 0;            // ← économies accordées via promos

  constructor(
    private restaurantService: RestaurantService,
    public uploadService: UploadService,
    public avatarService: AvatarService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  /* =========================================================
   *  CYCLE DE VIE
   * ========================================================= */
  ngOnInit(): void {
    this.loadClients();
  }

  /* =========================================================
   *  CHARGEMENT
   * ========================================================= */
  loadClients(): void {
    this.restaurantService.getMyClients().subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.clients = data || [];
          this.computeStats();
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

  private computeStats(): void {
    this.totalClients = this.clients.length;

    this.totalRevenue = this.clients.reduce(
      (s, c) => s + (c.totalSpent || 0), 0
    );

    this.totalSaved = this.clients.reduce(
      (s, c) => s + (c.totalSaved || 0), 0
    );

    const totalOrders = this.clients.reduce(
      (s, c) => s + (c.totalOrders || 0), 0
    );

    this.avgOrderValue = totalOrders > 0
      ? Math.round(this.totalRevenue / totalOrders)
      : 0;
  }

  /* =========================================================
   *  FILTRES
   * ========================================================= */
  onSearch(): void {
    this.applyFilter();
  }

  setSort(s: typeof this.sortBy): void {
    this.sortBy = s;
    this.applyFilter();
  }

  private applyFilter(): void {
    let list = [...this.clients];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter((c) =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
      );
    }

    if (this.sortBy === 'spent') {
      list.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
    } else if (this.sortBy === 'orders') {
      list.sort((a, b) => (b.totalOrders || 0) - (a.totalOrders || 0));
    } else if (this.sortBy === 'recent') {
      list.sort(
        (a, b) => new Date(b.lastOrder).getTime() - new Date(a.lastOrder).getTime()
      );
    } else if (this.sortBy === 'saved') {
      list.sort((a, b) => (b.totalSaved || 0) - (a.totalSaved || 0));
    }

    this.filteredClients = list;
  }

  /* =========================================================
   *  HELPERS PROMO
   * ========================================================= */

  /** Vrai si le client a utilisé au moins une promotion. */
  hasUsedPromo(client: any): boolean {
    return (client?.promoOrders || 0) > 0;
  }

  /** Nombre de commandes avec promo utilisées par le client. */
  getPromoOrders(client: any): number {
    return client?.promoOrders || 0;
  }

  /** Montant total économisé par le client. */
  getSavedAmount(client: any): number {
    return client?.totalSaved || 0;
  }

  /* =========================================================
   *  HELPERS IMAGES
   * ========================================================= */
  hasAvatar(client: any): boolean {
    return this.uploadService.hasImage(client?.avatar);
  }

  getAvatarUrl(client: any): string {
    return this.uploadService.getImageUrl(client?.avatar);
  }

  getInitials(name: string): string {
    return this.avatarService.getInitials(name || '');
  }

  getGradient(name: string): string {
    return this.avatarService.getGradient(name || '');
  }

  /* =========================================================
   *  HELPERS DATE
   * ========================================================= */
  getDaysSince(date: string): string {
    if (!date) return '—';

    const diff = Math.floor(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return 'Hier';
    if (diff < 7) return `Il y a ${diff} j`;
    if (diff < 30) return `Il y a ${Math.floor(diff / 7)} sem.`;
    return `Il y a ${Math.floor(diff / 30)} mois`;
  }
}