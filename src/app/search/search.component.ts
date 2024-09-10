import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FormControl } from '@angular/forms';
import { map, Observable, of, startWith } from 'rxjs';
import { AuthService } from '../auth.service';
import { GeocodingService } from '../geocoding.service';
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
  currentUser: any;
  skillControl = new FormControl('');
  filteredSkills$: Observable<string[]> = of([]);  // Inicijalizacija kao prazan niz
  isDropdownVisible: boolean = false;  // Dodano svojstvo za upravljanje dropdownom

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
    private skillsService: SkillsService
  ) {}

  ngOnInit(): void {
    // Dobij trenutno prijavljenog korisnika
    this.authService.getCurrentUserDetails().then(user => {
      this.currentUser = user;
    });

    this.firestore.collection('users').valueChanges().subscribe((users) => {
      this.users = users;
    });
      
    // Filtriraj veštine na osnovu unosa korisnika
    this.filteredSkills$ = this.skillControl.valueChanges.pipe(
      startWith(''),
      map(value => this.filterSkills(value ?? ''))
    );
  }

  searchUsers() {
    console.log('Searching for users...');
    const skillInput: string = this.skillControl.value ?? '';
    
    if (!this.location) {
      console.error('Location is empty. Please provide a valid location.');
      return;
    }

    this.geocodingService.getCoordinates(this.location).subscribe(
      (coords) => {
        console.log('Coordinates:', coords);
        this.center = coords;
        this.filteredUsers = [];
  
        this.users.forEach(user => {
          if (!user.position || !user.position.lat || !user.position.lng) {
            console.warn(`User ${user.firstName || 'Unnamed User'} does not have valid position data.`);
            return;
          }
  
          const distance = this.calculateDistance(this.center, user.position);
          
          // Ensure skills is always treated as an array
          const skillsArray = Array.isArray(user.skills) ? user.skills : [];
  
          const hasMatchingSkill = skillsArray.some((skill: any) => {
            const skillName = typeof skill === 'string' ? skill : skill.skillName;
            return skillName && skillName.toLowerCase().includes(skillInput.toLowerCase());
          });
          
          if (user.uid === this.currentUser.uid) {
            console.log('Skipping current user from search results');
            return;
          }
  
          if (distance <= this.radius && hasMatchingSkill) {
            this.geocodingService.getReverseGeocode(user.position.lat, user.position.lng).subscribe(
              (addressData) => {
                user.address = addressData.formatted_address;
                user.city = addressData.locality || addressData.administrative_area_level_2 || '';
                this.filteredUsers.push(user);
                this.showMap = this.filteredUsers.length > 0;
                console.log('Filtered users:', this.filteredUsers);
              },
              (error) => {
                console.error('Error getting address from coordinates:', error);
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
    this.filteredSkills$ = of([]); // Resetovanje filtriranih veština
    this.isDropdownVisible = false;  // Sakrivanje dropdowna kada je veština odabrana
  }
  
  public filterSkills(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.skillsService.getSkills().filter(skill =>
      skill.toLowerCase().includes(filterValue)
    );
  }
  
  public onSkillInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input?.value ?? '';
    this.filteredSkills$ = of(this.filterSkills(value)); // Ažuriranje filteredSkills$
  }
  
  public showDropdown(): void {
    this.isDropdownVisible = true;
  }

  public hideDropdown(event: FocusEvent): void {
    const relatedTarget = event.relatedTarget as HTMLElement;
    if (relatedTarget && relatedTarget.closest('.list-group')) {
        return; // Ne zatvarajte dropdown ako se fokus pomera unutar liste
    }
    
    setTimeout(() => {
        this.isDropdownVisible = false;
    }, 200);
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

  deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
