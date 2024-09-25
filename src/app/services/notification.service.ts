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
          this.firestore.collection('notifications').add({
            userId: request.from, // Korisnik koji je poslao zahtjev
            message: `Your connection request to ${name} has been accepted.`,
            timestamp: new Date(),
            read: false,
          });
          this.toastr.success('Connection request accepted.');
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

  getUnreadNotifications(userId: string): Observable<any[]> {
    return this.firestore
      .collection('notifications', (ref) =>
        ref
          .where('userId', '==', userId)
          .where('read', '==', false)
          .orderBy('timestamp', 'desc')
      )
      .valueChanges({ idField: 'id' });
  }

  markNotificationAsRead(notificationId: string): Promise<void> {
    return this.firestore
      .collection('notifications')
      .doc(notificationId)
      .update({ read: true })
      .then(() => {
        console.log('Notification marked as read.');
      })
      .catch((error) => {
        console.error('Error marking notification as read:', error);
      });
  }
  
   // Method to show a success notification
  showSuccess(message: string): void {
    this.toastr.success(message);
  }

  // Method to show an error notification
  showError(message: string): void {
    this.toastr.error(message);
  }
}
