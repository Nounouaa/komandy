import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { OrderService, OrderStatus } from '../../core/services/order.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-commandes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './commandes.html',
  styleUrl: './commandes.css',
})
export class Commandes implements OnInit, OnDestroy {

  // =========================================================
  // DONNÉES
  // =========================================================
  orders: any[] = [];
  private ordersSub?: Subscription;
  isLoading = true;

  // =========================================================
  // FILTRES
  // =========================================================
  filter:
    | 'all'
    | 'pending'
    | 'active'
    | 'delivered'
    | 'received'
    | 'dispute'
    | 'cancelled' = 'all';

  searchQuery = '';
  sortBy: 'recent' | 'oldest' | 'expensive' = 'recent';
  showFilters = false;
  viewMode: 'list' | 'grid' = 'list';

  // =========================================================
  // MODALES
  // =========================================================
  selectedOrder: any = null;
  orderToCancel: any = null;
  disputeToResolve: any = null;

  // =========================================================
  // MODAL DE CONFIRMATION
  // =========================================================
  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmIcon = 'bi-question-circle';
  confirmColor = '#ff6b6b';
  confirmConfirmText = 'Confirmer';
  confirmCancelText = 'Annuler';
  private confirmCallback: (() => void) | null = null;

  // =========================================================
  // TOAST
  // =========================================================
  toastMessage = '';

  constructor(
    private orderService: OrderService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  // =========================================================
  // CYCLE DE VIE
  // =========================================================
  ngOnInit(): void {
    this.loadOrders();
    this.orderService.connectSocket();

    // 🔌 Temps réel
    this.ordersSub = this.orderService.orders$.subscribe((live) => {
      if (!live.length) return;
      this.zone.run(() => {
        this.orders = live;
        this.isLoading = false;
        this.cdr.detectChanges();
      });
    });

    // 🔔 Nouvelle commande
    this.orderService.onNewOrder?.((order: any) => {
      this.zone.run(() => {
        this.orders = [order, ...this.orders];
        this.showToast('🔔 Nouvelle commande reçue !');
        this.cdr.detectChanges();
      });
    });

    // ⚠️ Litige signalé
    this.orderService.onDispute?.((order: any) => {
      this.zone.run(() => {
        const idx = this.orders.findIndex((o) => o._id === order._id);
        if (idx !== -1) this.orders[idx] = order;
        this.showToast('⚠️ Client signale un problème !');
        this.cdr.detectChanges();
      });
    });

    // ✅ Commande vendue
    this.orderService.onOrderCompleted?.((order: any) => {
      this.zone.run(() => {
        const idx = this.orders.findIndex((o) => o._id === order._id);
        if (idx !== -1) this.orders[idx] = order;
        this.showToast('💰 Commande vendue !');
        this.cdr.detectChanges();
      });
    });
  }

  ngOnDestroy(): void {
    this.ordersSub?.unsubscribe();
    this.orderService.disconnectSocket();
  }

  // =========================================================
  // CHARGEMENT
  // =========================================================
  loadOrders(): void {
    this.orderService.getReceivedOrders().subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.orders = data || [];
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Erreur chargement commandes:', err);
        this.zone.run(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
    });
  }

  // =========================================================
  // STATS
  // =========================================================
  get totalOrders(): number { return this.orders.length; }

  get pendingCount(): number {
    return this.orders.filter((o) => o.status === 'pending').length;
  }

  get activeCount(): number {
    return this.orders.filter((o) =>
      ['accepted', 'preparing', 'ready', 'delivering'].includes(o.status)
    ).length;
  }

  get deliveredCount(): number {
    return this.orders.filter((o) => o.status === 'delivered').length;
  }

  get receivedCount(): number {
    return this.orders.filter((o) => o.status === 'received').length;
  }

  get disputeCount(): number {
    return this.orders.filter(
      (o) => o.dispute?.reported && !o.dispute?.resolved
    ).length;
  }

  get todayRevenue(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.orders
      .filter(
        (o) =>
          o.status === 'received' &&
          new Date(o.createdAt).getTime() >= today.getTime()
      )
      .reduce((sum, o) => sum + (o.total || 0), 0);
  }

