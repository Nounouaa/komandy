import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FriendsService } from '../../core/services/friends.service';
import { UploadService } from '../../core/services/upload';
import { AvatarService } from '../../core/services/avatar';

@Component({
  selector: 'app-amis',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './amis.html',
  styleUrl: './amis.css',
})
export class Amis implements OnInit {

  /* Recherche */
  searchQuery = '';
  searchResults: any[] = [];
  isSearching = false;

  /* Mes amis */
  friends: any[] = [];
  isLoadingFriends = true;

  /* Demandes */
  requests: any[] = [];
  isLoadingRequests = true;

  /* Onglet actif */
  activeTab: 'friends' | 'requests' = 'friends';

  constructor(
    private friendsService: FriendsService,
    public uploadService: UploadService,
    public avatarService: AvatarService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadFriends();
    this.loadRequests();
  }

  /* =========================================================
   *  RECHERCHE
   * ========================================================= */
  onSearch(): void {
    const q = this.searchQuery.trim();
    if (q.length < 2) {
      this.searchResults = [];
      return;
    }

    this.isSearching = true;

    this.friendsService.search(q).subscribe({
      next: (res) => this.zone.run(() => {
        this.searchResults = res || [];
        this.isSearching = false;
        this.cdr.detectChanges();
      }),
      error: () => this.zone.run(() => {
        this.searchResults = [];
        this.isSearching = false;
        this.cdr.detectChanges();
      }),
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
  }

  /* =========================================================
   *  ACTIONS
   * ========================================================= */
  addFriend(userId: string): void {
    this.friendsService.sendRequest(userId).subscribe({
      next: () => this.zone.run(() => {
        const u = this.searchResults.find((x) => x._id === userId);
        if (u) u.status = 'pending-sent';
        this.cdr.detectChanges();
      }),
      error: (err) => alert(err.error?.message || 'Erreur'),
    });
  }

  acceptRequest(friendshipId: string): void {
    this.friendsService.acceptRequest(friendshipId).subscribe({
      next: () => this.zone.run(() => {
        this.requests = this.requests.filter((r) => r._id !== friendshipId);
        this.loadFriends();
      }),
    });
  }

  rejectRequest(friendshipId: string): void {
    this.friendsService.rejectRequest(friendshipId).subscribe({
      next: () => this.zone.run(() => {
        this.requests = this.requests.filter((r) => r._id !== friendshipId);
        this.cdr.detectChanges();
      }),
    });
  }

  removeFriend(friendId: string, name: string): void {
    if (!confirm(`Retirer ${name} de vos amis ?`)) return;

    this.friendsService.removeFriend(friendId).subscribe({
      next: () => this.zone.run(() => {
        this.friends = this.friends.filter((f) => f._id !== friendId);
        this.cdr.detectChanges();
      }),
    });
  }

  openChat(friendId: string): void {
    
    this.router.navigate(['/client/messages', friendId]);
  }

  /* =========================================================
   *  CHARGEMENT
   * ========================================================= */
  loadFriends(): void {
    this.friendsService.getMyFriends().subscribe({
      next: (res) => this.zone.run(() => {
        this.friends = res || [];
        this.isLoadingFriends = false;
        this.cdr.detectChanges();
      }),
      error: () => this.zone.run(() => {
        this.isLoadingFriends = false;
        this.cdr.detectChanges();
      }),
    });
  }

  loadRequests(): void {
    this.friendsService.getRequests().subscribe({
      next: (res) => this.zone.run(() => {
        this.requests = res || [];
        this.isLoadingRequests = false;
        this.cdr.detectChanges();
      }),
      error: () => this.zone.run(() => {
        this.isLoadingRequests = false;
        this.cdr.detectChanges();
      }),
    });
  }

  /* =========================================================
   *  HELPERS AVATAR
   * ========================================================= */
  hasAvatar(u: any): boolean {
    return this.uploadService.hasImage(u?.avatar);
  }

  getAvatarUrl(u: any): string {
    return this.uploadService.getImageUrl(u?.avatar);
  }

  getInitials(name: string): string {
    return this.avatarService.getInitials(name || '');
  }

  getGradient(name: string): string {
    return this.avatarService.getGradient(name || '');
  }
}