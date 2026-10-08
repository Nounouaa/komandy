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
  stats: any = null;
  salesByDay: any[] = [];
  salesByCategory: any[] = [];
  isLoading = true;
  period: '30' | '7' = '30';

  constructor(
    private restaurantService: RestaurantService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.restaurantService.getMyStatistics().subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.stats = data.summary;
          this.salesByDay = data.salesByDay || [];
          this.salesByCategory = data.salesByCategory || [];
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => { this.isLoading = false; this.cdr.detectChanges(); });
      },
    });
  }

  getChartData(): any[] {
    const days = this.period === '7' ? 7 : 30;
    const result: any[] = [];
    const max = Math.max(...this.salesByDay.map((d) => d.revenue), 1);

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const found = this.salesByDay.find((s) => s._id === key);

      result.push({
        date: key,
        label: d.getDate().toString(),
        revenue: found?.revenue || 0,
        orders: found?.orders || 0,
        height: ((found?.revenue || 0) / max) * 100,
      });
    }
    return result;
  }

  getMaxCategory(): number {
    return Math.max(...this.salesByCategory.map((c) => c.revenue), 1);
  }

  getCategoryPct(revenue: number): number {
    return Math.round((revenue / this.getMaxCategory()) * 100);
  }

  setPeriod(p: '30' | '7'): void {
    this.period = p;
  }
}