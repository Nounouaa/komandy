import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Navbar } from './shared/navbar/navbar';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('komandy');

  isDashboard = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.updateDashboardState(this.router.url);

    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: any) => this.updateDashboardState(e.urlAfterRedirects));
  }

  private updateDashboardState(url: string): void {
    this.isDashboard =
      url.startsWith('/restaurant') || url.startsWith('/client');
  }

  isDashboardRoute(): boolean {
    return this.isDashboard;
  }
}