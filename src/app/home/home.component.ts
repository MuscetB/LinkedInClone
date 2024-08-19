import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ProfileService } from '../profile.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  postContent: string = '';
  posts: Observable<any[]> = new Observable<any[]>();
  user: any = {};
  userLoaded: boolean = false; // Flag za učitavanje korisničkih podataka
  

  constructor(
    private profileService: ProfileService, 
    private afAuth: AngularFireAuth, 
    private firestore: AngularFirestore,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.afAuth.authState.subscribe(user => {
      if (user) {
        console.log('User authenticated:', user);
        this.firestore.collection('users').doc(user.uid).valueChanges().pipe(
          catchError(err => {
            console.error('Error fetching user data:', err);
            return of(null);
          })
        ).subscribe((userData: any) => {
          if (userData) {
            this.user = {
              ...userData,
              uid: user.uid  // Postavljamo uid ručno
            };
            this.userLoaded = true; // Korisnički podaci su učitani
            console.log('User data loaded:', this.user);
          } else {
            console.error('No user data found for UID:', user.uid);
          }
        });

        // Dohvaćanje objava iz Firestore baze podataka
        this.posts = this.firestore.collection('posts', ref => ref.orderBy('timestamp', 'desc')).valueChanges().pipe(
          catchError(err => {
            console.error('Error fetching posts:', err);
            return of([]);
          })
        );
        this.posts.subscribe(posts => {
          console.log('Fetched posts:', posts);
        });
  
      } else {
        console.error('User not authenticated');
      }
    });
  }

  submitPost() {
    if (this.postContent.trim() && this.user && this.user.uid) {
      const post = {
        content: this.postContent,
        timestamp: new Date(),
        userId: this.user.uid,
        userName: `${this.user.firstName} ${this.user.lastName}`,
        userProfileImageUrl: this.user.profileImageUrl || 'path-to-default-profile-image'
      };

      this.firestore.collection('posts').add(post).then(() => {
        console.log('Post added successfully');
        this.postContent = '';
      }).catch((error) => {
        console.error('Error adding post: ', error);
      });
    } else {
      console.error('User data is not available or post content is empty.');
      console.log('Post content:', this.postContent);
      console.log('User data:', this.user);
    }
  }
  
  goToProfile(userId: string): void {
    this.router.navigate(['/profile', userId]);
  }
  
  
}
