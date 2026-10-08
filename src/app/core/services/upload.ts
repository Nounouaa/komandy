import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.prod';

@Injectable({ providedIn: 'root' })
export class UploadService {
  private api = environment.apiUrl;        // → https://.../api
private baseUrl = environment.socketUrl; // → https://...

  constructor(private http: HttpClient) {}

  // =========================================================
  // UPLOAD AVATAR (Client ou Restaurant)
  // =========================================================
  /**
   * Upload une photo de profil / logo restaurant.
   * Le champ s'appelle 'avatar' côté backend.
   */
  uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);

    return this.http.post<{ success: boolean; avatar: string }>(
      `${this.api}/auth/upload-avatar`,
      formData
    );
  }

  // =========================================================
  // UPLOAD IMAGE PRODUIT
  // =========================================================
  /**
   * Upload une image de produit.
   * Le champ s'appelle 'image' côté backend.
   */
  uploadProductImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<{ success: boolean; image: string }>(
      `${this.api}/products/upload-image`,
      formData
    );
  }

  // =========================================================
  // HELPERS
  // =========================================================
  /**
   * Construit l'URL complète à partir d'un chemin relatif.
   * - Si le chemin est déjà une URL complète (http, https) → on le retourne tel quel
   * - Si le chemin est en base64 (data:image) → on le retourne tel quel
   * - Sinon, on préfixe avec l'URL du backend
   */
  getImageUrl(path: string | null | undefined): string {
    if (!path) return '';

    const trimmed = path.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    if (trimmed.startsWith('data:')) {
      return trimmed;
    }

    // Chemin relatif : /uploads/avatars/xxx.jpg
    return `${this.baseUrl}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
  }

  /**
   * Vérifie si un chemin d'image est valide (non vide)
   */
  hasImage(path: string | null | undefined): boolean {
    return !!path && path.trim().length > 0;
  }

  /**
   * Extrait le nom du fichier depuis un chemin
   */
  getFileName(path: string): string {
    if (!path) return '';
    return path.split('/').pop() || '';
  }


  uploadRestaurantLogo(file: File) {
  const formData = new FormData();
  formData.append('logo', file);
  return this.http.post<{ success: boolean; url: string }>(
    `${this.api}/restaurants/me/upload-logo`,
    formData
  );
}

/** Upload de la cover restaurant */
uploadRestaurantCover(file: File) {
  const formData = new FormData();
  formData.append('cover', file);
  return this.http.post<{ success: boolean; url: string }>(
    `${this.api}/restaurants/me/upload-cover`,
    formData
  );
}

/** Upload de la bannière client */
uploadClientCover(file: File) {
  const formData = new FormData();
  formData.append('cover', file);
  return this.http.post<{ success: boolean; url: string }>(
    `${this.api}/auth/upload-cover`,
    formData
  );
}

}