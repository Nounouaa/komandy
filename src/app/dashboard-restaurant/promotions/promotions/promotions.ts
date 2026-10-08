import {
  Component, OnInit, ChangeDetectorRef, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  FormBuilder, FormGroup, ReactiveFormsModule, Validators
} from '@angular/forms';
import { PromotionService } from '../../../core/services/promotion.service';
import { UploadService } from '../../../core/services/upload';
import { environment } from '../../../../environments/environment.prod';

const API_URL = environment.apiUrl;

@Component({
  selector: 'app-promotions-resto',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './promotions.html',
  styleUrl: './promotions.css',
})
export class PromotionsResto implements OnInit {

  /* ==================================================================
   *  ÉTAT GÉNÉRAL
   * ================================================================== */
  products: any[] = [];
  promotions: any[] = [];

  isLoading = true;
  isLoadingProducts = true;

  /** ID du produit pour lequel le mini-formulaire est ouvert (null = fermé). */
  openFormForProductId: string | null = null;

  /** ID de la promo en cours d'édition (null = création). */
  editingPromoId: string | null = null;

  /** Produit actuellement ciblé par le mini-formulaire. */
/** Produit actuellement ciblé par le mini-formulaire (utilisé dans le template). */
currentProduct: any = null;

  isSavingPromo = false;

  /** Mémorise le dernier titre proposé automatiquement.
   *  Permet de ne remplacer QUE les titres auto, jamais ceux saisis à la main. */
  private lastAutoTitle: string | null = null;

  promoForm!: FormGroup;

