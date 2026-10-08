import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.prod';

@Injectable({ providedIn: 'root' })
export class RestaurantService {
  private api = `${environment.apiUrl}/restaurants`;

  constructor(private http: HttpClient) {}

  // =========================================================
  // PUBLIC
  // =========================================================
  getAll() {
    return this.http.get<any[]>(this.api);
  }

  getById(id: string) {
    return this.http.get<any>(`${this.api}/${id}`);
  }

  // =========================================================
  // RESTAURANT CONNECTÉ
  // =========================================================
  getMyProfile() {
    return this.http.get<any>(`${this.api}/me/profile`);
  }

  updateMyProfile(data: any) {
    return this.http.patch<any>(`${this.api}/me/profile`, data);
  }

  toggleOpen() {
    return this.http.patch<{ isOpen: boolean }>(`${this.api}/me/toggle-open`, {});
  }

  // =========================================================
  // STATS
  // =========================================================
  getMyStats() {
    return this.http.get<{
      products: number;
      orders: number;
      pendingOrders: number;
      activeOrders: number;
      soldOrders: number;
      openDisputes: number;
      promotions: number;
      clients: number;
    }>(`${this.api}/me/stats`);
  }

  getMyDashboard() {
    return this.http.get<{
      today: { orders: number; revenue: number };
      month: { orders: number; revenue: number };
      status: {
        pending: number;
        accepted: number;
        preparing: number;
        ready: number;
        delivering: number;
        delivered: number;
      };
      chart: any[];
      topProducts: any[];
      restaurant: {
        name: string;
        isOpen: boolean;
        rating: number;
        totalReviews: number;
      };
    }>(`${this.api}/me/dashboard`);
  }

  getMyClients() {
    return this.http.get<any[]>(`${this.api}/me/clients`);
  }

  getMyStatistics() {
    return this.http.get<{
      salesByDay: any[];
      salesByCategory: any[];
      summary: {
        totalOrders: number;
        receivedOrders: number;
        completedOrders: number;
        cancelledOrders: number;
        deliveredNotConfirmed: number;
        openDisputes: number;
        totalRevenue: number;
        avgOrderValue: number;
        cancelRate: number;
      };
    }>(`${this.api}/me/statistics`);
  }

  // =========================================================
  // NOTIFICATIONS (compteurs badge header)
  // =========================================================
  getMyNotifications() {
    return this.http.get<{
      notificationsCount: number;
      pendingOrders: number;
      openDisputes: number;
      messagesCount: number;
      todayOrders: number;
    }>(`${this.api}/me/notifications`);
  }


  /** Récupérer le propriétaire (user) d'un restaurant */
getOwner(restaurantId: string) {
  return this.http.get<{
    userId: string;
    name: string;
    avatar: string;
    role: string;
  }>(`${this.api}/${restaurantId}/owner`);
}
}