import { CommonModule } from '@angular/common';
import {
  Component,
  Inject,
  OnInit,
  ChangeDetectorRef,
  NgZone,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { AuthService } from '../core/services/auth.service';
import { UploadService } from '../core/services/upload';
import { AvatarService } from '../core/services/avatar';
import { environment } from '../../environments/environment.prod';

// =========================================================
// TYPES
// =========================================================

export interface ClientAddress {
  id: string;
  label: string;
  address: string;
  city: string;
  postalCode: string;
  isDefault: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'mobile' | 'cash';
  label: string;
  details: string;
  isDefault: boolean;
}

export interface ClientProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  gender: 'homme' | 'femme' | 'autre' | '';
  avatar: string;
  coverImage: string;
  bio: string;
  addresses: ClientAddress[];
  paymentMethods: PaymentMethod[];
  preferredCuisines: string[];
  dietaryRestrictions: string[];
}

export interface NotificationPreferences {
  orderUpdates: boolean;
  promotions: boolean;
  newRestaurants: boolean;
  newsletter: boolean;
  smsAlerts: boolean;
  emailAlerts: boolean;
}

// =========================================================
// COMPOSANT
// =========================================================

@Component({
  selector: 'app-profil-client',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './profil-client.html',
  styleUrl: './profil-client.css',
})
export class ProfilClient implements OnInit {

  activeTab: 'infos' | 'adresses' | 'paiement' | 'notifications' = 'infos';

  // --- Profil (vide, rempli depuis la base) ---
  profile: ClientProfile = this.createEmptyProfile();

  notifications: NotificationPreferences = {
    orderUpdates: true,
    promotions: true,
    newRestaurants: false,
    newsletter: true,
    smsAlerts: true,
    emailAlerts: true,
  };


showEmailModal = false;
emailNew = '';
emailPassword = '';
emailError = '';
isChangingEmail = false;

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

// =========================================================
// VALIDER LE CHANGEMENT D'EMAIL
// =========================================================
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

  const payload = {
    newEmail: this.emailNew.trim().toLowerCase(),
    password: this.emailPassword,
  };

  console.log('📤 Envoi change-email:', payload);