  // =========================================================
  // FILTRES
  // =========================================================
  get filteredOrders(): any[] {
    let list = [...this.orders];

    if (this.filter === 'pending') {
      list = list.filter((o) => o.status === 'pending');
    } else if (this.filter === 'active') {
      list = list.filter((o) =>
        ['accepted', 'preparing', 'ready', 'delivering'].includes(o.status)
      );
    } else if (this.filter === 'delivered') {
      list = list.filter((o) => o.status === 'delivered');
    } else if (this.filter === 'received') {
      list = list.filter((o) => o.status === 'received');
    } else if (this.filter === 'dispute') {
      list = list.filter(
        (o) => o.dispute?.reported && !o.dispute?.resolved
      );
    } else if (this.filter === 'cancelled') {
      list = list.filter((o) => o.status === 'cancelled');
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(
        (o) =>
          o._id?.toLowerCase().includes(q) ||
          o.clientId?.name?.toLowerCase().includes(q) ||
          o.clientId?.phone?.includes(q) ||
          o.deliveryAddress?.address?.toLowerCase().includes(q)
      );
    }

    if (this.sortBy === 'recent') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (this.sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (this.sortBy === 'expensive') {
      list.sort((a, b) => b.total - a.total);
    }

    return list;
  }

  setFilter(f: typeof this.filter): void { this.filter = f; }
  clearSearch(): void { this.searchQuery = ''; }
  toggleFilters(): void { this.showFilters = !this.showFilters; }
  setViewMode(mode: 'list' | 'grid'): void { this.viewMode = mode; }

  resetFilters(): void {
    this.filter = 'all';
    this.searchQuery = '';
    this.sortBy = 'recent';
  }

  get hasActiveFilters(): boolean {
    return this.filter !== 'all' || this.searchQuery.trim() !== '' || this.sortBy !== 'recent';
  }

  // =========================================================
  // MODAL DE CONFIRMATION
  // =========================================================
  private openConfirm(config: {
    title: string;
    message: string;
    icon?: string;
    color?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }): void {
    this.confirmTitle = config.title;
    this.confirmMessage = config.message;
    this.confirmIcon = config.icon || 'bi-question-circle';
    this.confirmColor = config.color || '#ff6b6b';
    this.confirmConfirmText = config.confirmText || 'Confirmer';
    this.confirmCancelText = config.cancelText || 'Annuler';
    this.confirmCallback = config.onConfirm;
    this.showConfirmModal = true;
    this.cdr.detectChanges();
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.confirmCallback = null;
    this.cdr.detectChanges();
  }

  acceptConfirmModal(): void {
    const cb = this.confirmCallback;
    this.showConfirmModal = false;
    this.confirmCallback = null;
    this.cdr.detectChanges();
    if (cb) cb();
  }

  // =========================================================
  // ✅ CONFIRMER VENDU (marquer reçu + payé)
  // =========================================================
  confirmDeliveredAndPaid(order: any): void {
    const isDelivering = order.status === 'delivering';

    this.openConfirm({
      title: isDelivering
        ? 'Marquer la commande vendue ?'
        : 'Confirmer la vente ?',
      message: `Confirmez-vous que la commande #${this.getOrderNumber(order)} a été livrée ET payée ? Une fois confirmée, elle sera comptabilisée dans votre chiffre d'affaires.`,
      icon: 'bi-cash-coin',
      color: '#6bcb77',
      confirmText: 'Oui, c\'est vendu',
      cancelText: 'Annuler',
      onConfirm: () => {
        this.http
          .post(`http://localhost:3000/api/orders/${order._id}/confirm-received`, {})
          .subscribe({
            next: (updated: any) => {
              this.zone.run(() => {
                const idx = this.orders.findIndex((o) => o._id === updated._id);
                if (idx !== -1) this.orders[idx] = updated;

                this.showToast('✅ Commande marquée comme vendue !');
                this.cdr.detectChanges();
              });
            },
            error: (err) => {
              this.zone.run(() => {
                this.showToast(err.error?.message || '❌ Erreur');
                this.cdr.detectChanges();
              });
            },
          });
      },
    });
  }

  // =========================================================
  // ACTIONS SUR COMMANDE
  // =========================================================
  accept(order: any): void {
    this.updateStatus(order, 'accepted');
  }

  startPreparing(order: any): void {
    this.updateStatus(order, 'preparing');
  }

  markReady(order: any): void {
    this.updateStatus(order, 'ready');
  }

  startDelivery(order: any): void {
    const delivererName = prompt('Nom du livreur :', 'Livreur du restaurant');
    if (!delivererName) return;

    const delivererPhone = prompt('Téléphone du livreur :', '') || '';

    this.updateStatus(order, 'delivering', { delivererName, delivererPhone });
  }

  markDelivered(order: any): void {
    this.openConfirm({
      title: 'Marquer comme livrée ?',
      message: `Confirmez-vous que le livreur a remis la commande #${this.getOrderNumber(order)} au client ? Le client devra ensuite confirmer la réception pour que la vente soit validée.`,
      icon: 'bi-house-check',
      color: '#4ecdc4',
      confirmText: 'Oui, livrée',
      cancelText: 'Annuler',
      onConfirm: () => {
        this.updateStatus(order, 'delivered');
      },
    });
  }

  // Annulation
  askCancel(order: any): void {
    this.orderToCancel = order;
  }

  confirmCancel(): void {
    if (!this.orderToCancel) return;
    this.updateStatus(this.orderToCancel, 'cancelled');
    this.orderToCancel = null;
  }

  closeCancel(): void {
    this.orderToCancel = null;
  }

  // =========================================================
  // LITIGES
  // =========================================================
  askResolveDispute(order: any): void {
    this.disputeToResolve = order;
  }

  closeResolveDispute(): void {
    this.disputeToResolve = null;
  }

  resolveDispute(action: 'resolve' | 'confirm'): void {
    if (!this.disputeToResolve) return;

    const order = this.disputeToResolve;
    const resolution =
      action === 'confirm'
        ? 'Restaurant a confirmé la vente malgré le signalement'
        : 'Litige résolu après appel du livreur';

    this.http
      .patch(
        `http://localhost:3000/api/orders/${order._id}/resolve-dispute`,
        { action, resolution }
      )
      .subscribe({
        next: (updated: any) => {
          this.zone.run(() => {
            const idx = this.orders.findIndex((o) => o._id === updated._id);
            if (idx !== -1) this.orders[idx] = updated;
            this.disputeToResolve = null;
            this.showToast(
              action === 'confirm'
                ? '✅ Commande marquée vendue'
                : '✅ Litige résolu'
            );
            this.cdr.detectChanges();
          });
        },
        error: (err) => alert(err.error?.message || 'Erreur'),
      });
  }

  // =========================================================
  // DÉTAIL MODALE
  // =========================================================
  openDetail(order: any): void {
    this.selectedOrder = order;
  }

  closeDetail(): void {
    this.selectedOrder = null;
  }

  // =========================================================
  // UPDATE STATUT
  // =========================================================
  private updateStatus(
    order: any,
    status: OrderStatus,
    extra?: { delivererName?: string; delivererPhone?: string }
  ): void {
    this.orderService.updateStatus(order._id, status, extra).subscribe({
      next: (updated: any) => {
        this.zone.run(() => {
          const idx = this.orders.findIndex((o) => o._id === updated._id);
          if (idx !== -1) this.orders[idx] = updated;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Erreur updateStatus:', err);
        alert(err.error?.message || 'Erreur lors du changement de statut');
      },
    });
  }

  // =========================================================
  // TOAST
  // =========================================================
  showToast(message: string): void {
    this.toastMessage = message;
    setTimeout(() => (this.toastMessage = ''), 3500);
  }

  // =========================================================
  // HELPERS TEMPLATE
  // =========================================================
  getOrderNumber(order: any): string {
    return order._id?.slice(-6).toUpperCase() || '------';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'En attente',
      accepted: 'Acceptée',
      preparing: 'En préparation',
      ready: 'Prête',
      delivering: 'En livraison',
      delivered: 'Livrée (à confirmer)',
      received: '✅ Vendue',
      cancelled: 'Annulée',
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: '#ffd93d',
      accepted: '#4ecdc4',
      preparing: '#ff6b6b',
      ready: '#6bcb77',
      delivering: '#c56bf1',
      delivered: '#4ecdc4',
      received: '#6bcb77',
      cancelled: '#ff4757',
    };
    return colors[status] || '#999';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      pending: 'bi-hourglass-split',
      accepted: 'bi-check-circle',
      preparing: 'bi-fire',
      ready: 'bi-bag-check',
      delivering: 'bi-truck',
      delivered: 'bi-exclamation-circle',
      received: 'bi-check2-all',
      cancelled: 'bi-x-circle',
    };
    return icons[status] || 'bi-clock';
  }

  getTimeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return "À l'instant";
    if (diff < 60) return `Il y a ${diff} min`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `Il y a ${h}h`;
    return `Il y a ${Math.floor(h / 24)}j`;
  }

