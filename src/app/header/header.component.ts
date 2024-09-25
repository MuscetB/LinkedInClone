import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router'; // Dodano
import Swal from 'sweetalert2';
import { AuthService } from '../auth.service';
import { ChatService } from '../chat.service';
import { HeaderService } from '../header.service';
import { NotificationService } from '../notification.service';
import { UserService } from '../user.service'; // Dodano

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit {
  searchQuery: string = '';
  searchResults: any[] = [];
  dropdownStyle: any = {}; // Dodano
  @ViewChild('searchBox', { static: false }) searchBox!: ElementRef;
  loading: boolean = false;
  unreadRequests: any[] = [];
  unreadNotifications: any[] = [];
  notificationsVisible: boolean = false;
  showDialog: boolean = false;
  userId: string = ''; // Dodana varijabla za spremanje korisničkog ID-a


  constructor(
    public authService: AuthService,
    private chatService: ChatService,
    private firestore: AngularFirestore,
    private userService: UserService, // Dodano
    private router: Router, // Dodano
    public headerService: HeaderService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    // Prvo dohvaćamo trenutnog korisnika i njegov ID
    this.authService.getUser().subscribe((user) => {
      if (user) {
        this.userId = user.uid; // Postavljamo userId s ID-om trenutnog korisnika

        // Zatim pratimo zahtjeve za povezivanje koristeći dobiveni userId
        this.notificationService
          .trackConnectionRequests(this.userId)
          .subscribe((requests) => {
            this.unreadRequests = requests;
            console.log('Unread Requests:', this.unreadRequests);
          });
        

        this.loadUnreadRequests(user.uid);
        this.loadUnreadNotifications(user.uid);
      }
    });
  }

  searchUsers(): void {
    console.log('Searching for:', this.searchQuery);
    if (this.searchQuery.trim() === '') {
      this.searchResults = [];
      return;
    }

    this.userService.searchUsers(this.searchQuery).subscribe((users) => {
      console.log('Users found:', users);
      this.searchResults = users;
      this.positionDropdown();
    });
  }

  viewProfile(userId: string): void {
    if (!userId) {
      console.error('User ID is undefined');
      return; // Prevent navigation if userId is undefined
    }

    console.log('Navigating to profile with ID:', userId);
    this.router.navigate(['/profile', userId]);
    // Close the dialog after navigating
    this.showDialog = false;
    this.searchResults = [];
    this.searchQuery = '';
  }

  logout(): void {
    // Prikaži modal s potvrdom putem SweetAlert2
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you really want to log out?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, log out',
      cancelButtonText: 'No, stay here',
      customClass: {
        popup: 'swal-wide', // Dodajemo klasu za prilagodbu veličine
        title: 'swal-title', // Dodajemo klasu za prilagodbu naslova
        confirmButton: 'swal-confirm-button', // Prilagodba gumba
        cancelButton: 'swal-cancel-button', // Prilagodba gumba za odustajanje
      },
    }).then((result) => {
      if (result.isConfirmed) {
        // Ako korisnik potvrdi, izvrši odjavu s loaderom
        this.loading = true; // Prikazivanje loadera u komponenti

        this.authService.logout().finally(() => {
          this.loading = false; // Isključivanje loadera nakon logout-a
        });
      }
    });
  }

  positionDropdown(): void {
    const searchBoxPos = this.searchBox.nativeElement.getBoundingClientRect();
    console.log('searchBoxPos:', searchBoxPos);
    this.dropdownStyle = {
      top: `${searchBoxPos.bottom + window.scrollY}px`,
      left: `${searchBoxPos.left}px`,
      width: `${searchBoxPos.width}px`,
    };
    console.log('dropdownStyle:', this.dropdownStyle);
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
      this.unreadRequests = this.unreadRequests.filter((req) => req.id !== request.id);
    });
  }

  // Funkcija za odbijanje zahtjeva
  rejectRequest(request: any) {
    this.notificationService.rejectConnectionRequest(request).then(() => {
      this.unreadRequests = this.unreadRequests.filter((req) => req.id !== request.id);
    });
  }

  // Funkcija za označavanje obavijesti kao pročitano
  markNotificationAsRead(notificationId: string) {
    this.notificationService.markNotificationAsRead(notificationId).then(() => {
      this.unreadNotifications = this.unreadNotifications.filter((notification) => notification.id !== notificationId);
    });
  }
}
