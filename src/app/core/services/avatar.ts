import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AvatarService {

  // Palette de couleurs pour les avatars
  private readonly COLORS = [
    '#ff6b6b', // rouge
    '#4ecdc4', // cyan
    '#ffd93d', // jaune
    '#c56bf1', // violet
    '#6bcb77', // vert
    '#ee5a24', // orange
    '#4a90e2', // bleu
    '#e91e63', // rose
    '#00bcd4', // turquoise
    '#9c27b0', // pourpre
    '#ff9800', // ambre
    '#8bc34a', // lime
  ];

  /**
   * Extrait les initiales du nom (1 ou 2 lettres)
   * "Chez Rakoto" → "CR"
   * "Marie" → "MA" (première + 2e lettre)
   */
  getInitials(name: string): string {
    if (!name || !name.trim()) return '?';

    const clean = name.trim();
    const words = clean.split(/\s+/).filter(Boolean);

    // Si plusieurs mots → 1ère lettre du 1er + 1ère lettre du 2e
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }

    // Sinon → 2 premières lettres du mot
    const single = words[0];
    if (single.length >= 2) {
      return (single[0] + single[1]).toUpperCase();
    }
    return single[0].toUpperCase();
  }

  /**
   * Retourne une couleur stable basée sur le nom
   * Le même nom donnera toujours la même couleur
   */
  getColor(name: string): string {
    if (!name) return this.COLORS[0];

    // Hash simple du nom
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return this.COLORS[Math.abs(hash) % this.COLORS.length];
  }

  /**
   * Retourne un dégradé basé sur le nom (pour les avatars ronds)
   */
  getGradient(name: string): string {
    if (!name) return `linear-gradient(135deg, ${this.COLORS[0]}, ${this.COLORS[1]})`;

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);

    const c1 = this.COLORS[hash % this.COLORS.length];
    const c2 = this.COLORS[(hash + 5) % this.COLORS.length];

    return `linear-gradient(135deg, ${c1}, ${c2})`;
  }

  /**
   * Vérifie si un avatar/logo existe (URL ou base64 non vide)
   */
  hasImage(image: string | null | undefined): boolean {
    return !!image && image.trim().length > 0;
  }
}