import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (requiredRole: 'client' | 'restaurant'): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn()) {
      router.navigate(['/connexion']);
      return false;
    }

    const role = auth.getRole();
    if (role === requiredRole) return true;

    // Bon utilisateur, mauvais rôle → rediriger vers son espace
    router.navigate([role === 'client' ? '/client/dashboard' : '/restaurant/dashboard']);
    return false;
  };
};