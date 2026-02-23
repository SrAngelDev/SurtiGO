import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';
import {
  GasStation,
  StationRadioResponse,
  Provincia,
  PrecioMedioProvincia,
  FuelType,
} from '../models/gas-station.interface';
import { GeolocationService } from './geolocation.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FuelService {
  private readonly http = inject(HttpClient);
  private readonly geoService = inject(GeolocationService);
  private readonly apiUrl = environment.apiBaseUrl;

  /** Estado reactivo */
  readonly stations = signal<GasStation[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly selectedFuelType = signal<FuelType>('gasolina95');
  readonly searchQuery = signal('');
  readonly provincias = signal<Provincia[]>([]);
  readonly selectedProvincia = signal<number | null>(null);
  readonly searchCenter = signal<{ latitude: number; longitude: number } | null>(null);
  private lastRadius: number = environment.defaultRadius as number;

  /** Estaciones filtradas por búsqueda */
  readonly filteredStations = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const stationList = this.stations();

    if (!query) return stationList;

    return stationList.filter(
      (s) =>
        s.nombre.toLowerCase().includes(query) ||
        s.direccion.toLowerCase().includes(query) ||
        s.localidad?.toLowerCase().includes(query) ||
        s.provincia?.toLowerCase().includes(query),
    );
  });

  /** Estaciones ordenadas por precio del combustible seleccionado */
  readonly sortedStations = computed(() => {
    const filtered = this.filteredStations();
    const fuelType = this.selectedFuelType();

    return [...filtered].sort((a, b) => {
      const priceA = this.getPrice(a, fuelType) ?? Infinity;
      const priceB = this.getPrice(b, fuelType) ?? Infinity;
      return priceA - priceB;
    });
  });

  /** Precio medio para referencia visual */
  readonly averagePrice = computed(() => {
    const stationList = this.sortedStations();
    const fuelType = this.selectedFuelType();

    const prices = stationList
      .map((s) => this.getPrice(s, fuelType))
      .filter((p): p is number => p != null && p > 0);

    if (prices.length === 0) return 0;
    return Math.round((prices.reduce((sum, p) => sum + p, 0) / prices.length) * 1000) / 1000;
  });

  /** Helper: obtiene el precio de una estación según el tipo de combustible */
  getPrice(station: GasStation, fuelType: FuelType): number | undefined {
    switch (fuelType) {
      case 'diesel': return station.precioDiesel;
      case 'dieselPremium': return station.precioDieselPremium;
      case 'gasolina95': return station.precioGasolina95;
      case 'gasolina98': return station.precioGasolina98;
      case 'glp': return station.precioGLP;
    }
  }

  /**
   * Carga estaciones cercanas a una ubicación dada (usa endpoint /estaciones/radio).
   */
  loadStationsByRadius(lat: number, lon: number, radio: number = environment.defaultRadius): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.searchCenter.set({ latitude: lat, longitude: lon });
    this.lastRadius = radio;

    const params = new HttpParams()
      .set('latitud', lat.toString())
      .set('longitud', lon.toString())
      .set('radio', radio.toString())
      .set('limite', environment.defaultPageLimit.toString());

    this.http
      .get<StationRadioResponse[]>(`${this.apiUrl}/estaciones/radio`, { params })
      .pipe(
        map((response) => this.mapRadioResponse(response)),
        catchError((err) => {
          console.error('Error al cargar estaciones:', err);
          this.error.set('No se pudieron cargar las estaciones. Inténtalo de nuevo.');
          return of([]);
        }),
      )
      .subscribe((stations) => {
        this.stations.set(stations);
        this.isLoading.set(false);
      });
  }

  /**
   * Carga todas las provincias disponibles.
   */
  loadProvincias(): void {
    this.http
      .get<Provincia[]>(`${this.apiUrl}/provincias`)
      .pipe(
        catchError((err) => {
          console.error('Error al cargar provincias:', err);
          return of([]);
        }),
      )
      .subscribe((data) => this.provincias.set(data));
  }

  /**
   * Carga estaciones de un municipio específico.
   */
  loadStationsByMunicipio(idMunicipio: number): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.http
      .get<GasStation[]>(`${this.apiUrl}/estaciones/municipio/${idMunicipio}`)
      .pipe(
        map((stations) =>
          stations.map((s) => ({
            ...s,
            distancia: this.geoService.distanceFromUser(s.latitud, s.longitud) ?? undefined,
          })),
        ),
        catchError((err) => {
          console.error('Error al cargar estaciones del municipio:', err);
          this.error.set('Error al cargar estaciones del municipio.');
          return of([]);
        }),
      )
      .subscribe((stations) => {
        this.stations.set(stations);
        this.isLoading.set(false);
      });
  }

  /**
   * Carga precios medios de una provincia.
   */
  loadPreciosMediosProvincia(idProvincia: number) {
    return this.http
      .get<PrecioMedioProvincia[]>(`${this.apiUrl}/precios/medios/provincia/${idProvincia}`)
      .pipe(
        catchError((err) => {
          console.error('Error al cargar precios medios:', err);
          return of([]);
        }),
      );
  }

  /**
   * Busca estaciones por nombre de localidad/ciudad usando geocodificación.
   */
  searchByLocation(query: string): void {
    if (!query.trim()) return;

    const url = 'https://nominatim.openstreetmap.org/search';
    const params = new HttpParams()
      .set('q', `${query}, España`)
      .set('format', 'json')
      .set('limit', '1')
      .set('countrycodes', 'es');

    this.http.get<Array<{ lat: string; lon: string; display_name: string }>>(url, { params })
      .pipe(
        catchError(() => of([])),
      )
      .subscribe((results) => {
        if (results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lon = parseFloat(results[0].lon);
          this.searchQuery.set('');
          this.loadStationsByRadius(lat, lon, this.lastRadius);
        }
      });
  }

  /**
   * Mapea la respuesta de /estaciones/radio al modelo GasStation.
   */
  private mapRadioResponse(response: StationRadioResponse[]): GasStation[] {
    return response.map((item) => ({
      idEstacion: item.idEstacion,
      nombre: item.nombreEstacion ?? 'Estación desconocida',
      direccion: item.direccion ?? '',
      latitud: item.latitud,
      longitud: item.longitud,
      provincia: item.provincia,
      localidad: item.localidad,
      marca: item.marca,
      horario: item.horario,
      distancia: item.distancia != null ? Math.round(item.distancia * 1000) / 1000 : undefined,
      precioDiesel: item.Diesel,
      precioDieselPremium: item.DieselPremium,
      precioGasolina95: item.Gasolina95,
      precioGasolina98: item.Gasolina98,
      precioGLP: item.GLP,
      precioDieselMedia: item.Diesel_media,
      precioGasolina95Media: item.Gasolina95_media,
    }));
  }
}
