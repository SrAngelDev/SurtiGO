import { Injectable, signal, computed } from '@angular/core';
import { UserLocation } from '../models/gas-station.interface';

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  /** Señal reactiva con la ubicación actual del usuario */
  readonly userLocation = signal<UserLocation | null>(null);
  readonly locationError = signal<string | null>(null);
  readonly isLocating = signal(false);

  /** Indica si tenemos ubicación disponible */
  readonly hasLocation = computed(() => this.userLocation() !== null);

  /**
   * Solicita la ubicación del navegador.
   * Retorna una Promise para poder esperar el resultado.
   */
  requestLocation(): Promise<UserLocation | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        this.locationError.set('La geolocalización no está soportada en este navegador.');
        resolve(null);
        return;
      }

      this.isLocating.set(true);
      this.locationError.set(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: UserLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          this.userLocation.set(loc);
          this.isLocating.set(false);
          resolve(loc);
        },
        (error) => {
          const messages: Record<number, string> = {
            1: 'Permiso de ubicación denegado. Puedes buscarlo manualmente.',
            2: 'No se pudo determinar tu ubicación.',
            3: 'Tiempo de espera agotado al obtener la ubicación.',
          };
          this.locationError.set(messages[error.code] ?? 'Error desconocido de geolocalización.');
          this.isLocating.set(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 300_000, // 5 minutos de caché
        },
      );
    });
  }

  /**
   * Calcula la distancia entre dos puntos usando la fórmula de Haversine.
   * @returns Distancia en kilómetros.
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100; // 2 decimales
  }

  /**
   * Calcula la distancia desde la ubicación del usuario a un punto dado.
   * Retorna null si no hay ubicación del usuario.
   */
  distanceFromUser(lat: number, lon: number): number | null {
    const loc = this.userLocation();
    if (!loc) return null;
    return this.calculateDistance(loc.latitude, loc.longitude, lat, lon);
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}
