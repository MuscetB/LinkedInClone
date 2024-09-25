import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { map, Observable, of, startWith } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { GeocodingService } from '../services/geocoding.service';
import { NotificationService } from '../services/notification.service';
import { ProfileService } from '../services/profile.service';
import { SkillsService } from '../services/skills.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css'],
})
export class SearchComponent implements OnInit {
  location: string = '';
  radius: number = 5;
  skill: string = '';
  users: any[] = [];
  filteredUsers: any[] = [];
  center: google.maps.LatLngLiteral = { lat: 0, lng: 0 };
  zoom = 12;
  showMap = false;
  searchAttempted: boolean = false;
  locationError: boolean = false;
  currentUser: any;
  skillControl = new FormControl('');
  filteredSkills$: Observable<string[]> = of([]);
  isDropdownVisible: boolean = false;

  circleOptions: google.maps.CircleOptions = {
    fillColor: 'lightblue',
    fillOpacity: 0.4,
    strokeColor: 'blue',
    strokeOpacity: 0.8,
    strokeWeight: 1,
  };

  constructor(
    private geocodingService: GeocodingService,
    private firestore: AngularFirestore,
    private authService: AuthService,
    private skillsService: SkillsService,
    private notificationService: NotificationService,
    private profileService: ProfileService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Dobij trenutno prijavljenog korisnika
    this.authService.getCurrentUserDetails().then((user) => {
      this.currentUser = user;
    });

    this.firestore
      .collection('users')
      .valueChanges()
      .subscribe((users) => {
        this.users = users;
        this.checkConnectionStatus();
      });

    // Filtriraj veštine na osnovu unosa korisnika
    this.filteredSkills$ = this.skillControl.valueChanges.pipe(
      startWith(''),
      map((value) => this.filterSkills(value ?? ''))
    );
  }

  sendConnectionRequest(user: any) {
    const connectionRequest = {
      from: this.currentUser.uid, // Trenutni korisnik šalje zahtjev
      to: user.uid, // Korisnik koji prima zahtjev
      timestamp: new Date(),
      status: 'pending', // Status je 'pending' na početku
    };

    // Dodaj zahtjev za povezivanje u Firestore
    this.firestore
      .collection('connectionRequests')
      .add(connectionRequest)
      .then(() => {
        // Ažuriraj status korisnika kako bi se prikazao "Pending"
        user.requestStatus = 'pending';

        // Prikaz obavijesti o uspješnom slanju zahtjeva
        this.notificationService.showSuccess('Connection request sent.');

        // Ponovno provjeri status povezivanja nakon slanja
        this.checkConnectionStatus();
      })
      .catch((error) => {
        // Prikaz greške ako zahtjev ne uspije
        this.notificationService.showError(
          'Failed to send connection request.'
        );
        console.error('Error sending connection request:', error);
      });
  }

  checkConnectionStatus() {
    this.filteredUsers.forEach((user) => {
      // Provjeri status veze pomoću ProfileService
      this.profileService.checkConnection(user.uid).subscribe((isConnected) => {
        user.isConnected = isConnected;

        // Ako korisnik nije povezan, provjeri postoje li zahtjevi na čekanju
        if (!isConnected) {
          this.firestore
            .collection('connectionRequests', (ref) =>
              ref
                .where('from', '==', this.currentUser.uid)
                .where('to', '==', user.uid)
                .where('status', '==', 'pending')
            )
            .valueChanges()
            .subscribe((requests) => {
              user.requestStatus = requests.length > 0 ? 'pending' : null;
            });
        } else {
          user.requestStatus = 'accepted';
        }
      });
    });
  }

  viewProfile(user: any): void {
    this.router.navigate(['/profile', user.uid]);
  }

  startChat(user: any) {
    if (user.isConnected) {
      this.router.navigate(['/chat', { userId: user.uid }]);
    }
  }

