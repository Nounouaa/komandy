import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatWidgetService {
  /** Panneau ouvert / fermé */
  private openSubject = new BehaviorSubject<boolean>(false);
  isOpen$ = this.openSubject.asObservable();

  /** Nombre de messages non lus */
  private unreadSubject = new BehaviorSubject<number>(0);
  unread$ = this.unreadSubject.asObservable();

  toggle(): void {
    this.openSubject.next(!this.openSubject.value);
  }

  open(): void {
    this.openSubject.next(true);
  }

  close(): void {
    this.openSubject.next(false);
  }

  setUnread(n: number): void {
    this.unreadSubject.next(n);
  }

  getUnread(): number {
    return this.unreadSubject.value;
  }

  isOpen(): boolean {
    return this.openSubject.value;
  }
}