  promoColors = ['#ff6b6b', '#4ecdc4', '#ffd93d', '#c56bf1', '#6bcb77', '#ee5a24'];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private promoService: PromotionService,
    private uploadService: UploadService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadProducts();
    this.loadPromotions();
  }

  /* ==================================================================
   *  FORMULAIRE INLINE
   * ================================================================== */
  initForm(): void {
    const defaultExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    this.promoForm = this.fb.group({
      title:       ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      code:        ['', [Validators.required, Validators.minLength(4)]],
      discount:    [10, [Validators.required, Validators.min(0)]],
      expiresAt:   [defaultExpiry, Validators.required],
      color:       ['#ff6b6b'],
    });

    // Recalcule le titre auto quand la réduction change
    this.promoForm.get('discount')!.valueChanges.subscribe(() => {
      this.refreshAutoTitle();
    });
  }

  get pf() { return this.promoForm.controls; }

  /* ==================================================================
   *  AUTO-REMPLISSAGE DU TITRE
   * ================================================================== */

  /** Construit le titre auto à partir de la remise + nom du produit. */
  private buildAutoTitle(product: any): string {
    const discount = Number(this.promoForm.get('discount')?.value) || 0;
    return `-${discount}% sur ${product.name}`;
  }

  /** Recalcule le titre auto UNIQUEMENT s'il n'a pas été modifié à la main.
   *  Appelé quand la réduction change. */
  private refreshAutoTitle(): void {
    if (!this.currentProduct) return;

    const titleCtrl = this.promoForm.get('title')!;
    const currentTitle = (titleCtrl.value ?? '').trim();

    // Titre personnalisé → on n'y touche pas
    if (currentTitle && currentTitle !== this.lastAutoTitle) return;

    const newTitle = this.buildAutoTitle(this.currentProduct);
    titleCtrl.setValue(newTitle);
    this.lastAutoTitle = newTitle;
  }

  /* ==================================================================
   *  CHARGEMENT
   * ================================================================== */
  loadProducts(): void {
    this.isLoadingProducts = true;

    this.http.get<any>(`${API_URL}/products/my-products`).subscribe({
      next: (res) => {
        this.zone.run(() => {
          this.products =
            Array.isArray(res) ? res
            : res?.products ?? res?.data ?? [];
          this.isLoadingProducts = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.products = [];
          this.isLoadingProducts = false;
          this.cdr.detectChanges();
        });
      },
    });
  }

  loadPromotions(): void {
    this.promoService.getMine().subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.promotions = data ?? [];
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.promotions = [];
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
    });
  }

  /* ==================================================================
   *  GROUPEMENT PROMO ↔ PRODUIT
   * ================================================================== */

  /** Extrait l'ID produit d'une promo (objet peuplé ou string). */
  private getProductId(promo: any): string | null {
    const p = promo?.productId ?? promo?.product;
    if (!p) return null;
    return typeof p === 'object' ? (p._id ?? null) : p;
  }

  /** Promotions liées à un produit. */
  getPromotionsFor(product: any): any[] {
    return this.promotions.filter((p) => this.getProductId(p) === product._id);
  }

  /** Promotions globales (aucun produit lié). */
  get globalPromotions(): any[] {
    return this.promotions.filter((p) => !this.getProductId(p));
  }

  /* ==================================================================
   *  OUVERTURE / FERMETURE DU MINI-FORM
   * ================================================================== */
  openCreateFor(product: any): void {
    this.openFormForProductId = product._id;
    this.editingPromoId = null;
    this.currentProduct = product;
    this.lastAutoTitle = null;

    const defaultExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const codeSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

    const autoTitle = `-10% sur ${product.name}`;
    this.lastAutoTitle = autoTitle;

    this.promoForm.reset({
      title:       autoTitle,
      description: `Offre spéciale sur ${product.name}`,
      code:        `PROMO${codeSuffix}`,
      discount:    10,
      expiresAt:   defaultExpiry,
      color:       '#ff6b6b',
    });
  }

  openEditFor(promo: any, product: any): void {
    this.openFormForProductId = product._id;
    this.editingPromoId = promo._id;
    this.currentProduct = product;

    // On reconstruit le titre auto potentiel pour la promo existante
    const potentialAutoTitle = `-${promo.discount}% sur ${product.name}`;
    this.lastAutoTitle = promo.title === potentialAutoTitle ? promo.title : null;

    this.promoForm.patchValue({
      title:       promo.title,
      description: promo.description || '',
      code:        promo.code,
      discount:    promo.discount,
      expiresAt:   new Date(promo.expiresAt).toISOString().split('T')[0],
      color:       promo.color || '#ff6b6b',
    });
  }

  cancelForm(): void {
    this.openFormForProductId = null;
    this.editingPromoId = null;
    this.currentProduct = null;
    this.lastAutoTitle = null;
    this.promoForm.reset();
  }

  /** Vrai si le form est ouvert pour ce produit précis. */
  isFormOpenFor(productId: string): boolean {
    return this.openFormForProductId === productId;
  }

  /* ==================================================================
   *  SAUVEGARDER LA PROMO
   * ================================================================== */
  save(product: any): void {
    if (this.promoForm.invalid) {
      this.promoForm.markAllAsTouched();
      return;
    }

    this.isSavingPromo = true;

    const value = this.promoForm.value;
    const payload: any = {
      productId:   product._id,
      title:       value.title,
      description: value.description || value.title,
      code:        (value.code || '').toUpperCase(),
      type:        'percent',
      discount:    Number(value.discount) || 0,
      minOrder:    0,
      color:       value.color,
      icon:        'bi-gift-fill',
      expiresAt:   value.expiresAt,
      usageLimit:  0,
    };

    const request$ = this.editingPromoId
      ? this.promoService.update(this.editingPromoId, payload)
      : this.promoService.create(payload);

    request$.subscribe({
      next: () => this.zone.run(() => {
        this.isSavingPromo = false;
        this.cancelForm();
        this.loadPromotions();
      }),
      error: (err) => this.zone.run(() => {
        this.isSavingPromo = false;
        alert(err.error?.message || 'Erreur lors de l\'enregistrement');
      }),
    });
  }

  /* ==================================================================
   *  ACTIONS SUR UNE PROMO
   * ================================================================== */
  toggle(promo: any): void {
    this.promoService.toggle(promo._id).subscribe({
      next: () => this.loadPromotions(),
    });
  }

  remove(promo: any): void {
    if (!confirm(`Supprimer "${promo.title}" ?`)) return;
    this.promoService.delete(promo._id).subscribe({
      next: () => this.loadPromotions(),
    });
  }

  /* ==================================================================
   *  HELPERS IMAGES
   * ================================================================== */
  getProductImage(product: any): string {
    if (!product) return '';
    const raw = product.imageUrl || product.image || product.photo;
    return this.uploadService.getImageUrl(raw);
  }

  hasProductImage(product: any): boolean {
    return this.uploadService.hasImage(
      product?.imageUrl || product?.image || product?.photo
    );
  }

  /* ==================================================================
   *  HELPERS AFFICHAGE
   * ================================================================== */
  getDiscountLabel(promo: any): string {
    switch (promo.type) {
      case 'percent':       return `-${promo.discount}%`;
      case 'fixed':         return `-${promo.discount} Ar`;
      case 'free-delivery': return 'Livraison offerte';
      default:              return `-${promo.discount}%`;
    }
  }

  isExpired(promo: any): boolean {
    return new Date(promo.expiresAt).getTime() < Date.now();
  }

  getDaysLeft(expiresAt: string): number {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }


  /** Prix après application de la réduction en cours de saisie. */
get previewPrice(): number | null {
  if (!this.currentProduct) return null;
  const price = Number(this.currentProduct.price) || 0;
  const discount = Number(this.promoForm.get('discount')?.value) || 0;
  return Math.max(0, price - (price * discount) / 100);
}

/** Économie réalisée (en Ar). */
get previewSavings(): number {
  if (!this.currentProduct) return 0;
  const price = Number(this.currentProduct.price) || 0;
  const discount = Number(this.promoForm.get('discount')?.value) || 0;
  return Math.round((price * discount) / 100);
}
}