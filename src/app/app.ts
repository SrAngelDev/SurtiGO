import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar';
import { GeolocationService } from './services/geolocation.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private geoService = inject(GeolocationService);
  private themeService = inject(ThemeService); // Initialize theme on app start

  onRetryLocation(): void {
    this.geoService.requestLocation();
  }
}
