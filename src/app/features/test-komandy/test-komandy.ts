import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-test-komandy',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './test-komandy.html',
})
export class TestKomandy implements OnInit, OnDestroy {
  email = 'client@test.mg';
  password = 'test123';

  currentUser: any = null;
  orders: any[] = [];
  logs: string[] = [];

  restaurantId = '6ab999ead71d84f07dd7594d';
  items = [{ name: 'Burger Classique', price: 12000, quantity: 2 }];

  private ordersSub?: Subscription;

  constructor(
    public auth: AuthService,
    public orderService: OrderService,
    private cdr: ChangeDetectorRef,       // ✅
    private zone: NgZone                  // ✅
  ) {}

  ngOnInit(): void {
    this.currentUser = this.auth.getUser();
    if (this.currentUser) {
      this.loadOrders();
      this.orderService.connectSocket();
    }

    this.ordersSub = this.orderService.orders$.subscribe((live) => {
      if (live.length) {
        this.log('📥 Mise à jour temps réel (' + live.length + ' commandes)');
        this.orders = live;
        this.cdr.detectChanges();         // ✅ force le refresh
      }
    });
  }

  ngOnDestroy(): void {
    this.ordersSub?.unsubscribe();
    this.orderService.disconnectSocket();
  }

  // ---------------------------------------------------------
  // Login
  // ---------------------------------------------------------
  onLogin(): void {
    this.log('🔐 Tentative de connexion...');

    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        this.zone.run(() => {              // ✅ dans la zone Angular
          this.currentUser = res.user;
          this.log('✅ Connecté : ' + res.user.name + ' (' + res.user.role + ')');
          this.loadOrders();
          this.orderService.connectSocket();
          this.cdr.detectChanges();        // ✅ refresh immédiat
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.log('❌ Erreur login : ' + (err.error?.message || err.message));
          this.cdr.detectChanges();
        });
      },
    });
  }

  onLogout(): void {
    this.auth.logout();
    this.currentUser = null;
    this.orders = [];
    this.orderService.disconnectSocket();
    this.log('👋 Déconnecté');
    this.cdr.detectChanges();              // ✅
  }

  // ---------------------------------------------------------
  // Commandes
  // ---------------------------------------------------------
  loadOrders(): void {
    const role = this.currentUser?.role;

    if (role === 'client') {
      this.orderService.getMyOrders().subscribe({
        next: (orders) => {
          this.zone.run(() => {
            this.orders = orders;
            this.log('📦 ' + orders.length + ' commande(s) chargée(s)');
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.zone.run(() => {
            this.log('❌ Erreur chargement : ' + err.message);
            this.cdr.detectChanges();
          });
        },
      });
    } else if (role === 'restaurant') {
      this.orderService.getReceivedOrders().subscribe({
        next: (orders) => {
          this.zone.run(() => {
            this.orders = orders;
            this.log('📦 ' + orders.length + ' commande(s) reçue(s)');
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.zone.run(() => {
            this.log('❌ Erreur chargement : ' + err.message);
            this.cdr.detectChanges();
          });
        },
      });
    }
  }

  // ---------------------------------------------------------
  // Client : créer une commande
  // ---------------------------------------------------------
  onCreateOrder(): void {
    const payload = {
      restaurantId: this.restaurantId,
      items: this.items.map((i) => ({
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
      deliveryAddress: {
        label: 'Maison',
        address: '45 Avenue de l\'Indépendance',
        city: 'Antananarivo',
        postalCode: '101',
        phone: '+261348765432',
      },
    };

    this.log('📤 Création de la commande...');

    this.orderService.createOrder(payload).subscribe({
      next: (order: any) => {
        this.zone.run(() => {
          this.log('✅ Commande créée : ' + order._id.slice(-6).toUpperCase() +
                   ' (' + order.total + ' Ar)');
          this.orders = [order, ...this.orders];
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.log('❌ Erreur commande : ' + (err.error?.message || err.message));
          this.cdr.detectChanges();
        });
      },
    });
  }

  // ---------------------------------------------------------
  // Restaurant : changer le statut
  // ---------------------------------------------------------
  onUpdateStatus(order: any, status: string): void {
    const extra = status === 'delivering'
      ? { delivererName: 'Rakoto', delivererPhone: '+261341111111' }
      : {};

    this.log('🔄 Statut → ' + status);

    this.orderService.updateStatus(order._id, status as any, extra).subscribe({
      next: (updated: any) => {
        this.zone.run(() => {
          this.log('✅ Nouveau statut : ' + updated.status);
          const idx = this.orders.findIndex((o) => o._id === updated._id);
          if (idx !== -1) this.orders[idx] = updated;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.log('❌ Erreur statut : ' + (err.error?.message || err.message));
          this.cdr.detectChanges();
        });
      },
    });
  }

  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------
  private log(msg: string): void {
    const time = new Date().toLocaleTimeString();
    this.logs.unshift(`[${time}] ${msg}`);
    if (this.logs.length > 50) this.logs.pop();
  }

  clearLogs(): void {
    this.logs = [];
  }

  getStatusLabel(status: string): string {
    const labels: any = {
      pending: 'En attente',
      accepted: 'Acceptée',
      preparing: 'En préparation',
      ready: 'Prête',
      delivering: 'En livraison',
      delivered: 'Livrée',
      cancelled: 'Annulée',
    };
    return labels[status] || status;
  }
}