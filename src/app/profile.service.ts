import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, switchMap } from 'rxjs';
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
}
