import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router'; // Dodano
import { map } from 'rxjs/operators';
import { AuthService } from '../auth.service';
import { ChatService } from '../chat.service';
import { UserService } from '../user.service'; // Dodano

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  unreadMessagesCount: number = 0;
  searchQuery: string = '';
  searchResults: any[] = [];
  dropdownStyle: any = {}; // Dodano
  @ViewChild('searchBox', { static: false }) searchBox!: ElementRef; 

  constructor(
    public authService: AuthService,
    private chatService: ChatService,
    private firestore: AngularFirestore,
    private userService: UserService, // Dodano
    private router: Router // Dodano
  ) {}

  ngOnInit(): void {
    this.authService.getUser().subscribe(user => {
      if (user) {
        this.chatService.getConversations(user.uid).pipe(
          map(conversations => conversations.filter(conversation => conversation.unread))
        ).subscribe(unreadConversations => {
          this.unreadMessagesCount = unreadConversations.length;
        });
      }
    });
  }

  searchUsers(): void {
    console.log('Searching for:', this.searchQuery);
    if (this.searchQuery.trim() === '') {
      this.searchResults = [];
      return;
    }

    this.userService.searchUsers(this.searchQuery).subscribe(users => {
      console.log('Users found:', users);
      this.searchResults = users;
      this.positionDropdown();
    });
  }
  
  
  viewProfile(userId: string): void {
    this.router.navigate(['/profile', userId]);
    this.searchResults = [];
    this.searchQuery = '';
  }

  logout(): void {
    this.authService.logout();
  }
  
  positionDropdown(): void {
    const searchBoxPos = this.searchBox.nativeElement.getBoundingClientRect();
    console.log('searchBoxPos:', searchBoxPos);
    this.dropdownStyle = {
      top: `${searchBoxPos.bottom + window.scrollY}px`,
      left: `${searchBoxPos.left}px`,
      width: `${searchBoxPos.width}px`
    };
    console.log('dropdownStyle:', this.dropdownStyle);
  }
  
}
