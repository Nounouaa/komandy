import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.prod';

@Injectable({ providedIn: 'root' })
export class PromotionService {
  private api = `${environment.apiUrl}/promotions`;

  constructor(private http: HttpClient) {}

  /* ---------------------------------------------------------
   *  PUBLIC
   * --------------------------------------------------------- */

  /** Toutes les promos actives (avec infos restaurant peuplées). */
  getAll() {
    return this.http.get<any[]>(this.api);
  }

  /** Promos actives d'un restaurant spécifique. */
  getByRestaurant(restaurantId: string) {
    return this.http.get<any[]>(`${this.api}/restaurant/${restaurantId}`);
  }

  /**
   * Résumé des promos par restaurant.
   * Renvoie : [{ restaurantId, count, bestDiscount, color }, ...]
   */
  getActiveRestaurants() {
    return this.http.get<any[]>(`${this.api}/active-restaurants`);
  }

  /* ---------------------------------------------------------
   *  RESTAURANT
   * --------------------------------------------------------- */

  /** Mes promotions (restaurant connecté). */
  getMine() {
    return this.http.get<any[]>(`${this.api}/my-promotions`);
  }

  create(data: any) {
    return this.http.post<any>(this.api, data);
  }

  update(id: string, data: any) {
    return this.http.patch<any>(`${this.api}/${id}`, data);
  }

  toggle(id: string) {
    return this.http.patch<any>(`${this.api}/${id}/toggle`, {});
  }

  delete(id: string) {
    return this.http.delete(`${this.api}/${id}`);
  }
}