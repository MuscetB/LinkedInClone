import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { HeaderService } from '../services/header.service';
import { NotificationService } from '../services/notification.service';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit {
  searchQuery: string = '';
  searchResults: any[] = [];
  dropdownStyle: any = {};
  @ViewChild('searchBox', { static: false }) searchBox!: ElementRef;
  loading: boolean = false;
  unreadRequests: any[] = [];
  unreadNotifications: any[] = [];
  notificationsVisible: boolean = false;
  showDialog: boolean = false;
  userId: string = '';

  constructor(
    public authService: AuthService,
    private userService: UserService,
    private router: Router,
    public headerService: HeaderService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.authService.getUser().subscribe((user) => {
      if (user) {
        this.userId = user.uid;

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
    if (this.searchQuery.trim() === '') {
      this.searchResults = [];
      return;
    }

    this.userService.searchUsers(this.searchQuery).subscribe((users) => {
      this.searchResults = users;
      this.positionDropdown();
    });
  }

  viewProfile(userId: string): void {
    if (!userId) {
      return;
    }
    this.router.navigate(['/profile', userId]);
    this.closeSearchDialog();
  }

  closeSearchDialog() {
    this.showDialog = false;
    this.searchResults = [];
    this.searchQuery = '';
  }

  logout(): void {
    this.authService.confirmAndLogout().finally(() => {
      this.loading = false;
    });
  }

  positionDropdown(): void {
    const searchBoxPos = this.searchBox.nativeElement.getBoundingClientRect();
    this.dropdownStyle = {
      top: `${searchBoxPos.bottom + window.scrollY}px`,
      left: `${searchBoxPos.left}px`,
      width: `${searchBoxPos.width}px`,
    };
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
    this.notificationService.markNotificationAsRead(notificationId).then(() => {
      this.unreadNotifications = this.unreadNotifications.filter(
        (notification) => notification.id !== notificationId
      );
    });
  }
}
