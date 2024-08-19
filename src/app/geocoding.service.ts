import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  
  private apiKey = 'AIzaSyDjTw7tCyjrdpouZjn19gkTBfZYVc1UD1c'

  constructor(private http: HttpClient) { }
  
  getCoordinates(address: string): Observable<any> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`;
    return this.http.get(url).pipe(
      map((response: any) => {
        console.log('Geocoding API response:', response); // Dodano logiranje odgovora
        if (response.status === 'OK' && response.results && response.results.length > 0) {
          return response.results[0].geometry.location;
        }
        throw new Error('Location not found');
      })
    );
  }
}