  isUrgent(order: any): boolean {
    if (order.status !== 'pending') return false;
    const diff = Date.now() - new Date(order.createdAt).getTime();
    return diff > 5 * 60 * 1000;
  }

  isWaitingConfirmation(order: any): boolean {
    return order.status === 'delivered';
  }

  hasDispute(order: any): boolean {
    return !!(order.dispute?.reported && !order.dispute?.resolved);
  }

  isDisputeResolved(order: any): boolean {
    return !!(order.dispute?.reported && order.dispute?.resolved);
  }

  getProgressSteps(): string[] {
    return ['Reçue', 'Acceptée', 'Préparation', 'Prête', 'Livraison', 'Livrée'];
  }

  getProgressPercent(status: string): number {
    const steps = ['pending', 'accepted', 'preparing', 'ready', 'delivering', 'delivered'];
    const idx = steps.indexOf(status);
    if (status === 'received') return 100;
    if (idx < 0) return 0;
    return ((idx + 1) / steps.length) * 100;
  }

  isStepDone(stepIndex: number, currentStatus: string): boolean {
    if (currentStatus === 'received') return true;
    const steps = ['pending', 'accepted', 'preparing', 'ready', 'delivering', 'delivered'];
    return stepIndex < steps.indexOf(currentStatus);
  }

  isStepCurrent(stepIndex: number, currentStatus: string): boolean {
    if (currentStatus === 'received') return false;
    const steps = ['pending', 'accepted', 'preparing', 'ready', 'delivering', 'delivered'];
    return steps.indexOf(currentStatus) === stepIndex;
  }

  getSubtotal(order: any): number {
    return (order.items || []).reduce(
      (sum: number, i: any) => sum + i.price * i.quantity,
      0
    );
  }
}