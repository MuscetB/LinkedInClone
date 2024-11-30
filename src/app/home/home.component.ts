import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import 'aos/dist/aos.css';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { NotificationService } from '../services/notification.service';
import { ProfileService } from '../services/profile.service';
import { UserService } from '../services/user.service';

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
        this.firestore
          .collection('users')
          .doc(user.uid)
          .valueChanges()
          .subscribe((userData: any) => {
            if (userData) {
              this.user = {
                ...userData,
                uid: user.uid,
              };
              this.userLoaded = true;
              if (this.user.connections && this.user.connections.length > 0) {
                this.loadConnectedUsers(this.user.connections);
              }
            }
          });
        if (this.user.connections && this.user.connections.length > 0) {
          this.loadConnectedUsers(this.user.connections);
        } else {
          this.user.connections = [];
        }

        // Dohvaćanje objava iz Firestore baze podataka
        this.posts = this.firestore
          .collection('posts', (ref) => ref.orderBy('timestamp', 'desc'))
          .snapshotChanges()
          .pipe(
            map((actions) =>
              actions.map((a: any) => {
                const data = a.payload.doc.data() as Post;
                const id = a.payload.doc.id;
                return {
                  id,
                  ...data,
                  likedBy: data.likedBy || [],
                };
              })
            ),
            // Pretvorba Firestore Timestamp-a u JavaScript Date
            map((posts: any) =>
              posts.map((post: any) => ({
                ...post,
                timestamp: post.timestamp.toDate(),
              }))
            )
          );
      }
    });
  }
  
  loadData(): void {
    setTimeout(() => {
      this.loading = false;
    }, 1000);
  }

  submitPost() {
    if (this.postContent.trim() && this.user && this.user.uid) {
      const post = {
        content: this.postContent,
        timestamp: new Date(),
        userId: this.user.uid,
        userName: `${this.user.firstName} ${this.user.lastName}`,
        userProfileImageUrl:
          this.user.profileImageUrl || 'assets/images/add-photo.png',
        likes: 0,
        likedBy: [],
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
        const postData = docSnapshot.data() as Post;
        const currentLikes = postData?.likes || 0;
        const likedBy = postData?.likedBy || []; // Popis korisničkih ID-ova koji su lajkali

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
      return;
    }
    this.userService.getUsersByIds(connectionIds).subscribe(
      (users) => {
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
          this.user.connections.push(request.from || request.uid);
        } else {
          this.user.connections = [request.from || request.uid];
        }

        this.loadConnectedUsers(this.user.connections);
        this.toastr.success(
          `${request.firstName} ${request.lastName} is now connected.`
        );
      })
      .catch((error) => {
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
        );
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
