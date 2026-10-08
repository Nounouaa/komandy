import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;

  // Rediriger vers connexion avec l'URL de retour
  router.navigate(['/connexion'], {
    queryParams: { returnUrl: state.url },
  });
  return false;
};