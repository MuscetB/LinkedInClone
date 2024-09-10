// user.service.ts
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, catchError, map, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private firestore: AngularFirestore) {}


  searchUsers(query: string): Observable<any[]> {
    return this.firestore
      .collection('users')
      .valueChanges()
      .pipe(
        map((users) =>
          users.filter(
            (user: any) =>
              (user.firstName &&
                user.firstName.toLowerCase().includes(query.toLowerCase())) ||
              (user.lastName &&
                user.lastName.toLowerCase().includes(query.toLowerCase()))
          )
        )
      );
  }

  getUnreadConversations(userId: string): Observable<any[]> {
    return this.firestore
      .collection('conversations', (ref) =>
        ref
          .where('participants', 'array-contains', userId)
          .where('unread', '==', true)
      )
      .valueChanges();
  }

  getUserName(userId: string): Observable<string> {
    return this.firestore
      .doc(`users/${userId}`)
      .valueChanges()
      .pipe(map((user: any) => `${user.firstName} ${user.lastName}`));
  }

  getUserById(userId: string): Observable<any> {
    return this.firestore
      .collection('users')
      .doc(userId)
      .valueChanges()
      .pipe(
        catchError((error) => {
          console.error('Error fetching user by id:', error);
          return of(null);
        })
      );
  }

  getUsersByIds(userIds: string[]): Observable<any[]> {
    return this.firestore
      .collection('users')
      .valueChanges()
      .pipe(
        map((users: any[]) => users.filter(user => userIds.includes(user.uid))),
        catchError((error) => {
          console.error('Error fetching users by ids:', error);
          return of([]);
        })
      );
  }
}
