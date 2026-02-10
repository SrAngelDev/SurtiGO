import { Component, inject, output } from '@angular/core';
import { FuelService } from '../../services/fuel.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  templateUrl: './navbar.html',
  host: { class: 'block' },
})
export class NavbarComponent {
  protected readonly fuelService = inject(FuelService);
}
