import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-accueil',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './accueil.html',
  styleUrl: './accueil.css',
})
export class Accueil implements OnInit, OnDestroy {

  // --- État du diaporama ---
  currentSlide = 0;
  readonly totalSlides = 4;
  isPaused = false;

  // --- Gestion du timer ---
  private autoPlayInterval: ReturnType<typeof setInterval> | null = null;

  // --- Support tactile ---
  private touchStartX = 0;
  private touchEndX = 0;

  // --- Compteur formaté (ex: "01", "02"...) ---
  get currentSlideLabel(): string {
    return String(this.currentSlide + 1).padStart(2, '0');
  }

  get totalSlidesLabel(): string {
    return String(this.totalSlides).padStart(2, '0');
  }

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  // ---------------------------------------------------------------
  // Cycle de vie
  // ---------------------------------------------------------------
  ngOnInit(): void {
    // ⚠️ setInterval ne doit tourner que côté navigateur (pas en SSR)
    if (isPlatformBrowser(this.platformId)) {
      this.startAutoPlay();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
  }

  // ---------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------
  goToSlide(index: number): void {
    if (index < 0 || index >= this.totalSlides) return;
    this.currentSlide = index;
    this.resetAutoPlay();
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.totalSlides;
    this.resetAutoPlay();
  }

  prevSlide(): void {
    this.currentSlide =
      (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
    this.resetAutoPlay();
  }

  // ---------------------------------------------------------------
  // Auto-play
  // ---------------------------------------------------------------
  private startAutoPlay(): void {
    this.stopAutoPlay();
    this.autoPlayInterval = setInterval(() => {
      if (!this.isPaused) {
        this.currentSlide = (this.currentSlide + 1) % this.totalSlides;
      }
    }, 4000);
  }

  private stopAutoPlay(): void {
    if (this.autoPlayInterval !== null) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }

  private resetAutoPlay(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.startAutoPlay();
    }
  }

  // ---------------------------------------------------------------
  // Pause au survol
  // ---------------------------------------------------------------
  onMouseEnter(): void {
    this.isPaused = true;
  }

  onMouseLeave(): void {
    this.isPaused = false;
  }

  // ---------------------------------------------------------------
  // Navigation clavier
  // ---------------------------------------------------------------
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      this.prevSlide();
      event.preventDefault();
    } else if (event.key === 'ArrowRight') {
      this.nextSlide();
      event.preventDefault();
    }
  }

  // ---------------------------------------------------------------
  // Support tactile (swipe)
  // ---------------------------------------------------------------
  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  onTouchEnd(event: TouchEvent): void {
    this.touchEndX = event.changedTouches[0].screenX;
    const diff = this.touchStartX - this.touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        this.nextSlide();
      } else {
        this.prevSlide();
      }
    }
  }
}