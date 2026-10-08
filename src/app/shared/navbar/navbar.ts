import { Component, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {

  /** État du menu mobile (ouvert / fermé) */
  isMenuOpen = false;

  /** État "scrollé" pour l'effet navbar */
  isScrolled = false;

  constructor(private cdr: ChangeDetectorRef) {}

  /** Ouvre / ferme le menu mobile */
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    this.cdr.detectChanges();
  }

  /** Ferme le menu (appelé après un clic sur un lien) */
  closeMenu(): void {
    this.isMenuOpen = false;
  }

  /** Détecte le scroll pour l'effet "scrolled" */
  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.isScrolled = window.scrollY > 20;
  }
}