import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import 'aos/dist/aos.css';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { NotificationService } from '../notification.service';
import { ProfileService } from '../profile.service';
import { UserService } from '../user.service';

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
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  postContent: string = '';
  posts: Observable<any[]> = new Observable<any[]>();
  user: any = {};
  userLoaded: boolean = false; // Flag za učitavanje korisničkih podataka
  unreadRequests: any[] = []; // Zahtjevi za povezivanje
  connectedUsers: any[] = []; // Povezani korisnici
  loading: boolean = true; // Dodaj loader svojstvo

  

  constructor(
    private profileService: ProfileService,
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private router: Router,
    private toastr: ToastrService,
    private userService: UserService,
    private notificationService: NotificationService // Uvoz NotificationServisa
  ) {}

  ngOnInit(): void {
    this.loadData();


    this.afAuth.authState.subscribe((user) => {
      if (user) {
        // Postojeći kod za dohvaćanje korisničkih podataka
        this.firestore
          .collection('users')
          .doc(user.uid)
          .valueChanges()
          .subscribe((userData: any) => {
            if (userData) {
              this.user = {
                ...userData,
                uid: user.uid, // Postavljamo uid ručno
              };
              this.userLoaded = true; // Korisnički podaci su učitani
              if (this.user.connections && this.user.connections.length > 0) {
                this.loadConnectedUsers(this.user.connections);
              }
            }
          });
        if (this.user.connections && this.user.connections.length > 0) {
          this.loadConnectedUsers(this.user.connections); // Učitaj povezane korisnike
        } else {
          this.user.connections = []; // Inicijaliziraj connections ako je undefined
        }

        // Dohvaćanje objava iz Firestore baze podataka
        this.posts = this.firestore
          .collection('posts', (ref) => ref.orderBy('timestamp', 'desc'))
          .snapshotChanges()
          .pipe(
            map((actions) =>
              actions.map((a: any) => {
                // Koristimo snapshotChanges umjesto valueChanges
                const data = a.payload.doc.data() as Post; // Kastamo podatke u tip Post
                const id = a.payload.doc.id;
                return {
                  id,
                  ...data,
                  likedBy: data.likedBy || [], // Osiguravamo da likedBy uvijek bude niz };  // Kombiniramo id s podacima posta
                };
              })
            ),
            // Pretvorba Firestore Timestamp-a u JavaScript Date
            map((posts: any) =>
              posts.map((post: any) => ({
                ...post,
                timestamp: post.timestamp.toDate(), // Pretvaranje Firestore Timestamp u JavaScript Date
              }))
            )
          );
      }
    });
  }
  
  loadData(): void {
    // Simuliraj HTTP poziv ili dohvaćanje podataka
    setTimeout(() => {
      this.loading = false; // Nakon što podaci budu učitani, postavi loader na false
    }, 2000); // Primjer: simulirano čekanje od 2 sekunde
  }

  submitPost() {
    if (this.postContent.trim() && this.user && this.user.uid) {
      const post = {
        content: this.postContent,
        timestamp: new Date(),
        userId: this.user.uid,
        userName: `${this.user.firstName} ${this.user.lastName}`,
        userProfileImageUrl:
          this.user.profileImageUrl || 'path-to-default-profile-image',
        likes: 0, // Dodajemo polje za praćenje lajkova
        likedBy: [], // Inicijaliziramo likedBy kao prazan niz
      };

      this.firestore
        .collection('posts')
        .add(post)
        .then(() => {
          console.log('Post added successfully');
          this.postContent = '';
        })
        .catch((error) => {
          console.error('Error adding post: ', error);
        });
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
        console.log('Liked by:', likedBy);
        // Povećavamo broj lajkova
        if (likedBy.includes(this.user.uid)) {
          // Ako je korisnik već lajkao post, makni njegov lajk
          const updatedLikedBy = likedBy.filter(
            (userId: string) => userId !== this.user.uid
          );
          postRef
            .update({
              likes: currentLikes - 1,
              likedBy: updatedLikedBy,
            })
            .then(() => {
              console.log('Like removed successfully');
            })
            .catch((error) => {
              console.error('Error removing like: ', error);
            });
        } else {
          // Ako korisnik nije lajkao, dodaj njegov lajk
          postRef
            .update({
              likes: currentLikes + 1,
              likedBy: [...likedBy, this.user.uid],
            })
            .then(() => {
              console.log('Post liked successfully');
            })
            .catch((error) => {
              console.error('Error liking post: ', error);
            });
        }
      }
    });
  }

  // Učitavanje povezanih korisnika
  loadConnectedUsers(connectionIds: string[]) {
    if (!connectionIds || connectionIds.length === 0) {
      console.warn('No connections to load.');
      return; // Ako nema povezanih korisnika, izađi
    }

    this.userService.getUsersByIds(connectionIds).subscribe(
      (users) => {
        console.log('Loaded connected users:', users); // Dodaj ispis
        this.connectedUsers = users;
      },
      (error) => {
        console.error('Error loading connected users:', error);
      }
    );
  }

  // Prihvaćanje zahtjeva za povezivanje
  acceptRequest(request: any): void {
    this.notificationService
      .acceptConnectionRequest(request)
      .then(() => {
        this.unreadRequests = this.unreadRequests.filter(
          (req) => req.id !== request.id
        );
        // Ažuriraj connections
        if (this.user.connections) {
          this.user.connections.push(request.from || request.uid); // Dodaj novog korisnika u connections
        } else {
          this.user.connections = [request.from || request.uid]; // Ako connections nije inicijaliziran
        }

        // Učitaj povezane korisnike s ažuriranim connection IDs
        this.loadConnectedUsers(this.user.connections);
        this.toastr.success(
          `${request.firstName} ${request.lastName} is now connected.`
        );
      })
      .catch((error) => {
        console.error('Error accepting request: ', error);
        this.toastr.error('Failed to accept the request.');
      });
  }

  // Odbijanje zahtjeva za povezivanje
  rejectRequest(request: any) {
    this.notificationService
      .rejectConnectionRequest(request)
      .then(() => {
        this.unreadRequests = this.unreadRequests.filter(
          (req) => req.id !== request.id
        );
      })
      .catch((error) => {
        console.error('Error rejecting request: ', error);
      });
  }

  unconnectUser(userId: string): void {
    this.profileService.unconnectUser(userId).subscribe(
      () => {
        this.toastr.success('You are no longer connected.');
        this.connectedUsers = this.connectedUsers.filter(
          (user) => user.uid !== userId
        ); // Ukloni korisnika iz liste
        // Ažuriraj connections za trenutnog korisnika
        if (this.user.connections) {
          this.user.connections = this.user.connections.filter(
            (id: string) => id !== userId
          );
        }
      },
      (error) => {
        this.toastr.error('Failed to unconnect from the user.');
      }
    );
  }

  sendMessage(userId: string): void {
    this.router.navigate(['/chat', { userId }]);
  }
}
