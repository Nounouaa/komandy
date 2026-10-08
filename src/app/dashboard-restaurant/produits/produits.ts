import {
  Component,
  OnInit,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UploadService } from '../../core/services/upload';

const API_URL = 'http://localhost:3000/api';

@Component({
  selector: 'app-produits',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './produits.html',
  styleUrl: './produits.css',
})
export class Produits implements OnInit {

  /* ==================================================================
   *  ÉTAT GÉNÉRAL
   * ================================================================== */
  products: any[] = [];
  isLoading = true;
  showForm = false;
  editingId: string | null = null;

  form!: FormGroup;

  /* ==================================================================
   *  UPLOAD IMAGE
   * ================================================================== */
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  isUploading = false;
  uploadError = '';

  /* ==================================================================
   *  CATÉGORIES
   * ================================================================== */
  categories = [
    'Burgers', 'Pizzas', 'Boissons', 'Desserts',
    'Entrées', 'Plats', 'Autres',
  ];

  /** Vrai quand l'utilisateur choisit « Autres » → affiche un champ texte. */
  showCustomCategory = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private uploadService: UploadService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadProducts();
  }

  /* ==================================================================
   *  FORMULAIRE
   * ================================================================== */
  initForm(): void {
    this.form = this.fb.group({
      name:           ['', [Validators.required, Validators.minLength(2)]],
      description:    [''],
      price:          [0, [Validators.required, Validators.min(0)]],
      category:       ['Burgers', Validators.required],
      customCategory: [''],                      // champ interne (jamais envoyé en base)
      image:          [''],
      isAvailable:    [true],
    });

    // Affiche / masque le champ « Autres » selon la catégorie choisie
    this.form.get('category')!.valueChanges.subscribe((val) => {
      this.zone.run(() => {
        this.showCustomCategory = val === 'Autres';
        this.cdr.detectChanges();
      });
    });
  }

  get f() { return this.form.controls; }

  /** Vrai si l'utilisateur a choisi la catégorie personnalisée. */
  get isCustomCategory(): boolean {
    return this.form?.get('category')?.value === 'Autres';
  }

  /** Retourne la catégorie finale (prédéfinie ou saisie libre). */
  private getFinalCategory(): string {
    const custom = (this.form.get('customCategory')?.value ?? '').trim();
    return this.isCustomCategory && custom
      ? custom
      : this.form.get('category')!.value;
  }

  /* ==================================================================
   *  CHARGEMENT
   * ================================================================== */
  loadProducts(): void {
    this.http.get<any[]>(`${API_URL}/products/my-products`).subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.products = data ?? [];
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.products = [];
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
    });
  }

  /* ==================================================================
   *  ACTIONS FORMULAIRE
   * ================================================================== */
  openCreate(): void {
    this.showForm = true;
    this.editingId = null;
    this.selectedFile = null;
    this.previewUrl = null;
    this.uploadError = '';
    this.showCustomCategory = false;
    this.initForm();
  }

  openEdit(p: any): void {
    this.showForm = true;
    this.editingId = p._id;
    this.selectedFile = null;
    this.previewUrl = p.image ? this.uploadService.getImageUrl(p.image) : null;
    this.uploadError = '';

    // La catégorie existante est-elle dans la liste prédéfinie ?
    const isKnown = this.categories.includes(p.category);
    const selectedCategory = isKnown ? (p.category || 'Autres') : 'Autres';
    const customCategory = !isKnown && p.category ? p.category : '';

    this.showCustomCategory = selectedCategory === 'Autres';

    this.form.patchValue({
      name:           p.name,
      description:    p.description,
      price:          p.price,
      category:       selectedCategory,
      customCategory: customCategory,
      image:          p.image || '',
      isAvailable:    p.isAvailable !== false,
    });
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.selectedFile = null;
    this.previewUrl = null;
    this.uploadError = '';
    this.showCustomCategory = false;
    this.form.reset();
  }

  /* ==================================================================
   *  UPLOAD IMAGE
   * ================================================================== */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];

    if (file.size > 5 * 1024 * 1024) {
      this.uploadError = "L'image ne doit pas dépasser 5 MB";
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.uploadError = 'Seules les images sont autorisées';
      return;
    }

    this.uploadError = '';
    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.zone.run(() => {
        this.previewUrl = e.target?.result as string;
        this.cdr.detectChanges();
      });
    };
    reader.readAsDataURL(file);
  }

  removeImage(event: Event): void {
    event.stopPropagation();
    this.selectedFile = null;
    this.previewUrl = null;
    this.form.patchValue({ image: '' });
    this.uploadError = '';
  }

  /* ==================================================================
   *  SAUVEGARDER
   * ================================================================== */
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Si « Autres » est sélectionné, le champ texte doit être rempli
    if (this.isCustomCategory && !(this.form.get('customCategory')?.value ?? '').trim()) {
      this.uploadError = 'Veuillez saisir une catégorie personnalisée';
      return;
    }

    this.uploadError = '';

    // Si une nouvelle image a été sélectionnée → l'uploader d'abord
    if (this.selectedFile) {
      this.isUploading = true;

      this.uploadService.uploadProductImage(this.selectedFile).subscribe({
        next: (res) => {
          this.zone.run(() => {
            this.isUploading = false;
            this.form.patchValue({ image: res.image });
            this.saveProduct();
          });
        },
        error: (err) => {
          this.zone.run(() => {
            this.isUploading = false;
            this.uploadError = err.error?.message || 'Erreur upload image';
            this.cdr.detectChanges();
          });
        },
      });
    } else {
      this.saveProduct();
    }
  }

  private saveProduct(): void {
    // On envoie la catégorie finale (prédéfinie ou saisie libre)
    const data = {
      ...this.form.value,
      category: this.getFinalCategory(),
    };
    delete data.customCategory;   // ne part jamais en base

    const call = this.editingId
      ? this.http.patch(`${API_URL}/products/${this.editingId}`, data)
      : this.http.post(`${API_URL}/products`, data);

    call.subscribe({
      next: () => {
        this.zone.run(() => {
          this.cancelForm();
          this.loadProducts();
        });
      },
      error: (err) => {
        alert(err.error?.message || 'Erreur lors de la sauvegarde');
      },
    });
  }

  /* ==================================================================
   *  ACTIONS LISTE
   * ================================================================== */
  toggleAvailability(p: any): void {
    this.http.patch(`${API_URL}/products/${p._id}`, {
      isAvailable: !p.isAvailable,
    }).subscribe({ next: () => this.loadProducts() });
  }

  remove(p: any): void {
    if (!confirm(`Supprimer "${p.name}" ?`)) return;
    this.http.delete(`${API_URL}/products/${p._id}`).subscribe({
      next: () => this.loadProducts(),
    });
  }

  /* ==================================================================
   *  HELPERS
   * ================================================================== */
  getImageUrl(image: string): string {
    return this.uploadService.getImageUrl(image);
  }

  hasImage(p: any): boolean {
    return !!p.image && p.image.trim().length > 0;
  }
}