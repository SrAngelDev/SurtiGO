import {
  Component,
  afterNextRender,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { GasStation, FuelType } from '../../models/gas-station.interface';
import { FuelService } from '../../services/fuel.service';
import { ThemeService } from '../../services/theme.service';
import { getBrandLogoUrl, GENERIC_LOGO, getBrandColor } from '../../constants/brand-logos';

const FUEL_LABELS: Record<FuelType, string> = {
  gasolina95: 'Gasolina 95',
  gasolina98: 'Gasolina 98',
  diesel: 'Diésel',
  dieselPremium: 'Diésel Premium',
  glp: 'GLP',
};

@Component({
  selector: 'app-map-view',
  standalone: true,
  template: `<div #mapEl class="h-full w-full"></div>`,
  styles: [`:host { display: block; height: 100%; width: 100%; }`],
})
export class MapViewComponent implements OnDestroy {
  private readonly mapEl = viewChild.required<ElementRef<HTMLElement>>('mapEl');

  readonly stations = input.required<GasStation[]>();
  readonly userLocation = input<{ latitude: number; longitude: number } | null>(null);
  readonly highlightedStation = input<GasStation | null>(null);

  readonly stationClicked = output<GasStation>();
  readonly locationChange = output<{ latitude: number; longitude: number }>();

  private map: L.Map | undefined;
  private markersLayer = L.layerGroup();
  private highlightMarker: L.Marker | undefined;
  private tileLayer: L.TileLayer | undefined;
  private searchCenterMarker: L.Marker | undefined;
  private readonly fuelService = inject(FuelService);
  private readonly themeService = inject(ThemeService);
  private mapReady = signal(false);
  private longPressTimer: ReturnType<typeof setTimeout> | undefined;

  private readonly darkTiles = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  private readonly lightTiles = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  constructor() {
    afterNextRender(() => {
      this.initMap();
      this.mapReady.set(true);
    });

    // React to data changes
    effect(() => {
      if (!this.mapReady()) return;
      const stationList = this.stations();
      const userLoc = this.userLocation();
      const fuelType = this.fuelService.selectedFuelType();
      this.renderMarkers(stationList, fuelType);
      this.fitView(stationList, userLoc);
    });

    // React to highlight changes
    effect(() => {
      if (!this.mapReady()) return;
      const station = this.highlightedStation();
      this.updateHighlight(station);
    });

    // React to theme changes
    effect(() => {
      if (!this.mapReady()) return;
      const theme = this.themeService.resolvedTheme();
      this.updateTileLayer(theme);
    });

    // React to search center changes
    effect(() => {
      if (!this.mapReady()) return;
      const center = this.fuelService.searchCenter();
      const userLoc = this.userLocation();
      this.updateSearchCenter(center, userLoc);
    });
  }

  private initMap(): void {
    const el = this.mapEl().nativeElement;
    this.map = L.map(el, {
      center: [40.4168, -3.7038],
      zoom: 6,
      zoomControl: true,
      attributionControl: false,
      doubleClickZoom: false, // Disable default double-click zoom
    });

    const theme = this.themeService.resolvedTheme();
    this.tileLayer = L.tileLayer(theme === 'dark' ? this.darkTiles : this.lightTiles, {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(this.map);

    this.markersLayer.addTo(this.map);

    // Double-click → change reference location (desktop)
    this.map.on('dblclick', (e: L.LeafletMouseEvent) => {
      this.locationChange.emit({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    });

    // Long-press → change reference location (mobile)
    this.map.on('contextmenu', (e: L.LeafletMouseEvent) => {
      e.originalEvent.preventDefault();
      this.locationChange.emit({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    });

    // Touch long-press support
    const container = this.map.getContainer();
    container.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      this.longPressTimer = setTimeout(() => {
        const touch = e.touches[0];
        const point = this.map!.containerPointToLatLng([touch.clientX - container.getBoundingClientRect().left, touch.clientY - container.getBoundingClientRect().top]);
        this.locationChange.emit({ latitude: point.lat, longitude: point.lng });
      }, 700);
    }, { passive: true });

    container.addEventListener('touchend', () => clearTimeout(this.longPressTimer), { passive: true });
    container.addEventListener('touchmove', () => clearTimeout(this.longPressTimer), { passive: true });

    setTimeout(() => this.map?.invalidateSize(), 100);
  }

  private updateTileLayer(theme: 'light' | 'dark'): void {
    if (!this.map) return;
    if (this.tileLayer) this.map.removeLayer(this.tileLayer);
    this.tileLayer = L.tileLayer(theme === 'dark' ? this.darkTiles : this.lightTiles, {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(this.map);
  }

  private updateSearchCenter(center: { latitude: number; longitude: number } | null, userLoc: { latitude: number; longitude: number } | null): void {
    if (!this.map) return;
    if (this.searchCenterMarker) {
      this.map.removeLayer(this.searchCenterMarker);
      this.searchCenterMarker = undefined;
    }
    // Show search center pin only when it's different from user location
    if (center && (!userLoc || Math.abs(center.latitude - userLoc.latitude) > 0.001 || Math.abs(center.longitude - userLoc.longitude) > 0.001)) {
      const icon = L.divIcon({
        html: `<div style="width:28px;height:28px;border-radius:50%;background:rgba(249,115,22,0.15);border:2px dashed #f97316;display:flex;align-items:center;justify-content:center;">
          <div style="width:8px;height:8px;border-radius:50%;background:#f97316;"></div>
        </div>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      this.searchCenterMarker = L.marker([center.latitude, center.longitude], { icon, interactive: false }).addTo(this.map);
    }
  }

  private createBrandIcon(station: GasStation, rank: number, isCheap: boolean, isTop: boolean): L.DivIcon {
    const logo = getBrandLogoUrl(station.marca);
    const fallback = GENERIC_LOGO;
    const size = isTop ? 38 : 30;
    const borderColor = isTop ? '#f97316' : isCheap ? '#4ade80' : 'rgba(255,255,255,0.3)';
    const shadow = isTop
      ? '0 0 0 3px rgba(249,115,22,0.3), 0 2px 8px rgba(0,0,0,0.4)'
      : isCheap
        ? '0 0 0 2px rgba(34,197,94,0.2), 0 2px 6px rgba(0,0,0,0.3)'
        : '0 2px 6px rgba(0,0,0,0.3)';

    const rankBadge = isTop
      ? `<div style="position:absolute;top:-5px;right:-5px;width:16px;height:16px;border-radius:50%;background:#f97316;color:#fff;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid var(--color-dark-bg,#09090b);font-family:Inter,system-ui,sans-serif;">${rank}</div>`
      : '';

    const html = `
      <div style="position:relative;width:${size}px;height:${size}px;">
        <div style="width:100%;height:100%;border-radius:50%;overflow:hidden;border:2px solid ${borderColor};box-shadow:${shadow};box-sizing:border-box;background:#1a1a1f;">
          <img src="${logo}" width="${size}" height="${size}" style="display:block;width:100%;height:100%;object-fit:cover;" onerror="this.onerror=null;this.src='${fallback}';"/>
        </div>
        ${rankBadge}
      </div>`;

    return L.divIcon({
      html,
      className: '',
      iconSize: [size + 12, size + 12],
      iconAnchor: [(size + 12) / 2, (size + 12) / 2],
      popupAnchor: [0, -(size / 2 + 4)],
    });
  }

  private renderMarkers(stations: GasStation[], fuelType: FuelType): void {
    if (!this.map) return;
    this.markersLayer.clearLayers();

    // User location – compact dot + subtle pulse ring
    const userLoc = this.userLocation();
    if (userLoc) {
      L.circleMarker([userLoc.latitude, userLoc.longitude], {
        radius: 5, fillColor: '#3b82f6', fillOpacity: 1,
        color: '#ffffff', weight: 2, opacity: 0.95,
      }).bindPopup('<div style="text-align:center;font-weight:600;color:var(--color-text-primary,#fafafa);padding:8px;">📍 Tu ubicación</div>')
        .addTo(this.markersLayer);

      L.circleMarker([userLoc.latitude, userLoc.longitude], {
        radius: 11, fillColor: '#3b82f6', fillOpacity: 0.12,
        color: '#3b82f6', weight: 1, opacity: 0.25,
      }).addTo(this.markersLayer);
    }

    // Station markers
    const avg = this.fuelService.averagePrice();
    stations.forEach((station, i) => {
      const price = this.fuelService.getPrice(station, fuelType);
      const isCheap = price != null && avg > 0 && price < avg;
      const isTop = i < 3 && price != null;
      const rank = i + 1;

      const icon = this.createBrandIcon(station, rank, isCheap, isTop);
      const marker = L.marker([station.latitud, station.longitud], { icon });

      // Build popup HTML
      const priceStr = price ? `${price.toFixed(3)} €/L` : 'Sin datos';
      const distStr = station.distancia != null
        ? (station.distancia < 1 ? `${Math.round(station.distancia * 1000)} m` : `${station.distancia.toFixed(1)} km`)
        : '';
      const rankBadge = isTop
        ? `<span style="display:inline-block;background:#f97316;color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;margin-right:4px;">#${rank}</span>`
        : '';
      const brandColors = getBrandColor(station.marca);
      const brandBadge = station.marca
        ? `<span style="display:inline-block;background:${brandColors.bg};color:${brandColors.fg};font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px;margin-left:4px;">${station.marca}</span>`
        : '';

      // All prices
      const allPrices: string[] = [];
      if (station.precioGasolina95) allPrices.push(`<div style="display:flex;justify-content:space-between;"><span style="color:var(--color-text-muted,#71717a);font-size:10px;">G95</span><span style="font-weight:700;font-size:11px;color:var(--color-text-primary,#fafafa);">${station.precioGasolina95.toFixed(3)}</span></div>`);
      if (station.precioGasolina98) allPrices.push(`<div style="display:flex;justify-content:space-between;"><span style="color:var(--color-text-muted,#71717a);font-size:10px;">G98</span><span style="font-weight:700;font-size:11px;color:var(--color-text-primary,#fafafa);">${station.precioGasolina98.toFixed(3)}</span></div>`);
      if (station.precioDiesel) allPrices.push(`<div style="display:flex;justify-content:space-between;"><span style="color:var(--color-text-muted,#71717a);font-size:10px;">Diésel</span><span style="font-weight:700;font-size:11px;color:var(--color-text-primary,#fafafa);">${station.precioDiesel.toFixed(3)}</span></div>`);
      if (station.precioDieselPremium) allPrices.push(`<div style="display:flex;justify-content:space-between;"><span style="color:var(--color-text-muted,#71717a);font-size:10px;">D.Prem</span><span style="font-weight:700;font-size:11px;color:var(--color-text-primary,#fafafa);">${station.precioDieselPremium.toFixed(3)}</span></div>`);
      if (station.precioGLP) allPrices.push(`<div style="display:flex;justify-content:space-between;"><span style="color:var(--color-text-muted,#71717a);font-size:10px;">GLP</span><span style="font-weight:700;font-size:11px;color:var(--color-text-primary,#fafafa);">${station.precioGLP.toFixed(3)}</span></div>`);

      marker.bindPopup(`
        <div style="padding:12px 14px;min-width:220px;max-width:280px;font-family:Inter,system-ui,sans-serif;">
          <div style="font-size:13px;font-weight:700;color:var(--color-text-primary,#fafafa);margin-bottom:2px;line-height:1.3;">
            ${rankBadge}${station.nombre}
          </div>
          <div style="font-size:11px;color:var(--color-text-muted,#a1a1aa);margin-bottom:6px;">
            ${station.localidad || ''}${station.localidad && station.provincia ? ' · ' : ''}${station.provincia || ''}
            ${brandBadge}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid var(--color-dark-border,#2e2e33);padding-top:8px;margin-bottom:8px;">
            <div>
              <div style="font-size:10px;color:var(--color-text-muted,#71717a);text-transform:uppercase;letter-spacing:0.05em;">${FUEL_LABELS[fuelType]}</div>
              <div style="font-size:20px;font-weight:800;color:${isCheap ? '#f97316' : 'var(--color-text-primary,#fafafa)'};line-height:1;">${priceStr}</div>
            </div>
            ${distStr ? `<div style="font-size:11px;color:var(--color-text-secondary,#a1a1aa);">📍 ${distStr}</div>` : ''}
          </div>
          ${allPrices.length > 1 ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;border-top:1px solid var(--color-dark-border,#2e2e33);padding-top:6px;margin-bottom:8px;">${allPrices.join('')}</div>` : ''}
          ${station.horario ? `<div style="font-size:10px;color:var(--color-text-muted,#71717a);margin-bottom:8px;">🕐 ${station.horario}</div>` : ''}
          <div style="display:flex;gap:6px;">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${station.latitud},${station.longitud}" target="_blank" rel="noopener"
              style="flex:1;display:flex;align-items:center;justify-content:center;gap:3px;padding:6px 8px;border-radius:8px;background:rgba(59,130,246,0.12);color:#3b82f6;font-size:10px;font-weight:600;text-decoration:none;">
              📍 Google
            </a>
            <a href="https://waze.com/ul?ll=${station.latitud},${station.longitud}&navigate=yes" target="_blank" rel="noopener"
              style="flex:1;display:flex;align-items:center;justify-content:center;gap:3px;padding:6px 8px;border-radius:8px;background:rgba(59,130,246,0.12);color:#3b82f6;font-size:10px;font-weight:600;text-decoration:none;">
              🗺️ Waze
            </a>
            <a href="https://maps.apple.com/?daddr=${station.latitud},${station.longitud}" target="_blank" rel="noopener"
              style="flex:1;display:flex;align-items:center;justify-content:center;gap:3px;padding:6px 8px;border-radius:8px;background:rgba(59,130,246,0.12);color:#3b82f6;font-size:10px;font-weight:600;text-decoration:none;">
              🍎 Apple
            </a>
          </div>
        </div>
      `, { closeButton: true, className: '', maxWidth: 300 });

      marker.on('click', () => this.stationClicked.emit(station));
      marker.addTo(this.markersLayer);
    });
  }

  private fitView(stations: GasStation[], userLoc: { latitude: number; longitude: number } | null): void {
    if (!this.map) return;
    const points: L.LatLngTuple[] = stations
      .filter(s => s.latitud && s.longitud)
      .map(s => [s.latitud, s.longitud]);

    if (userLoc) points.push([userLoc.latitude, userLoc.longitude]);

    const center = this.fuelService.searchCenter();
    if (center) points.push([center.latitude, center.longitude]);

    if (points.length > 1) {
      this.map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 });
    } else if (points.length === 1) {
      this.map.setView(points[0], 13);
    }
  }

  private updateHighlight(station: GasStation | null): void {
    if (!this.map) return;
    if (this.highlightMarker) {
      this.map.removeLayer(this.highlightMarker);
      this.highlightMarker = undefined;
    }
    if (station) {
      const size = 48;
      const icon = L.divIcon({
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;border:2.5px solid #3b82f6;background:rgba(59,130,246,0.08);box-shadow:0 0 0 4px rgba(59,130,246,0.15);animation:highlight-pulse 1.8s ease-in-out infinite;"></div>`,
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      this.highlightMarker = L.marker([station.latitud, station.longitud], { icon, interactive: false, zIndexOffset: -1 }).addTo(this.map);

      // Pan to station if it's outside the current view
      const latLng = L.latLng(station.latitud, station.longitud);
      if (!this.map.getBounds().contains(latLng)) {
        this.map.panTo(latLng, { animate: true, duration: 0.5 });
      }
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.longPressTimer);
    this.map?.remove();
  }
}