  searchUsers() {
    this.searchAttempted = true; // Označava da je pretraga pokrenuta

    const skillInput: string = this.skillControl.value ?? '';

    // Provjera je li lokacija unesena
    if (!this.location) {
      this.locationError = true; // Prikaz pogreške za praznu lokaciju
      return;
    }
    this.locationError = false;

    this.geocodingService.getCoordinates(this.location).subscribe(
      (coords) => {
        console.log('Coordinates:', coords);
        this.center = coords;
        this.filteredUsers = [];

        this.users.forEach((user) => {
          if (!user.position || !user.position.lat || !user.position.lng) {
            console.warn(
              `User ${
                user.firstName || 'Unnamed User'
              } does not have valid position data.`
            );
            return;
          }

          const distance = this.calculateDistance(this.center, user.position);

          const skillsArray = Array.isArray(user.skills) ? user.skills : [];

          const hasMatchingSkill = skillsArray.some((skill: any) => {
            const skillName =
              typeof skill === 'string' ? skill : skill.skillName;
            return (
              skillName &&
              skillName.toLowerCase().includes(skillInput.toLowerCase())
            );
          });

          if (user.uid === this.currentUser.uid) {
            console.log('Skipping current user from search results');
            return;
          }

          if (distance <= this.radius && hasMatchingSkill) {
            this.geocodingService
              .getReverseGeocode(user.position.lat, user.position.lng)
              .subscribe(
                (addressData) => {
                  user.address = addressData.formatted_address;
                  user.city =
                    addressData.locality ||
                    addressData.administrative_area_level_2 ||
                    '';
                  this.filteredUsers.push(user);
                  this.showMap = this.filteredUsers.length > 0;
                  console.log('Filtered users:', this.filteredUsers);
                  this.checkConnectionStatus();
                },
                (error) => {
                  console.error(
                    'Error getting address from coordinates:',
                    error
                  );
                }
              );
          }
        });
      },
      (error) => {
        console.error('Error getting location coordinates', error);
        this.showMap = false;
      }
    );
  }

  selectSkill(skill: string): void {
    this.skillControl.setValue(skill);
    this.filteredSkills$ = of([]);
    this.isDropdownVisible = false;
  }

  public filterSkills(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.skillsService
      .getSkills()
      .filter((skill) => skill.toLowerCase().includes(filterValue));
  }

  public onSkillInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input?.value ?? '';
    this.filteredSkills$ = of(this.filterSkills(value));
  }

  public showDropdown(): void {
    this.isDropdownVisible = true;
  }

  public hideDropdown(event: FocusEvent): void {
    const relatedTarget = event.relatedTarget as HTMLElement;
    if (relatedTarget && relatedTarget.closest('.list-group')) {
      return;
    }

    setTimeout(() => {
      this.isDropdownVisible = false;
    }, 200);
  }

  focusOnMap(user: any): void {
    // Postavi centar mape na korisnikovu lokaciju
    this.center = { lat: user.position.lat, lng: user.position.lng };

    // Povećaj zoom za detaljniji prikaz
    this.zoom = 15;

    // Dodaj jednostavnu animaciju ili efekt
    const mapElement = document.querySelector('google-map');
    if (mapElement) {
      mapElement.classList.add('map-zoom-animation');
      setTimeout(() => mapElement.classList.remove('map-zoom-animation'), 1000);
    }
  }

  calculateDistance(
    center: google.maps.LatLngLiteral,
    position: google.maps.LatLngLiteral
  ): number {
    const R = 6371;
    const dLat = this.deg2rad(position.lat - center.lat);
    const dLng = this.deg2rad(position.lng - center.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(center.lat)) *
        Math.cos(this.deg2rad(position.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  }

  onMapMarkerClick(user: any, index: number): void {
    const listItem = document.getElementById(`user-${index}`);

    if (listItem) {
      listItem.scrollIntoView({ behavior: 'smooth' });
      listItem.classList.add('blink'); // Dodaj efekt bljeskanja
      setTimeout(() => listItem.classList.remove('blink'), 3000); // Ukloni efekt nakon 3 sekunde
    }
  }

  deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
  resetForm(): void {
    this.location = '';
    this.radius = 5;
    this.skillControl.setValue('');
    this.filteredUsers = [];
    this.showMap = false;
  }
}