  this.http.post<any>(`${this.api}/me/change-email`, payload).subscribe({
    next: (res) => {
      console.log('✅ Réponse backend:', res);

      this.zone.run(() => {
        // 1. Mettre à jour le profil
        if (res.user?.email) {
          this.profile.email = res.user.email;
        }

        // 2. Mettre à jour le token
        if (res.token) {
          localStorage.setItem('token', res.token);
        }

        // 3. Mettre à jour le user dans localStorage
        if (res.user) {
          localStorage.setItem('user', JSON.stringify(res.user));

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
      console.error('❌ Erreur change-email:', err);
      this.zone.run(() => {
        this.isChangingEmail = false;
        this.emailError = err.error?.message || 'Erreur lors du changement d\'email';
        this.cdr.detectChanges();
      });
    },
  });
}

  cuisineOptions = [
    { value: 'malgache',     label: 'Malgache' },
    { value: 'fast-food',    label: 'Fast Food' },
    { value: 'italienne',    label: 'Italienne' },
    { value: 'japonaise',    label: 'Japonaise' },
    { value: 'chinoise',     label: 'Chinoise' },
    { value: 'francaise',    label: 'Française' },
    { value: 'indienne',     label: 'Indienne' },
    { value: 'vegetarienne', label: 'Végétarienne' },
  ];

  dietaryOptions = [
    { value: 'aucune',      label: 'Aucune restriction' },
    { value: 'vegetarien',  label: 'Végétarien' },
    { value: 'vegan',       label: 'Vegan' },
    { value: 'halal',       label: 'Halal' },
    { value: 'sans-gluten', label: 'Sans gluten' },
    { value: 'sans-lactose',label: 'Sans lactose' },
    { value: 'allergies',   label: 'Allergies alimentaires' },
  ];

  // --- État UI ---
  isLoading = true;
  isSaving = false;
  isUploadingAvatar = false;
  isUploadingCover = false;
  showSuccessToast = false;
  successMessage = '';
  showAddressForm = false;
  editingAddressId: string | null = null;
  newAddress: ClientAddress = this.createEmptyAddress();

  // --- ViewChild pour uploads ---
  @ViewChild('avatarInput') avatarInput!: ElementRef<HTMLInputElement>;
  @ViewChild('coverInput') coverInput!: ElementRef<HTMLInputElement>;

  private readonly api = `${environment.apiUrl}/auth`;

  constructor(
    private auth: AuthService,
    public uploadService: UploadService,
    public avatarService: AvatarService,
    private http: HttpClient,
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
  // CHARGEMENT PROFIL (depuis la base)
  // =========================================================
  private loadProfile(): void {
    this.http.get<any>(`${this.api}/me/client`).subscribe({
      next: (data) => {
        this.zone.run(() => {
          const fullName = data.name || '';
          const [firstName, ...rest] = fullName.split(' ');
          const lastName = rest.join(' ');

         this.profile = {
  firstName: firstName || '',
  lastName: lastName || '',
  email: data.email || '',
  phone: data.phone || '',
  birthDate: data.birthDate || '',
  gender: (data.gender as any) || '',
  avatar: data.avatar || '',
  coverImage: data.coverImage || '',
  bio: data.bio || '',
  addresses: (data.addresses || []).map((a: any, i: number) => ({
    id: a._id || a.id || `addr-${i}`,
    label: a.label || 'Maison',
    address: a.address || '',
    city: a.city || '',
    postalCode: a.postalCode || '',
    isDefault: !!a.isDefault,
  })),
  paymentMethods: [],
  preferredCuisines: data.preferredCuisines || [],           // ✅
  dietaryRestrictions: data.dietaryRestrictions || ['aucune'], // ✅
};

// ✅ Charger les notifications
if (data.notificationPreferences) {
  this.notifications = {
    orderUpdates: data.notificationPreferences.orderUpdates !== false,
    promotions: data.notificationPreferences.promotions !== false,
    newRestaurants: data.notificationPreferences.newRestaurants === true,
    newsletter: data.notificationPreferences.newsletter !== false,
    smsAlerts: data.notificationPreferences.smsAlerts !== false,
    emailAlerts: data.notificationPreferences.emailAlerts !== false,
  };
}
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.warn('Erreur chargement profil:', err);
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
  // UPLOAD AVATAR (clic direct)
  // =========================================================
  openAvatarPicker(): void {
    if (this.isUploadingAvatar) return;
    this.avatarInput?.nativeElement?.click();
  }

  onAvatarChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.[0]) return;

    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      this.showToast('L\'image ne doit pas dépasser 5 MB');
      input.value = '';
      return;
    }

    this.isUploadingAvatar = true;

    this.uploadService.uploadAvatar(file).subscribe({
      next: (res) => {
        this.zone.run(() => {
          this.profile.avatar = res.avatar;
          this.isUploadingAvatar = false;
          input.value = '';

          // Mettre à jour localStorage
          const user = this.auth.getUser();
          if (user) {
            user.avatar = res.avatar;
            localStorage.setItem('user', JSON.stringify(user));
          }

          this.showToast('✅ Photo de profil mise à jour');
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.isUploadingAvatar = false;
          input.value = '';
          this.showToast(err.error?.message || 'Erreur upload');
          this.cdr.detectChanges();
        });
      },
    });
  }

  // =========================================================
  // UPLOAD COVER
  // =========================================================
  openCoverPicker(): void {
    if (this.isUploadingCover) return;
    this.coverInput?.nativeElement?.click();
  }

  onCoverChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.[0]) return;

    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      this.showToast('L\'image ne doit pas dépasser 5 MB');
      input.value = '';
      return;
    }

    this.isUploadingCover = true;

    this.uploadService.uploadClientCover(file).subscribe({
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
          this.showToast(err.error?.message || 'Erreur upload');
          this.cdr.detectChanges();
        });
      },
    });
  }

