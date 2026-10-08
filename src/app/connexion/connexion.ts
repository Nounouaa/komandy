import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-connexion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './connexion.html',
  styleUrl: './connexion.css',
})
export class Connexion implements OnInit {
  form!: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  returnUrl = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,        // ✅
    private zone: NgZone                   // ✅
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '';
  }

  get f() {
    return this.form.controls;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const { email, password } = this.form.value;

    this.auth.login(email, password).subscribe({
      next: (res) => {
        this.zone.run(() => {              // ✅ force Angular à voir le changement
          this.isLoading = false;
          this.cdr.detectChanges();

          if (this.returnUrl) {
            this.router.navigateByUrl(this.returnUrl);
          } else if (res.user.role === 'restaurant') {
            this.router.navigate(['/restaurant/dashboard']);
          } else {
            this.router.navigate(['/client/dashboard']);
          }
        });
      },
      error: (err) => {
        this.zone.run(() => {              // ✅ idem pour l'erreur
          this.isLoading = false;
          this.errorMessage = err.error?.message || 'Email ou mot de passe incorrect';
          this.cdr.detectChanges();        // ✅ affichage IMMÉDIAT
        });
      },
    });
  }
}