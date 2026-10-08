import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';

import { OrderService } from '../core/services/order.service';
import { MessageService } from '../core/services/message.service';
import { RestaurantService } from '../core/services/restaurant.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-mes-commandes',
  standalone: true,
  imports: [CommonModule, RouterLink ,  FormsModule],
  templateUrl: './mes-commandes.html',
  styleUrl: './mes-commandes.css',
})
export class MesCommandes implements OnInit, OnDestroy {

  // =========================================================
  // DONNÉES
  // =========================================================
  orders: any[] = [];
  filter: 'all' | 'ongoing' | 'delivered' | 'received' | 'cancelled' = 'all';
  isLoading = true;
  contactingOrderId: string | null = null;
  showContactModal = false;
contactOrder: any = null;
contactMessage = '';
contactRestaurantName = '';
isSendingContact = false;
showToast = false;
toastMessage = '';
toastType: 'success' | 'error' = 'success';
private toastTimer?: any;

  private ordersSub?: Subscription;

  // =========================================================
// MODAL DE CONFIRMATION (remplace confirm())
// =========================================================
showConfirmModal = false;
confirmTitle = '';
confirmMessage = '';
confirmIcon = 'bi-question-circle';
confirmColor = '#ff6b6b';
confirmConfirmText = 'Confirmer';
confirmCancelText = 'Annuler';
private confirmCallback: (() => void) | null = null;

  constructor(
    private orderService: OrderService,
    private restaurantService: RestaurantService,   // ✅ AJOUT
    private messageService: MessageService,         // ✅ AJOUT
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}




  // =========================================================
// OUVRIR UN MODAL DE CONFIRMATION
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

// =========================================================
// FERMER SANS CONFIRMER
// =========================================================
closeConfirmModal(): void {
  this.showConfirmModal = false;
  this.confirmCallback = null;
  this.cdr.detectChanges();
}

// =========================================================
// CONFIRMER L'ACTION
// =========================================================
acceptConfirmModal(): void {
  const cb = this.confirmCallback;
  this.showConfirmModal = false;
  this.confirmCallback = null;
  this.cdr.detectChanges();

  if (cb) cb();
}
// =========================================================
// AFFICHER UN TOAST
// =========================================================
private displayToast(message: string, type: 'success' | 'error' = 'success'): void {
  // Annuler le timer précédent
  if (this.toastTimer) clearTimeout(this.toastTimer);

  this.zone.run(() => {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    this.cdr.detectChanges();

    this.toastTimer = setTimeout(() => {
      this.showToast = false;
      this.cdr.detectChanges();
    }, 3500);
  });
}


  // =========================================================
  // CYCLE DE VIE
  // =========================================================
  ngOnInit(): void {
    this.loadOrders();
    this.orderService.connectSocket();

    this.ordersSub = this.orderService.orders$.subscribe((live) => {
      if (!live.length) return;
      this.zone.run(() => {
        this.orders = live;
        this.isLoading = false;
        this.cdr.detectChanges();
      });
    });
  }

  ngOnDestroy(): void {
    this.ordersSub?.unsubscribe();
    this.orderService.disconnectSocket();
    if (this.toastTimer) clearTimeout(this.toastTimer); 
  }
  

