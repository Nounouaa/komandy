import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RestaurantService } from '../../core/services/restaurant.service';
import { OrderService } from '../../core/services/order.service';


@Component({
  selector: 'app-dashboard-restaurant',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  stats: any = null;
  chartData: any[] = [];
  topProducts: any[] = [];
  isLoading = true;
  isTogglingOpen = false;

  constructor(
    private restaurantService: RestaurantService,
    private orderService: OrderService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.orderService.connectSocket();
    this.orderService.orders$.subscribe(() => this.loadDashboard());
  }

  loadDashboard(): void {
    this.restaurantService.getMyDashboard().subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.stats = data;
          this.chartData = this.buildChartData(data.chart || []);
          this.topProducts = data.topProducts || [];
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => { this.isLoading = false; this.cdr.detectChanges(); });
      },
    });
  }

  toggleOpen(): void {
    this.isTogglingOpen = true;
    this.restaurantService.toggleOpen().subscribe({
      next: (res) => {
        this.zone.run(() => {
          if (this.stats?.restaurant) this.stats.restaurant.isOpen = res.isOpen;
          this.isTogglingOpen = false;
          this.cdr.detectChanges();
        });
      },
      error: () => { this.isTogglingOpen = false; },
    });
  }

  private buildChartData(raw: any[]): any[] {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const result: any[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const found = raw.find((r) => r._id === key);

      result.push({
        day: days[d.getDay()],
        date: key,
        orders: found?.orders || 0,
        revenue: found?.revenue || 0,
      });
    }
    return result;
  }

  getMaxRevenue(): number {
    const max = Math.max(...this.chartData.map((d) => d.revenue), 1);
    return max;
  }

  getBarHeight(revenue: number): number {
    return (revenue / this.getMaxRevenue()) * 100;
  }

  getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }
}