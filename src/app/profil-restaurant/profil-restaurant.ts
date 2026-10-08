import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  ChangeDetectorRef,
  NgZone,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';       // ✅ AJOUT

import { RestaurantService } from '../core/services/restaurant.service';
import { UploadService } from '../core/services/upload';
import { AvatarService } from '../core/services/avatar';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment.prod';

// =========================================================
// TYPES
// =========================================================

export type DayKey = 'lun' | 'mar' | 'mer' | 'jeu' | 'ven' | 'sam' | 'dim';

export interface OpeningHour {
  day: DayKey;
  label: string;
  open: string;
  close: string;
  isOpen: boolean;
}

export interface RestaurantProfile {
  name: string;
  type: string;
  description: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  postalCode: string;
  logo: string;
  coverImage: string;
  deliveryFee: number;
  minOrder: number;
  deliveryRadius: number;
  avgPrepTime: number;
  acceptOnlineOrders: boolean;
  autoAcceptOrders: boolean;
  allowReservations: boolean;
  openingHours: OpeningHour[];
  cuisineTypes: string[];
  paymentMethods: string[];
}

export interface NotificationPreferences {
  newOrders: boolean;
  newReviews: boolean;
  promotions: boolean;
  newsletter: boolean;
  smsAlerts: boolean;
  emailAlerts: boolean;
}

// =========================================================
// COMPOSANT
// =========================================================

@Component({
  selector: 'app-profil-restaurant',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './profil-restaurant.html',
  styleUrl: './profil-restaurant.css',
})
export class ProfilRestaurant implements OnInit {

  // =========================================================
  // ÉTAT GÉNÉRAL
  // =========================================================
  activeTab: 'infos' | 'horaires' | 'livraison' | 'notifications' = 'infos';

  profile: RestaurantProfile = this.createEmptyProfile();

  notifications: NotificationPreferences = {
    newOrders: true,
    newReviews: true,
    promotions: false,
    newsletter: true,
    smsAlerts: true,
    emailAlerts: true,
  };

  // =========================================================
  // OPTIONS
  // =========================================================
  cuisineOptions = [
    { value: 'fast-food',  label: 'Fast Food' },
    { value: 'italienne',  label: 'Italienne' },
    { value: 'japonaise',  label: 'Japonaise' },
    { value: 'francaise',  label: 'Française' },
    { value: 'asiatique',  label: 'Asiatique' },
    { value: 'americaine', label: 'Américaine' },
    { value: 'vegetarien', label: 'Végétarien' },
    { value: 'malgache',   label: 'Malgache' },
  ];

  paymentOptions = [
    { value: 'card',   label: 'Carte bancaire' },
    { value: 'cash',   label: 'Espèces' },
    { value: 'mobile', label: 'Mobile Money' },
  ];

  // =========================================================
  // ÉTAT UI
  // =========================================================
  isLoading = true;
  isSaving = false;
  isUploadingLogo = false;
  isUploadingCover = false;
  showSuccessToast = false;
  successMessage = '';

  // =========================================================
  // MODAL CHANGEMENT D'EMAIL
  // =========================================================
  showEmailModal = false;
  emailNew = '';
  emailPassword = '';
  emailError = '';
  isChangingEmail = false;

  // =========================================================
  // VIEWCHILD
  // =========================================================
  @ViewChild('coverInput') coverInput!: ElementRef<HTMLInputElement>;
  @ViewChild('logoInput') logoInput!: ElementRef<HTMLInputElement>;

  // =========================================================
  // API
  // =========================================================
  private readonly api = `${environment.apiUrl}/auth`;   // ✅ AJOUT

