import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  
  private apiKey = 'AIzaSyCp371P2OyvJ0yDNjKIabiS-C-RaTvsLD4'

  constructor(private http: HttpClient) { }
  
  getCoordinates(address: string): Observable<any> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`;
    return this.http.get(url).pipe(
      map((response: any) => {
        console.log('Geocoding API response:', response); // Log the API response
        if (response.status === 'OK' && response.results && response.results.length > 0) {
          return response.results[0].geometry.location;
        }
        throw new Error('Location not found');
      }),
      catchError((error) => {
        console.error('Error fetching coordinates:', error);
        return of({ lat: 0, lng: 0 }); // Return a default location or handle error as needed
      })
    );
  }
  
  getReverseGeocode(lat: number, lng: number): Observable<any> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`;
    return this.http.get(url).pipe(
      map((response: any) => {
        console.log('Reverse Geocoding API response:', response);
        if (response.status === 'OK' && response.results && response.results.length > 0) {
          const result = response.results[0];
          const locality = result.address_components.find((component: any) =>
            component.types.includes('locality')
          );
          const administrative_area_level_2 = result.address_components.find((component: any) =>
            component.types.includes('administrative_area_level_2')
          );
          return {
            formatted_address: result.formatted_address,
            locality: locality ? locality.long_name : null,
            administrative_area_level_2: administrative_area_level_2 ? administrative_area_level_2.long_name : null
          };
        }
        throw new Error('Address not found');
      })
    );
  }
  
  
}