  // =========================================================
// CONFIRMER LIVRAISON + PAIEMENT (directement depuis "delivering")
// =========================================================
// =========================================================
// CONFIRMER LIVRAISON + PAIEMENT
// =========================================================
confirmDeliveredAndPaid(order: any): void {
  const isDelivering = order.status === 'delivering';

  this.openConfirm({
    title: isDelivering
      ? 'Le livreur est arrivé ?'
      : 'Commande reçue ?',
    message: isDelivering
      ? 'Confirmez-vous que le livreur est arrivé ET que vous avez payé ? Une fois confirmé, la commande sera marquée comme vendue.'
      : 'Confirmez-vous avoir reçu la commande ET payé le livreur ?',
    icon: 'bi-check-circle-fill',
    color: '#6bcb77',
    confirmText: 'Oui, j\'ai payé',
    cancelText: 'Pas encore',
    onConfirm: () => {
      this.http
        .post(`http://localhost:3000/api/orders/${order._id}/confirm-received`, {})
        .subscribe({
          next: (updated: any) => {
            this.zone.run(() => {
              const idx = this.orders.findIndex((o) => o._id === updated._id);
              if (idx !== -1) this.orders[idx] = updated;

              this.displayToast('✅ Commande reçue et payée — merci !', 'success');
              this.cdr.detectChanges();
            });
          },
          error: (err) => {
            this.displayToast(
              err.error?.message || '❌ Erreur lors de la confirmation',
              'error'
            );
          },
        });
    },
  });
}
  // =========================================================
  // CHARGEMENT
  // =========================================================
  loadOrders(): void {
    this.orderService.getMyOrders().subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.orders = data || [];
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

  // =========================================================
  // FILTRES
  // =========================================================
  setFilter(f: typeof this.filter): void {
    this.filter = f;
  }

  get filteredOrders(): any[] {
    if (this.filter === 'all') return this.orders;

    if (this.filter === 'ongoing') {
      return this.orders.filter((o) =>
        ['pending', 'accepted', 'preparing', 'ready', 'delivering'].includes(o.status)
      );
    }

    if (this.filter === 'delivered') {
      return this.orders.filter((o) => o.status === 'delivered');
    }

    if (this.filter === 'received') {
      return this.orders.filter((o) => o.status === 'received');
    }

    if (this.filter === 'cancelled') {
      return this.orders.filter((o) => o.status === 'cancelled');
    }

    return this.orders;
  }

  // Compteurs badges
  get ongoingCount(): number {
    return this.orders.filter((o) =>
      ['pending', 'accepted', 'preparing', 'ready', 'delivering'].includes(o.status)
    ).length;
  }

  get deliveredCount(): number {
    return this.orders.filter((o) => o.status === 'delivered').length;
  }

  get receivedCount(): number {
    return this.orders.filter((o) => o.status === 'received').length;
  }

  // =========================================================
  // CONTACTER LE RESTAURANT
  // =========================================================
  // =========================================================
// CONTACTER LE RESTAURANT — envoi direct
// =========================================================
// =========================================================
// OUVRIR LE MODAL CONTACT
// =========================================================
contactRestaurant(order: any): void {
  const restaurant = order.restaurantId;
  const restaurantId = typeof restaurant === 'object' ? restaurant?._id : restaurant;

  if (!restaurantId) {
    alert('Restaurant introuvable dans cette commande');
    return;
  }

  // Pré-remplir le message selon le statut
  const orderNumber = order._id.slice(-6).toUpperCase();
  let defaultMessage = '';

  switch (order.status) {
    case 'pending':
      defaultMessage = `Bonjour, je viens de passer la commande #${orderNumber}. Pouvez-vous me confirmer la prise en charge ?`;
      break;
    case 'accepted':
      defaultMessage = `Bonjour, ma commande #${orderNumber} a bien été acceptée. Quand sera-t-elle prête ?`;
      break;
    case 'preparing':
      defaultMessage = `Bonjour, où en est la préparation de ma commande #${orderNumber} ?`;
      break;
    case 'ready':
      defaultMessage = `Bonjour, ma commande #${orderNumber} est prête. Le livreur est-il en route ?`;
      break;
    case 'delivering':
      defaultMessage = `Bonjour, où en est le livreur pour ma commande #${orderNumber} ?`;
      break;
    case 'delivered':
      defaultMessage = `Bonjour, ma commande #${orderNumber} est marquée livrée. Je souhaite vérifier quelque chose.`;
      break;
    default:
      defaultMessage = `Bonjour, j'ai une question sur ma commande #${orderNumber}.`;
  }

  // Ouvrir le modal
  this.contactOrder = order;
  this.contactRestaurantName = restaurant?.name || 'Restaurant';
  this.contactMessage = defaultMessage;
  this.showContactModal = true;
  this.isSendingContact = false;
  this.cdr.detectChanges();
}

// =========================================================
// FERMER LE MODAL
// =========================================================
closeContactModal(): void {
  this.showContactModal = false;
  this.contactOrder = null;
  this.contactMessage = '';
  this.isSendingContact = false;
  this.cdr.detectChanges();
}

// =========================================================
// ENVOYER LE MESSAGE
// =========================================================
sendContactMessage(): void {
  if (!this.contactMessage.trim() || !this.contactOrder || this.isSendingContact) return;

  const order = this.contactOrder;
  const restaurant = order.restaurantId;
  const restaurantId = typeof restaurant === 'object' ? restaurant?._id : restaurant;
  const content = this.contactMessage.trim();

  this.isSendingContact = true;
  this.cdr.detectChanges();

  this.restaurantService.getOwner(String(restaurantId)).subscribe({
    next: (owner) => {
      this.messageService.send(owner.userId, content).subscribe({
        next: () => {
          this.zone.run(() => {
            // Fermer le modal
            this.showContactModal = false;
            this.isSendingContact = false;

            // ✅ Afficher le toast de succès
            this.displayToast(
              `✅ Message envoyé à ${owner.name || restaurant?.name || 'Restaurant'}`,
              'success'
            );

            // Ouvrir le panel messages
            this.messageService.requestOpenConversation({
              userId: owner.userId,
              name: owner.name || restaurant?.name || 'Restaurant',
              avatar: owner.avatar || restaurant?.logo || '',
              role: 'restaurant',
            });

            this.contactOrder = null;
            this.contactMessage = '';
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          console.error('Erreur envoi:', err);
          this.zone.run(() => {
            this.isSendingContact = false;

            // ✅ Afficher le toast d'erreur
            this.displayToast(
              err.error?.message || '❌ Impossible d\'envoyer le message',
              'error'
            );

            this.cdr.detectChanges();
          });
        },
      });
    },
    error: (err) => {
      console.error('Erreur owner:', err);
      this.zone.run(() => {
        this.isSendingContact = false;
        this.displayToast('❌ Impossible de contacter le restaurant', 'error');
        this.cdr.detectChanges();
      });
    },
  });
}
// =========================================================
// AUTO-RESIZE du textarea (optionnel)
// =========================================================
onContactInput(event: Event): void {
  const textarea = event.target as HTMLTextAreaElement;
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
}
  // =========================================================
  // CONFIRMATION CLIENT — J'ai reçu + payé
  // =========================================================
  confirmReceived(order: any): void {
    if (!confirm('Confirmez-vous avoir reçu cette commande ET payé le livreur ?')) {
      return;
    }

    this.http
      .post(`http://localhost:3000/api/orders/${order._id}/confirm-received`, {})
      .subscribe({
        next: (updated: any) => {
          this.zone.run(() => {
            const idx = this.orders.findIndex((o) => o._id === updated._id);
            if (idx !== -1) this.orders[idx] = updated;
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          alert(err.error?.message || 'Erreur lors de la confirmation');
        },
      });
  }

  // =========================================================
  // SIGNALEMENT — Je n'ai PAS reçu
  // =========================================================
 // =========================================================
// SIGNALER NON REÇU (utilise le prompt natif mais avec toast)
// =========================================================
reportNotReceived(order: any): void {
  this.openConfirm({
    title: 'Signaler un problème',
    message: 'Vous n\'avez pas reçu cette commande ? Le restaurant sera immédiatement notifié et vous serez contacté.',
    icon: 'bi-exclamation-triangle-fill',
    color: '#ffd93d',
    confirmText: 'Signaler',
    cancelText: 'Annuler',
    onConfirm: () => {
      // Petit prompt pour la raison (à remplacer plus tard par un modal)
      const reason = prompt('Décrivez brièvement le problème :', '');

      if (reason === null) return;

      this.http
        .post(`http://localhost:3000/api/orders/${order._id}/report-not-received`, {
          reason: reason.trim() || 'Client déclare ne pas avoir reçu la commande',
        })
        .subscribe({
          next: (updated: any) => {
            this.zone.run(() => {
              const idx = this.orders.findIndex((o) => o._id === updated._id);
              if (idx !== -1) this.orders[idx] = updated;

              this.displayToast('⚠️ Signalement envoyé au restaurant', 'success');
              this.cdr.detectChanges();
            });
          },
          error: (err) => {
            this.displayToast(
              err.error?.message || '❌ Erreur lors du signalement',
              'error'
            );
          },
        });
    },
  });
}
  // =========================================================
  // HELPERS TEMPLATE
  // =========================================================
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'En attente',
      accepted: 'Acceptée',
      preparing: 'En préparation',
      ready: 'Prête',
      delivering: 'En livraison',
      delivered: 'À confirmer',
      received: 'Reçue & payée',
      cancelled: 'Annulée',
    };
    return labels[status] || status;
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      pending: 'bi-hourglass',
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

  getProgressWidth(status: string): string {
    const steps = ['pending', 'accepted', 'preparing', 'ready', 'delivering', 'delivered'];
    const idx = steps.indexOf(status);
    return idx < 0 ? '0%' : `${((idx + 1) / steps.length) * 100}%`;
  }

  getRestaurantName(order: any): string {
    return order.restaurantId?.name || 'Restaurant';
  }

  canReview(order: any): boolean {
    return order.status === 'received' && !order.rating;
  }

  hasDispute(order: any): boolean {
    return !!(order.dispute?.reported && !order.dispute?.resolved);
  }

  isDisputeResolved(order: any): boolean {
    return !!(order.dispute?.reported && order.dispute?.resolved);
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
}