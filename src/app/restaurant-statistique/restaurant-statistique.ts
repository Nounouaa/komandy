import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RestaurantService } from '../core/services/restaurant.service';

@Component({
  selector: 'app-restaurant-statistique',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './restaurant-statistique.html',
  styleUrl: './restaurant-statistique.css',
})
export class RestaurantStatistique implements OnInit {

  /* =========================================================
   *  ÉTAT
   * ========================================================= */
  stats: {
    totalRevenue: number;
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    cancelRate: number;
    avgOrderValue: number;
  } | null = null;

  salesByDay: { _id: string; revenue: number; orders: number }[] = [];
  salesByCategory: { _id: string; revenue: number }[] = [];

  isLoading = true;
  period: '30' | '7' = '30';

  constructor(
    private restaurantService: RestaurantService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  /* =========================================================
   *  CYCLE DE VIE
   * ========================================================= */
  ngOnInit(): void {
    this.loadStats();
  }

  /* =========================================================
   *  CHARGEMENT
   * ========================================================= */
  loadStats(): void {
    this.restaurantService.getMyStatistics().subscribe({
      next: (data: any) => {
        this.zone.run(() => {
          this.stats = this.normalizeSummary(data?.summary);
          this.salesByDay = this.normalizeSalesByDay(data?.salesByDay);
          this.salesByCategory = this.normalizeSalesByCategory(data?.salesByCategory);
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.stats = this.emptySummary();
          this.salesByDay = [];
          this.salesByCategory = [];
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
    });
  }

  /* =========================================================
   *  NORMALISATION DES DONNÉES
   *  (garantit que les pipes number ne reçoivent jamais undefined)
   * ========================================================= */
  private emptySummary() {
    return {
      totalRevenue: 0,
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      cancelRate: 0,
      avgOrderValue: 0,
    };
  }

  private normalizeSummary(s: any) {
    return {
      totalRevenue:    Number(s?.totalRevenue)    || 0,
      totalOrders:     Number(s?.totalOrders)     || 0,
      completedOrders: Number(s?.completedOrders) || 0,
      cancelledOrders: Number(s?.cancelledOrders) || 0,
      cancelRate:      Number(s?.cancelRate)      || 0,
      avgOrderValue:   Number(s?.avgOrderValue)   || 0,
    };
  }

  private normalizeSalesByDay(list: any): any[] {
    if (!Array.isArray(list)) return [];
    return list.map((d) => ({
      _id: String(d?._id ?? ''),
      revenue: Number(d?.revenue) || 0,
      orders: Number(d?.orders) || 0,
    }));
  }

  private normalizeSalesByCategory(list: any): any[] {
    if (!Array.isArray(list)) return [];
    return list.map((c) => ({
      _id: String(c?._id ?? 'Autres'),
      revenue: Number(c?.revenue) || 0,
    }));
  }

  /* =========================================================
   *  CHART — 7 ou 30 derniers jours
   * ========================================================= */
  getChartData(): any[] {
    const days = this.period === '7' ? 7 : 30;
    const result: any[] = [];

    // Protection : max = au moins 1 pour éviter division par zéro
    const revenues = this.salesByDay.map((d) => d.revenue);
    const max = revenues.length > 0 ? Math.max(...revenues, 1) : 1;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const found = this.salesByDay.find((s) => s._id === key);
      const revenue = Number(found?.revenue) || 0;

      result.push({
        date: key,
        label: d.getDate().toString(),
        revenue,
        orders: Number(found?.orders) || 0,
        height: (revenue / max) * 100,
      });
    }
    return result;
  }

  /* =========================================================
   *  CATÉGORIES
   * ========================================================= */
  getMaxCategory(): number {
    if (this.salesByCategory.length === 0) return 1;
    const revenues = this.salesByCategory.map((c) => c.revenue);
    return Math.max(...revenues, 1);
  }

  getCategoryPct(revenue: number | undefined | null): number {
    const safe = Number(revenue) || 0;
    return Math.round((safe / this.getMaxCategory()) * 100);
  }

  /* =========================================================
   *  PÉRIODE
   * ========================================================= */
  setPeriod(p: '30' | '7'): void {
    this.period = p;
    this.cdr.detectChanges();
  }

  /* =========================================================
   *  HELPERS TEMPLATE (pour éviter NG02100 partout)
   * ========================================================= */

  /** Retourne une valeur numérique sûre pour les pipes. */
  safeNumber(value: any): number {
    const n = Number(value);
    return isNaN(n) ? 0 : n;
  }
}