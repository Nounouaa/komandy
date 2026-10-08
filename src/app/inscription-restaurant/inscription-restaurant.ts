import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';


@Component({
  selector: 'app-inscription-restaurant',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './inscription-restaurant.html',
  styleUrl: './inscription-restaurant.css',
})
export class InscriptionRestaurant implements OnInit {
  form!: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;

  cuisineOptions = [
    { value: 'fast-food',  label: 'Fast Food' },
    { value: 'italienne',  label: 'Italienne' },
    { value: 'japonaise',  label: 'Japonaise' },
    { value: 'francaise',  label: 'Française' },
    { value: 'asiatique',  label: 'Asiatique' },
    { value: 'malgache',   label: 'Malgache' },
    { value: 'vegetarien', label: 'Végétarien' },
  ];

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group(
      {
        // --- Owner (user) ---
        name: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9 ]{8,15}$/)]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],

        // --- Restaurant ---
        restaurantName: ['', [Validators.required, Validators.minLength(2)]],
        restaurantType: ['', [Validators.required]],
        description: ['', [Validators.required, Validators.minLength(20)]],
        address: ['', [Validators.required]],
        city: ['', [Validators.required]],
        deliveryFee: [1500, [Validators.required, Validators.min(0)]],
        minOrder: [5000, [Validators.required, Validators.min(0)]],
        avgPrepTime: [20, [Validators.required, Validators.min(5)]],

        acceptTerms: [false, [Validators.requiredTrue]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  get f() {
    return this.form.controls;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;

    if (password && confirm && password !== confirm) {
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit(): void {
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const v = this.form.value;

    const payload = {
      // User
      name: v.name,
      email: v.email,
      phone: v.phone,
      password: v.password,
      // Restaurant
      restaurant: {
        name: v.restaurantName,
        type: v.restaurantType,
        description: v.description,
        address: v.address,
        city: v.city,
        phone: v.phone,
        deliveryFee: v.deliveryFee,
        minOrder: v.minOrder,
        avgPrepTime: v.avgPrepTime,
        isOpen: true,
      },
    };

    this.auth.registerRestaurant(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/restaurant/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Erreur lors de l\'inscription';
      },
    });
  }
}