import { Injectable, OnDestroy, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment.prod';

// =========================================================
// TYPES
// =========================================================

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'delivering'
  | 'delivered'
  | 'received'
  | 'cancelled';

// =========================================================
// SERVICE
// =========================================================

@Injectable({ providedIn: 'root' })
export class OrderService implements OnDestroy {
  private readonly api = `${environment.apiUrl}/orders`;
private readonly socketUrl = environment.socketUrl;

  private socket?: Socket;
  private ordersSubject = new BehaviorSubject<any[]>([]);
  orders$ = this.ordersSubject.asObservable();

  // =========================================================
  // CALLBACKS (pour les composants)
  // =========================================================
  private newOrderCallback?: (order: any) => void;
  private statusChangedCallback?: (order: any) => void;
  private disputeCallback?: (order: any) => void;
  private orderCompletedCallback?: (order: any) => void;

  constructor(
    private http: HttpClient,
    private zone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // =========================================================
  // SOCKET.IO
  // =========================================================
  connectSocket(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.socket?.connected) return;

    const raw = localStorage.getItem('user');
    if (!raw) return;

    let user: any;
    try {
      user = JSON.parse(raw);
    } catch {
      return;
    }
    if (!user?._id) return;

    this.socket = io(this.socketUrl, { transports: ['websocket'] });

    // --- Connexion ---
    this.socket.on('connect', () => {
      this.zone.run(() => {
        console.log('🔌 Socket connecté:', this.socket?.id);

        this.socket!.emit('join', {
          userId: user._id,
          restaurantId: user.restaurantId,
        });
      });
    });

    // =========================================================
    // ÉVÉNEMENT : NOUVELLE COMMANDE (côté restaurant)
    // =========================================================
    this.socket.on('new-order', (order: any) => {
      this.zone.run(() => {
        console.log('🔔 Nouvelle commande:', order);

        // Ajouter en tête de liste
        this.ordersSubject.next([order, ...this.ordersSubject.value]);

        // Déclencher le callback du composant
        this.newOrderCallback?.(order);
      });
    });

    // =========================================================
    // ÉVÉNEMENT : STATUT CHANGÉ (client OU restaurant)
    // =========================================================
    this.socket.on('status-changed', (updated: any) => {
      this.zone.run(() => {
        console.log('🔄 Statut changé:', updated._id, updated.status);

        const list = this.ordersSubject.value.map((o) =>
          o._id === updated._id ? updated : o
        );
        this.ordersSubject.next(list);

        this.statusChangedCallback?.(updated);
      });
    });

    // =========================================================
    // ÉVÉNEMENT : LITIGE SIGNALÉ (côté restaurant)
    // =========================================================
    this.socket.on('order-dispute', (order: any) => {
      this.zone.run(() => {
        console.log('⚠️ Litige signalé:', order._id);

        const list = this.ordersSubject.value.map((o) =>
          o._id === order._id ? order : o
        );
        this.ordersSubject.next(list);

        this.disputeCallback?.(order);
      });
    });

    // =========================================================
    // ÉVÉNEMENT : COMMANDE TERMINÉE / VENDUE (côté restaurant)
    // =========================================================
    this.socket.on('order-completed', (order: any) => {
      this.zone.run(() => {
        console.log('✅ Commande vendue:', order._id);

        const list = this.ordersSubject.value.map((o) =>
          o._id === order._id ? order : o
        );
        this.ordersSubject.next(list);

        this.orderCompletedCallback?.(order);
      });
    });

    // --- Déconnexion ---
    this.socket.on('disconnect', () => {
      this.zone.run(() => {
        console.log('🔌 Socket déconnecté');
      });
    });
  }

  disconnectSocket(): void {
    if (!this.socket) return;
    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = undefined;
  }

  ngOnDestroy(): void {
    this.disconnectSocket();
  }

  // =========================================================
  // CALLBACKS — Enregistrement
  // =========================================================

  /** Callback appelé quand une nouvelle commande arrive */
  onNewOrder(callback: (order: any) => void): void {
    this.newOrderCallback = callback;
  }

  /** Callback appelé quand un statut change */
  onStatusChanged(callback: (order: any) => void): void {
    this.statusChangedCallback = callback;
  }

  /** Callback appelé quand un client signale un litige */
  onDispute(callback: (order: any) => void): void {
    this.disputeCallback = callback;
  }

  /** Callback appelé quand une commande est confirmée vendue */
  onOrderCompleted(callback: (order: any) => void): void {
    this.orderCompletedCallback = callback;
  }

  // =========================================================
  // CLIENT
  // =========================================================
  createOrder(payload: any) {
    return this.http.post<any>(this.api, payload);
  }

  getMyOrders() {
    return this.http.get<any[]>(`${this.api}/my-orders`);
  }

  reviewOrder(orderId: string, rating: number, review: string) {
    return this.http.post(`${this.api}/${orderId}/review`, { rating, review });
  }

  /** Client confirme avoir reçu + payé */
  confirmReceived(orderId: string) {
    return this.http.post<any>(`${this.api}/${orderId}/confirm-received`, {});
  }

  /** Client signale ne pas avoir reçu */
  reportNotReceived(orderId: string, reason: string) {
    return this.http.post<any>(`${this.api}/${orderId}/report-not-received`, {
      reason,
    });
  }

  // =========================================================
  // RESTAURANT
  // =========================================================
  getReceivedOrders() {
    return this.http.get<any[]>(`${this.api}/received`);
  }

  updateStatus(
    orderId: string,
    status: OrderStatus,
    deliverer?: { delivererName?: string; delivererPhone?: string }
  ) {
    return this.http.patch<any>(`${this.api}/${orderId}/status`, {
      status,
      ...deliverer,
    });
  }

  /** Restaurant résout un litige */
  resolveDispute(
    orderId: string,
    action: 'resolve' | 'confirm',
    resolution?: string
  ) {
    return this.http.patch<any>(`${this.api}/${orderId}/resolve-dispute`, {
      action,
      resolution,
    });
  }

  // =========================================================
  // HELPERS
  // =========================================================
  getStatusLabel(status: OrderStatus | string): string {
    const labels: Record<string, string> = {
      pending: 'En attente',
      accepted: 'Acceptée',
      preparing: 'En préparation',
      ready: 'Prête',
      delivering: 'En livraison',
      delivered: 'Livrée',
      received: 'Reçue & payée',
      cancelled: 'Annulée',
    };
    return labels[status] ?? status;
  }

  getCurrentOrders(): any[] {
    return this.ordersSubject.value;
  }

  clearOrders(): void {
    this.ordersSubject.next([]);
  }
}