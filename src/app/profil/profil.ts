// dashboard-client/profil/profil.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule],
  // ✅ AJOUTER ICI AUSSI
  host: { 'ngSkipHydration': '' },
  template: `
    <div style="padding: 40px; color: white; min-height: 100vh; background: #0a0e1a;">
      <h1 style="color: #fff;">🧪 TEST</h1>
      <p style="color: #6bcb77;">✅ isLoading = {{ isLoading }}</p>
    </div>
  `
})
export class Profil implements OnInit {
  isLoading = true;

  ngOnInit() {
    setTimeout(() => {
      this.isLoading = false;
      console.log('✅ isLoading = false');
    }, 500);
  }
}

export default Profil;