  constructor(
    private restaurantService: RestaurantService,
    public uploadService: UploadService,
    public avatarService: AvatarService,
    private auth: AuthService,
    private http: HttpClient,                                // ✅ AJOUT
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  // =========================================================
  // CYCLE DE VIE
  // =========================================================
  ngOnInit(): void {
    this.loadProfile();
  }

  // =========================================================
  // CHARGEMENT DEPUIS LA BASE
  // =========================================================
  private loadProfile(): void {
    this.restaurantService.getMyProfile().subscribe({
      next: (r) => {
        this.zone.run(() => {
          const user = this.auth.getUser();

          this.profile = {
            name: r.name || '',
            type: r.type || '',
            description: r.description || '',
            email: user?.email || '',
            phone: r.phone || '',
            website: r.website || '',
            address: r.address || '',
            city: r.city || '',
            postalCode: r.postalCode || '',

            // Images
            logo: r.logo || '',
            coverImage: r.coverImage || '',

            // Livraison
            deliveryFee: r.deliveryFee ?? 1500,
            minOrder: r.minOrder ?? 5000,
            deliveryRadius: r.deliveryRadiusKm ?? 5,
            avgPrepTime: r.avgPrepTime ?? 20,

            // Options
            acceptOnlineOrders: r.acceptOnlineOrders !== false,
            autoAcceptOrders: r.autoAcceptOrders === true,
            allowReservations: r.allowReservations === true,

            // Depuis la base
            openingHours:
              r.openingHours?.length > 0
                ? r.openingHours
                : this.defaultOpeningHours(),
            cuisineTypes: r.cuisineTypes || [],
            paymentMethods: r.paymentMethods || [],
          };

          // Préférences de notifications
          if (r.notificationPreferences) {
            this.notifications = {
              newOrders: r.notificationPreferences.newOrders !== false,
              newReviews: r.notificationPreferences.newReviews !== false,
              promotions: r.notificationPreferences.promotions === true,
              newsletter: r.notificationPreferences.newsletter !== false,
              smsAlerts: r.notificationPreferences.smsAlerts !== false,
              emailAlerts: r.notificationPreferences.emailAlerts !== false,
            };
          }

          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Erreur chargement profil:', err);
        this.zone.run(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
    });
  }

  // =========================================================
  // ONGLETS
  // =========================================================
  setTab(tab: typeof this.activeTab): void {
    this.activeTab = tab;
  }

  // =========================================================
  // PICKERS (upload)
  // =========================================================
  openCoverPicker(): void {
    if (this.isUploadingCover) return;
    this.coverInput?.nativeElement?.click();
  }

  openLogoPicker(): void {
    if (this.isUploadingLogo) return;
    this.logoInput?.nativeElement?.click();
  }

  // =========================================================
  // MODAL EMAIL
  // =========================================================
  openEmailModal(): void {
    this.showEmailModal = true;
    this.emailNew = this.profile.email;
    this.emailPassword = '';
    this.emailError = '';
    this.cdr.detectChanges();
  }

  closeEmailModal(): void {
    this.showEmailModal = false;
    this.emailNew = '';
    this.emailPassword = '';
    this.emailError = '';
    this.cdr.detectChanges();
  }

  submitEmailChange(): void {
    this.emailError = '';

    // Validations
    if (!this.emailNew.trim() || !this.emailNew.includes('@')) {
      this.emailError = 'Email invalide';
      return;
    }

    if (this.emailNew.trim().toLowerCase() === this.profile.email.toLowerCase()) {
      this.emailError = 'C\'est déjà votre email actuel';
      return;
    }

    if (!this.emailPassword) {
      this.emailError = 'Mot de passe requis';
      return;
    }

    this.isChangingEmail = true;
    this.cdr.detectChanges();

    this.http.post<any>(`${this.api}/me/change-email`, {
      newEmail: this.emailNew.trim().toLowerCase(),
      password: this.emailPassword,
    }).subscribe({
      next: (res) => {
        this.zone.run(() => {
          // 1. Mettre à jour le profil
          this.profile.email = res.user.email;

          // 2. Mettre à jour localStorage
          if (res.token) {
            localStorage.setItem('token', res.token);
          }
          if (res.user) {
            localStorage.setItem('user', JSON.stringify(res.user));

            // ✅ Notifier l'AuthService
            if (typeof (this.auth as any).updateCurrentUser === 'function') {
              (this.auth as any).updateCurrentUser(res.user);
            }
          }

          this.isChangingEmail = false;
          this.showEmailModal = false;
          this.emailPassword = '';
          this.emailNew = '';

          this.showToast('✅ Email modifié avec succès');
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.isChangingEmail = false;
          this.emailError = err.error?.message || 'Erreur lors du changement d\'email';
          this.cdr.detectChanges();
        });
      },
    });
  }

  // =========================================================
  // UPLOAD LOGO
  // =========================================================
  onLogoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.[0]) return;

    const file = input.files[0];

    if (file.size > 5 * 1024 * 1024) {
      this.showToast('L\'image ne doit pas dépasser 5 MB');
      input.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.showToast('Seules les images sont autorisées');
      input.value = '';
      return;
    }

    this.isUploadingLogo = true;
    this.cdr.detectChanges();

    this.uploadService.uploadRestaurantLogo(file).subscribe({
      next: (res) => {
        this.zone.run(() => {
          this.profile.logo = res.url;

          const user = this.auth.getUser();
          if (user) {
            user.avatar = res.url;
            localStorage.setItem('user', JSON.stringify(user));
          }

          this.isUploadingLogo = false;
          input.value = '';
          this.showToast('✅ Logo mis à jour');
          this.cdr.detectChanges();

          window.dispatchEvent(new Event('storage'));
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.isUploadingLogo = false;
          input.value = '';
          this.showToast(err.error?.message || 'Erreur upload logo');
          this.cdr.detectChanges();
        });
      },
    });
  }

  // =========================================================
  // UPLOAD COVER
  // =========================================================
  onCoverChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.[0]) return;

    const file = input.files[0];

    if (file.size > 5 * 1024 * 1024) {
      this.showToast('L\'image ne doit pas dépasser 5 MB');
      input.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.showToast('Seules les images sont autorisées');
      input.value = '';
      return;
    }

    this.isUploadingCover = true;
    this.cdr.detectChanges();

    this.uploadService.uploadRestaurantCover(file).subscribe({
      next: (res) => {
        this.zone.run(() => {
          this.profile.coverImage = res.url;
          this.isUploadingCover = false;
          input.value = '';
          this.showToast('✅ Bannière mise à jour');
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.isUploadingCover = false;
          input.value = '';
          this.showToast(err.error?.message || 'Erreur upload bannière');
          this.cdr.detectChanges();
        });
      },
    });
  }

  // =========================================================
  // SAUVEGARDER LE PROFIL
  // =========================================================
  saveProfile(): void {
    if (!this.profile.name.trim()) {
      this.showToast('Le nom du restaurant est obligatoire');
      return;
    }

    this.isSaving = true;
    this.cdr.detectChanges();

    const payload = {
      name: this.profile.name,
      type: this.profile.type,
      description: this.profile.description,
      phone: this.profile.phone,
      website: this.profile.website,
      address: this.profile.address,
      city: this.profile.city,
      postalCode: this.profile.postalCode,
      logo: this.profile.logo,
      coverImage: this.profile.coverImage,
      deliveryFee: this.profile.deliveryFee,
      minOrder: this.profile.minOrder,
      deliveryRadiusKm: this.profile.deliveryRadius,
      avgPrepTime: this.profile.avgPrepTime,
      acceptOnlineOrders: this.profile.acceptOnlineOrders,
      autoAcceptOrders: this.profile.autoAcceptOrders,
      allowReservations: this.profile.allowReservations,
      openingHours: this.profile.openingHours,
      cuisineTypes: this.profile.cuisineTypes,
      paymentMethods: this.profile.paymentMethods,
      notificationPreferences: this.notifications,
    };

    this.restaurantService.updateMyProfile(payload).subscribe({
      next: () => {
        this.zone.run(() => {
          this.isSaving = false;
          this.showToast('✅ Profil enregistré');
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.isSaving = false;
          this.showToast(err.error?.message || 'Erreur');
          this.cdr.detectChanges();
        });
      },
    });
  }

  // =========================================================
  // RESET
  // =========================================================
  resetProfile(): void {
    if (!confirm('Réinitialiser tous les changements ?')) return;
    this.loadProfile();
  }

  // =========================================================
  // CUISINES / PAIEMENTS / HORAIRES / NOTIFICATIONS
  // =========================================================
  toggleCuisine(value: string): void {
    const i = this.profile.cuisineTypes.indexOf(value);
    if (i === -1) this.profile.cuisineTypes.push(value);
    else this.profile.cuisineTypes.splice(i, 1);
  }

  isCuisineSelected(value: string): boolean {
    return this.profile.cuisineTypes.includes(value);
  }

  togglePayment(value: string): void {
    const i = this.profile.paymentMethods.indexOf(value);
    if (i === -1) this.profile.paymentMethods.push(value);
    else this.profile.paymentMethods.splice(i, 1);
  }

  isPaymentSelected(value: string): boolean {
    return this.profile.paymentMethods.includes(value);
  }

  toggleOpeningDay(hour: OpeningHour): void {
    hour.isOpen = !hour.isOpen;
  }

  toggleNotification(key: keyof NotificationPreferences): void {
    this.notifications[key] = !this.notifications[key];
  }

  // =========================================================
  // HELPERS
  // =========================================================
  getCoverUrl(): string {
    return this.uploadService.getImageUrl(this.profile.coverImage);
  }

  getLogoUrl(): string {
    return this.uploadService.getImageUrl(this.profile.logo);
  }

  hasLogo(): boolean {
    return this.uploadService.hasImage(this.profile.logo);
  }

  hasCover(): boolean {
    return this.uploadService.hasImage(this.profile.coverImage);
  }

  getInitials(): string {
    return this.avatarService.getInitials(this.profile.name);
  }

  getGradient(): string {
    return this.avatarService.getGradient(this.profile.name);
  }

  getOpenDaysCount(): number {
    return this.profile.openingHours.filter((h) => h.isOpen).length;
  }

  private showToast(message: string): void {
    this.zone.run(() => {
      this.successMessage = message;
      this.showSuccessToast = true;
      this.cdr.detectChanges();

      setTimeout(() => {
        this.showSuccessToast = false;
        this.cdr.detectChanges();
      }, 3000);
    });
  }

  private createEmptyProfile(): RestaurantProfile {
    return {
      name: '',
      type: '',
      description: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      city: '',
      postalCode: '',
      logo: '',
      coverImage: '',
      deliveryFee: 1500,
      minOrder: 5000,
      deliveryRadius: 5,
      avgPrepTime: 20,
      acceptOnlineOrders: true,
      autoAcceptOrders: false,
      allowReservations: true,
      openingHours: this.defaultOpeningHours(),
      cuisineTypes: [],
      paymentMethods: [],
    };
  }

  private defaultOpeningHours(): OpeningHour[] {
    return [
      { day: 'lun', label: 'Lundi',    open: '10:00', close: '22:00', isOpen: true },
      { day: 'mar', label: 'Mardi',    open: '10:00', close: '22:00', isOpen: true },
      { day: 'mer', label: 'Mercredi', open: '10:00', close: '22:00', isOpen: true },
      { day: 'jeu', label: 'Jeudi',    open: '10:00', close: '22:00', isOpen: true },
      { day: 'ven', label: 'Vendredi', open: '10:00', close: '23:30', isOpen: true },
      { day: 'sam', label: 'Samedi',   open: '10:00', close: '23:30', isOpen: true },
      { day: 'dim', label: 'Dimanche', open: '11:00', close: '21:00', isOpen: false },
    ];
  }
}