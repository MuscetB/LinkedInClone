import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ProfileService } from '../profile.service';

interface Post {
  id?: string;
  content: string;
  timestamp: any;
  userId: string;
  userName: string;
  userProfileImageUrl: string;
  likes: number;
  likedBy: string[];
}

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
        this.posts = this.firestore.collection('posts', ref => ref.orderBy('timestamp', 'desc')).snapshotChanges().pipe(
          map(actions => actions.map((a: any) => {  // Koristimo snapshotChanges umjesto valueChanges
            const data = a.payload.doc.data() as Post;  // Kastamo podatke u tip Post
            const id = a.payload.doc.id;
            return { id, ...data, likedBy: data.likedBy || [] // Osiguravamo da likedBy uvijek bude niz };  // Kombiniramo id s podacima posta
      }})),
          catchError(err => {
            console.error('Error fetching posts:', err);
            return of([]);
          }),
          // Pretvorba Firestore Timestamp-a u JavaScript Date
          map((posts: any) => posts.map((post: any) => ({
            ...post,
            timestamp: post.timestamp.toDate()  // Pretvaranje Firestore Timestamp u JavaScript Date
          })))
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
        userProfileImageUrl: this.user.profileImageUrl || 'path-to-default-profile-image',
        likes: 0,  // Dodajemo polje za praćenje lajkova
        likedBy: []             // Inicijaliziramo likedBy kao prazan niz
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
  
  toggleLike(post: Post) {
    const postRef = this.firestore.collection('posts').doc(post.id);
    
    // Provjeravamo trenutno stanje lajkova
    postRef.get().subscribe((docSnapshot) => {
      if (docSnapshot.exists) {
        // Kastamo podatke u tip Post
        const postData = docSnapshot.data() as Post;
        const currentLikes = postData?.likes || 0;
        const likedBy = postData?.likedBy || []; // Popis korisničkih ID-ova koji su lajkali

    
        // Debugging log:
      console.log("Liked by:", likedBy);
        // Povećavamo broj lajkova
        if (likedBy.includes(this.user.uid)) {
          // Ako je korisnik već lajkao post, makni njegov lajk
          const updatedLikedBy = likedBy.filter((userId: string) => userId !== this.user.uid);
          postRef.update({
            likes: currentLikes - 1,
            likedBy: updatedLikedBy
          }).then(() => {
            console.log('Like removed successfully');
          }).catch((error) => {
            console.error('Error removing like: ', error);
          });
        } else {
          // Ako korisnik nije lajkao, dodaj njegov lajk
          postRef.update({
            likes: currentLikes + 1,
            likedBy: [...likedBy, this.user.uid]
          }).then(() => {
            console.log('Post liked successfully');
          }).catch((error) => {
            console.error('Error liking post: ', error);
          });
        }
      }
    });
  }
}
