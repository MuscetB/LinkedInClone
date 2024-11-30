import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';
import { ToastrService } from 'ngx-toastr';
import { combineLatest, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(
    private firestore: AngularFirestore,
    private userService: UserService,
    private toastr: ToastrService
  ) {}

  // Funkcija za praćenje zahtjeva za povezivanje
  trackConnectionRequests(userId: string): Observable<any[]> {
    return this.firestore
      .collection('connectionRequests', (ref) =>
        ref.where('to', '==', userId).where('status', '==', 'pending')
      )
      .snapshotChanges()
      .pipe(
        switchMap((requests) => {
          // Dohvati sve request podatke
          const requestDocs = requests.map((requestSnapshot: any) => {
            const request = requestSnapshot.payload.doc.data();
            request.id = requestSnapshot.payload.doc.id;
            return request;
          });

          // Kreiraj niz observables koji dohvaćaju korisničke podatke
          const userObservables = requestDocs.map((request) =>
            this.userService.getUserById(request.from).pipe(
              map((userData) => ({
                ...request,
                firstName: userData?.firstName || 'Unknown',
                lastName: userData?.lastName || 'Unknown',
                profileImageUrl:
                  userData?.profileImageUrl || 'assets/default-profile.png',
              }))
            )
          );

          // Kombiniraj sve observables u jedan observable koji vraća niz zahtjeva sa korisničkim podacima
          return combineLatest(userObservables);
        })
      );
  }
  // Prihvaćanje zahtjeva za povezivanje
  acceptConnectionRequest(request: any): Promise<void> {
    const userToUpdate = this.firestore
      .collection('users')
      .doc(request.to)
      .update({
        connections: firebase.firestore.FieldValue.arrayUnion(request.from),
      });

    const userFromUpdate = this.firestore
      .collection('users')
      .doc(request.from)
      .update({
        connections: firebase.firestore.FieldValue.arrayUnion(request.to),
      });

    // Dohvati ime korisnika koji je prihvatio zahtjev
    const userToName = this.userService.getUserById(request.to).pipe(
      map((userData: any) => {
        return `${userData.firstName} ${userData.lastName}`;
      })
    );

    const requestStatusUpdate = this.updateRequestStatus(
      request.id,
      'accepted'
    );

    return Promise.all([userToUpdate, userFromUpdate, requestStatusUpdate])
    .then(() => {
      userToName.subscribe((name) => {
        // Provjeri postoji li već obavijest za ovaj zahtjev
        this.firestore
          .collection('notifications', (ref) =>
            ref
              .where('userId', '==', request.from)
              .where('message', '==', `Your connection request to ${name} has been accepted.`)
          )
          .get()
          .subscribe((snapshot) => {
            if (snapshot.empty) {
              // Dodaj novu obavijest samo ako ne postoji
              this.firestore.collection('notifications').add({
                userId: request.from,
                message: `Your connection request to ${name} has been accepted.`,
                timestamp: new Date(),
                read: false,
              });
              this.toastr.success('Connection request accepted.');
            } else {
              console.log('Notification already exists. Skipping duplicate.');
            }
          });
      });
    })
    .catch((error) => {
      console.error('Error accepting request: ', error);
      this.toastr.error('Failed to accept the request.');
    });
  }

  // Odbijanje zahtjeva za povezivanje
  rejectConnectionRequest(request: any): Promise<void> {
    return this.updateRequestStatus(request.id, 'rejected')
      .then(() => console.log('Request rejected successfully'))
      .catch((error) => console.error('Error rejecting request: ', error));
  }

  // Ažuriranje statusa zahtjeva
  private updateRequestStatus(
    requestId: string,
    status: string
  ): Promise<void> {
    return this.firestore
      .collection('connectionRequests')
      .doc(requestId)
      .update({
        status: status,
      });
  }

  // Dohvaćanje nepročitanih obavijesti
  getUnreadNotifications(userId: string): Observable<any[]> {
    return this.firestore
      .collection('notifications', (ref) =>
        ref
          .where('userId', '==', userId)
          .where('read', '==', false) // Filtriraj samo nepročitane obavijesti
          .orderBy('timestamp', 'desc')
      )
      .snapshotChanges()
      .pipe(
        map((actions) =>
          actions.map((a) => {
            const data = a.payload.doc.data() as any;
            const id = a.payload.doc.id;
            return { id, ...data };
          })
        )
      );
  }
  
 // Označavanje obavijesti kao pročitane i brisanje iz baze
 markNotificationAsReadAndDelete(notificationId: string): Promise<void> {
  const notificationRef = this.firestore.collection('notifications').doc(notificationId);

  return notificationRef
    .update({ read: true }) // Ažuriraj status na "pročitano"
    .then(() => notificationRef.delete()) // Zatim trajno ukloni obavijest
    .then(() => {
      this.toastr.success('Notification marked as read and removed.');
    })
    .catch((error) => {
      console.error('Error marking notification as read:', error);
      this.toastr.error('Failed to mark notification as read.');
    });
}

  // Metoda za prikaz uspješne obavijsti
  showSuccess(message: string): void {
    this.toastr.success(message);
  }

  // Metoda za prikaz neuspješne obavijsti
  showError(message: string): void {
    this.toastr.error(message);
  }
}
