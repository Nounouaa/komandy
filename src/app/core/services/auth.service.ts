import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = 'http://localhost:3000/api/auth';

  // On garde le subject pour les composants qui s'y abonnent (ex: sidebar)
  private userSubject = new BehaviorSubject<any>(null);
  user$ = this.userSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Initialiser le subject si on est dans le navigateur
    if (isPlatformBrowser(this.platformId)) {
      const stored = this.readUserFromStorage();
      if (stored) this.userSubject.next(stored);
    }
  }

  // ---------------------------------------------------------
  // Auth
  // ---------------------------------------------------------
  login(email: string, password: string) {
    return this.http.post<any>(`${this.api}/login`, { email, password }).pipe(
      tap((res) => this.storeSession(res))
    );
  }

  registerClient(data: any) {
    return this.http.post<any>(`${this.api}/register/client`, data).pipe(
      tap((res) => this.storeSession(res))
    );
  }

  registerRestaurant(data: any) {
    return this.http.post<any>(`${this.api}/register/restaurant`, data).pipe(
      tap((res) => this.storeSession(res))
    );
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    this.userSubject.next(null);
  }

  // ---------------------------------------------------------
  // 🔑 MÉTHODES PUBLIQUES — lisent TOUJOURS localStorage
  // (c'est ce qui règle le bug de déconnexion au refresh)
  // ---------------------------------------------------------

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getRole(): string | null {
    const user = this.getUser();     // ✅ passe par getUser()
    return user?.role ?? null;
  }

  getUser(): any {
    // ✅ On lit DIRECTEMENT dans localStorage à chaque appel
    return this.readUserFromStorage();
  }

  // ---------------------------------------------------------
  // Privé
  // ---------------------------------------------------------
  private storeSession(res: any): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
    }
    this.userSubject.next(res.user);
  }

  private readUserFromStorage(): any {
    if (!isPlatformBrowser(this.platformId)) return null;

    const raw = localStorage.getItem('user');
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }


  /** Met à jour le user courant (après changement d'email) */
updateCurrentUser(user: any): void {
  this.userSubject.next(user);
}
}