import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { HeaderService } from '../services/header.service';
import { NotificationService } from '../services/notification.service';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit, AfterViewInit ,OnDestroy {
  searchQuery: string = '';
  searchResults: any[] = [];
  toggleSearch: boolean = false;
  dropdownOpen: boolean = false;


  dropdownStyle: any = {};
  @ViewChild('searchbar', { static: false }) searchbar!: ElementRef;
  loading: boolean = false;
  unreadRequests: any[] = [];
  unreadNotifications: any[] = [];
  notificationsVisible: boolean = false;
  showDialog: boolean = false;
  userId: string = '';

  private clickListener!: () => void;
  private routerSubscription!: Subscription;
  private searchSubscription!: Subscription;
  
  constructor(
    public authService: AuthService,
    private userService: UserService,
    private router: Router,
    public headerService: HeaderService,
    private notificationService: NotificationService,
    private renderer: Renderer2

  ) {}

  ngOnInit() {

  // Resetiraj dropdown pri navigaciji
  this.routerSubscription = this.router.events.subscribe((event) => {
    if (event instanceof NavigationEnd) {
      this.dropdownOpen = false; // Resetiraj stanje
      this.searchClose(); // Osiguraj da se dropdown zatvori
    }
  });

    this.authService.getUser().subscribe((user) => {
      if (user) {

        this.userId = user.uid;

        // Zatim pratimo zahtjeve za povezivanje koristeći dobiveni userId
        this.notificationService
          .trackConnectionRequests(this.userId)
          .subscribe((requests) => {
            this.unreadRequests = requests;
          });

        this.loadUnreadRequests(user.uid);
        this.loadUnreadNotifications(user.uid);
        this.addClickOutsideListener();
      }
    });
  }
  
  ngOnDestroy(): void {
  
    // Ukloni listener kad se komponenta uništi
    if (this.clickListener) {
      this.clickListener();
    }
  
    // Uništi pretplatu ako postoji
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  
    // Odjavi se od router-a
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }
  
  ngAfterViewInit() {
    console.log('Searchbar initialized:', this.searchbar?.nativeElement);
  }
  
  
  openSearch(): void {
    this.toggleSearch = true;
    this.dropdownOpen = true;

    setTimeout(() => {
      if (this.searchbar) {
        this.searchbar.nativeElement.focus();
      } else {
        console.log('Search bar element not found.');
      }
    }, 0);
  }
  
  searchClose(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.toggleSearch = false;
    this.dropdownOpen = false;

    // Uništi pretplatu ako postoji
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  searchUsers(): void {
    if (this.searchQuery.trim() === '') {
      this.searchResults = [];
      this.dropdownOpen = false; // Zatvori dropdown ako nema rezultata
      return;
    }
  
  
    // Pretplata na pretragu
    this.searchSubscription = this.userService.searchUsers(this.searchQuery).subscribe((users) => {
      this.searchResults = users;
      this.dropdownOpen = users.length > 0; // Otvori dropdown samo ako ima rezultata
    });
  }
  

  viewProfile(userId: string): void {
    if (!userId) return;

    this.router.navigate(['/profile', userId]);
    this.searchClose();
  }

  addClickOutsideListener(): void {
  
    this.clickListener = this.renderer.listen('document', 'click', (event: Event) => {
      const targetElement = event.target as HTMLElement;
  
  
      // Provjeri je li klik unutar search bar-a ili dropdown-a
      const isInsideSearchBar =
        this.searchbar?.nativeElement.contains(targetElement) ||
        targetElement.closest('.search-dropdown') !== null;
  
  
      if (this.dropdownOpen && !isInsideSearchBar) {
        this.searchClose();
      } else {
      }
    });
  }
  
  logout(): void {
    this.authService.confirmAndLogout().finally(() => {
      this.loading = false;
    });
  }

  toggleNotifications() {
    this.showDialog = !this.showDialog;
  }

  // Dohvaćanje zahtjeva za povezivanje
  loadUnreadRequests(userId: string) {
    this.notificationService
      .trackConnectionRequests(userId)
      .subscribe((requests) => {
        this.unreadRequests = requests;
      });
  }

  // Dohvaćanje nepročitanih obavijesti
  loadUnreadNotifications(userId: string) {
    this.notificationService
      .getUnreadNotifications(userId)
      .subscribe((notifications) => {
        this.unreadNotifications = notifications;
      });
  }

  // Funkcija za prihvaćanje zahtjeva za povezivanje
  acceptRequest(request: any) {
    this.notificationService.acceptConnectionRequest(request).then(() => {
      this.unreadRequests = this.unreadRequests.filter(
        (req) => req.id !== request.id
      );
    });
  }

  // Funkcija za odbijanje zahtjeva
  rejectRequest(request: any) {
    this.notificationService.rejectConnectionRequest(request).then(() => {
      this.unreadRequests = this.unreadRequests.filter(
        (req) => req.id !== request.id
      );
    });
  }

  // Funkcija za označavanje obavijesti kao pročitano
 markNotificationAsRead(notificationId: string) {
  this.notificationService.markNotificationAsReadAndDelete(notificationId).then(() => {
    // Ukloni obavijest iz lokalne liste
    this.unreadNotifications = this.unreadNotifications.filter(
      (notification) => notification.id !== notificationId
    );
  });
}

}
