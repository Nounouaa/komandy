import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/* =========================================================
 * TYPES
 * ========================================================= */
export interface FriendUser {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
  city?: string;
  status?: 'none' | 'friend' | 'pending-sent' | 'pending-received';
}

export interface FriendRequest {
  _id: string;
  user: FriendUser;
  createdAt: string;
}

/* =========================================================
 * SERVICE
 * ========================================================= */
@Injectable({ providedIn: 'root' })
export class FriendsService {
  private api = `${environment.apiUrl}/friends`;

  constructor(private http: HttpClient) {}

  /* ---------------------------------------------------------
   *  RECHERCHE
   * --------------------------------------------------------- */
  search(query: string) {
    const params = new HttpParams().set('q', query);
    return this.http.get<FriendUser[]>(`${this.api}/search`, { params });
  }

  /* ---------------------------------------------------------
   *  MES AMIS
   * --------------------------------------------------------- */
  getMyFriends() {
    return this.http.get<FriendUser[]>(this.api);
  }

  /* ---------------------------------------------------------
   *  DEMANDES
   * --------------------------------------------------------- */
  getRequests() {
    return this.http.get<FriendRequest[]>(`${this.api}/requests`);
  }

  sendRequest(userId: string) {
    return this.http.post(`${this.api}/request/${userId}`, {});
  }

  acceptRequest(friendshipId: string) {
    return this.http.post(`${this.api}/accept/${friendshipId}`, {});
  }

  rejectRequest(friendshipId: string) {
    return this.http.post(`${this.api}/reject/${friendshipId}`, {});
  }

  /* ---------------------------------------------------------
   *  SUPPRESSION
   * --------------------------------------------------------- */
  removeFriend(friendId: string) {
    return this.http.delete(`${this.api}/${friendId}`);
  }
}