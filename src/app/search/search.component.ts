import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { GeocodingService } from '../geocoding.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit{
  location: string = '';
  radius: number = 5;
  skill: string = '';
  users: any[] = [];
  filteredUsers: any[] = [];
  center: google.maps.LatLngLiteral = { lat: 0, lng: 0 };
  zoom = 12;
  showMap = false;

  circleOptions: google.maps.CircleOptions = {
    fillColor: 'lightblue',
    fillOpacity: 0.4, 
    strokeColor: 'blue',
    strokeOpacity: 0.8,
    strokeWeight: 1,
  };

  // allUsers = [
  //   { name: 'Alice', skill: 'Graphic Designer', location: 'Zadar', position: { lat: 44.119371, lng: 15.231364 } },
  //   { name: 'Bob', skill: 'Web Developer', location: 'Zadar', position: { lat: 44.119371, lng: 15.231364 } },
  //   { name: 'Charlie', skill: 'Graphic Designer', location: 'Split', position: { lat: 43.508133, lng: 16.440193 } },
  //   { name: 'Dave', skill: 'Web Developer', location: 'Zadar', position: { lat: 44.120000, lng: 15.233333 } },
  //   { name: 'Eve', skill: 'Web Developer', location: 'Zagreb', position: { lat: 45.815399, lng: 15.966568 } }
  // ];

  constructor(private geocodingService: GeocodingService, private firestore: AngularFirestore) { }
  
  ngOnInit(): void {
      this.firestore.collection('users').valueChanges().subscribe(users => {
        this.users = users;
      })
  }

  searchUsers() {
    console.log('Searching for users...');
    if (!this.location) {
      console.error('Location is empty. Please provide a valid location.');
      return;
    }
    this.geocodingService.getCoordinates(this.location).subscribe(
      (coords) => {
        console.log('Coordinates:', coords); // Dodano logiranje koordinata
        this.center = coords;
        this.filteredUsers = this.users.filter(user => {
          if(!user.position || !user.position.lat || !user.position.lng) {
            console.warn(`User ${user.name} does not have valid position data.`);
            return false;
          }
          const distance = this.calculateDistance(this.center, user.position);
          return distance <= this.radius && user.skills.toLowerCase().includes(this.skill.toLowerCase());
        });
        this.showMap = true;
        console.log('Filtered users:', this.filteredUsers); // Dodano logiranje filtriranih korisnika
      },
      (error) => {
        console.error('Error getting location coordinates', error);
        this.showMap = false;
      }
    );
  }

  calculateDistance(center: google.maps.LatLngLiteral, position: google.maps.LatLngLiteral): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(position.lat - center.lat);
    const dLng = this.deg2rad(position.lng - center.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(center.lat)) * Math.cos(this.deg2rad(position.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  }

  deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