  // =========================================================
  // SAUVEGARDER PROFIL
  // =========================================================
  saveProfile(): void {
    const fullName = `${this.profile.firstName} ${this.profile.lastName}`.trim();

    if (!fullName) {
      this.showToast('Le nom est obligatoire');
      return;
    }

    if (!this.profile.email.trim() || !this.profile.email.includes('@')) {
      this.showToast('Email invalide');
      return;
    }

    this.isSaving = true;

   const payload = {
  name: fullName,
  phone: this.profile.phone,
  bio: this.profile.bio,
  birthDate: this.profile.birthDate,
  gender: this.profile.gender,
  coverImage: this.profile.coverImage,
  addresses: this.profile.addresses,
  preferredCuisines: this.profile.preferredCuisines,          // ✅
  dietaryRestrictions: this.profile.dietaryRestrictions,      // ✅
  notificationPreferences: this.notifications,                // ✅
};
    this.http.patch(`${this.api}/me/client`, payload).subscribe({
      next: () => {
        this.zone.run(() => {
          this.isSaving = false;
          this.showToast('✅ Profil enregistré');

          // Mettre à jour localStorage
          const user = this.auth.getUser();
          if (user) {
            user.name = fullName;
            user.phone = this.profile.phone;
            localStorage.setItem('user', JSON.stringify(user));
          }

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

  resetProfile(): void {
    if (!confirm('Réinitialiser tous les changements ?')) return;
    this.loadProfile();
  }

  // =========================================================
  // CUISINES / DIET
  // =========================================================
  toggleCuisine(value: string): void {
    const i = this.profile.preferredCuisines.indexOf(value);
    if (i === -1) this.profile.preferredCuisines.push(value);
    else this.profile.preferredCuisines.splice(i, 1);
  }

  isCuisineSelected(value: string): boolean {
    return this.profile.preferredCuisines.includes(value);
  }

  toggleDietary(value: string): void {
    const i = this.profile.dietaryRestrictions.indexOf(value);
    if (i === -1) this.profile.dietaryRestrictions.push(value);
    else this.profile.dietaryRestrictions.splice(i, 1);
  }

  isDietarySelected(value: string): boolean {
    return this.profile.dietaryRestrictions.includes(value);
  }

  // =========================================================
  // ADRESSES
  // =========================================================
  openAddressForm(): void {
    this.showAddressForm = true;
    this.editingAddressId = null;
    this.newAddress = this.createEmptyAddress();
  }

  editAddress(addr: ClientAddress): void {
    this.showAddressForm = true;
    this.editingAddressId = addr.id;
    this.newAddress = { ...addr };
  }

  cancelAddressForm(): void {
    this.showAddressForm = false;
    this.editingAddressId = null;
    this.newAddress = this.createEmptyAddress();
  }

  saveAddress(): void {
    if (!this.newAddress.address.trim() || !this.newAddress.city.trim()) {
      this.showToast('Adresse et ville sont obligatoires');
      return;
    }

    if (this.editingAddressId) {
      const index = this.profile.addresses.findIndex((a) => a.id === this.editingAddressId);
      if (index !== -1) {
        this.profile.addresses[index] = { ...this.newAddress };
      }
      this.showToast('Adresse modifiée');
    } else {
      this.newAddress.id = this.generateId();
      this.profile.addresses.push({ ...this.newAddress });
      this.showToast('Adresse ajoutée');
    }

    if (this.newAddress.isDefault) {
      this.setDefaultAddress(this.newAddress.id);
    }

    this.cancelAddressForm();
  }

  deleteAddress(id: string): void {
    if (!confirm('Supprimer cette adresse ?')) return;
    this.profile.addresses = this.profile.addresses.filter((a) => a.id !== id);
    this.showToast('Adresse supprimée');
  }

  setDefaultAddress(id: string): void {
    this.profile.addresses.forEach((a) => (a.isDefault = a.id === id));
  }

  // =========================================================
  // PAIEMENT
  // =========================================================
  setDefaultPayment(id: string): void {
    this.profile.paymentMethods.forEach((p) => (p.isDefault = p.id === id));
  }

  deletePayment(id: string): void {
    if (!confirm('Supprimer ce moyen de paiement ?')) return;
    this.profile.paymentMethods = this.profile.paymentMethods.filter((p) => p.id !== id);
    this.showToast('Moyen de paiement supprimé');
  }

  // =========================================================
  // NOTIFICATIONS
  // =========================================================
 toggleNotification(key: keyof NotificationPreferences): void {
  this.notifications[key] = !this.notifications[key];

  // ✅ Sauvegarde automatique en base
  this.http.patch(`${this.api}/me/client`, {
    notificationPreferences: this.notifications,
  }).subscribe({
    next: () => {
      this.showToast(
        `Préférence ${this.notifications[key] ? 'activée' : 'désactivée'}`
      );
    },
    error: () => {
      this.showToast('Erreur sauvegarde');
    },
  });
}
  // =========================================================
  // HELPERS
  // =========================================================
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

  getInitials(): string {
    const f = this.profile.firstName?.[0] ?? '';
    const l = this.profile.lastName?.[0] ?? '';
    return (f + l).toUpperCase() || '??';
  }

  getFullName(): string {
    return `${this.profile.firstName} ${this.profile.lastName}`.trim() || 'Client';
  }

  getGradient(): string {
    return this.avatarService.getGradient(this.getFullName());
  }

  hasAvatar(): boolean {
    return this.uploadService.hasImage(this.profile.avatar);
  }

  getAvatarUrl(): string {
    return this.uploadService.getImageUrl(this.profile.avatar);
  }

  hasCover(): boolean {
    return this.uploadService.hasImage(this.profile.coverImage);
  }

  getCoverUrl(): string {
    return this.uploadService.getImageUrl(this.profile.coverImage);
  }

  getPaymentIcon(type: string): string {
    switch (type) {
      case 'card':   return 'bi-credit-card';
      case 'mobile': return 'bi-phone';
      case 'cash':   return 'bi-cash-coin';
      default:       return 'bi-wallet2';
    }
  }

  private generateId(): string {
    return 'id-' + Math.random().toString(36).substr(2, 9);
  }

  private createEmptyAddress(): ClientAddress {
    return {
      id: '',
      label: 'Maison',
      address: '',
      city: '',
      postalCode: '',
      isDefault: false,
    };
  }

  private createEmptyProfile(): ClientProfile {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      birthDate: '',
      gender: '',
      avatar: '',
      coverImage: '',
      bio: '',
      addresses: [],
      paymentMethods: [],
      preferredCuisines: [],
      dietaryRestrictions: ['aucune'],
    };
  }
}