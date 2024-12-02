import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';
import { Observable, of, switchMap } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  constructor(private firestore: AngularFirestore, private authService: AuthService) {}

  getUserData(): Observable<any> {
    return this.authService.getUser().pipe(
      switchMap(user => {
        if (user) {
          return this.firestore.collection('users').doc(user.uid).valueChanges();
        } else {
          throw new Error('User not authenticated');
        }
      })
    );
  }

  updateUserData(userData: any): Promise<void> {
    return this.authService.getUser().pipe(
      switchMap(user => {
        if (user) {
          return this.firestore.collection('users').doc(user.uid).update(userData);
        } else {
          return Promise.reject('User not authenticated');
        }
      })
    ).toPromise();
  }

  searchUsers(query: string): Observable<any[]> {
    return this.firestore.collection('users', ref => ref
      .orderBy('firstName')
      .startAt(query)
      .endAt(query + '\uf8ff')
    ).valueChanges();
  }
  
  checkConnection(userId: string): Observable<boolean> {
    return this.authService.getUser().pipe(
      switchMap(currentUser => {
        if (!currentUser) {
          return of(false);
        }
        return this.firestore
          .doc(`users/${currentUser.uid}`)
          .valueChanges()
          .pipe(
            switchMap((userData: any) => {
              return of(userData.connections && userData.connections.includes(userId));
            })
          );
      })
    );
  }
  
  unconnectUser(userId: string): Observable<Promise<void>> {
    return this.authService.getUser().pipe(
      switchMap(currentUser => {
        if (!currentUser) {
          throw new Error('User not authenticated');
        }
        const currentUserRef = this.firestore.doc(`users/${currentUser.uid}`);
        const targetUserRef = this.firestore.doc(`users/${userId}`);
        
        const batch = this.firestore.firestore.batch();
        batch.update(currentUserRef.ref, {
          connections: firebase.firestore.FieldValue.arrayRemove(userId)
        });
        batch.update(targetUserRef.ref, {
          connections: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
        });
        
        return of(batch.commit());
      })
    );
  }
}
