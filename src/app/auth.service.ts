// auth.service.ts
import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import 'firebase/compat/firestore';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private router: Router
  ) {}

  // Funkcija za uklanjanje undefined vrednosti
  private removeUndefinedFields(obj: any) {
    const cleanedObj: any = {};
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined) {
        cleanedObj[key] = obj[key];
      }
    });
    return cleanedObj;
  }

  async register(email: string, password: string, userData: any): Promise<any> {
    try {
      const userCredential = await this.afAuth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      if (user) {
        const uid = user.uid;
        userData.uid = uid;
        userData.email = email;

        // Remove profile image related code
        await this.firestore.collection('users').doc(uid).set(userData);
        return userCredential;
      } else {
        throw new Error('User is undefined');
      }
    } catch (error) {
      console.error('Error registering user: ', error);
      throw error;
    }
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const userCredential = await this.afAuth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      if (user) {
        const uid = user.uid;
        const doc = await this.firestore.collection('users').doc(uid).get().toPromise();
        if (doc?.exists) {
          console.log('User data: ', doc.data());
        } else {
          console.log('No user data found for UID: ', uid);
        }
      }
    } catch (error) {
      console.error('Error logging in user: ', error);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.afAuth.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error during logout: ', error);
      throw error;
    }
  }

  getUser() {
    return this.afAuth.authState;
  }

  saveUserData(uid: string, userData: any): Promise<void> {
    return this.firestore.collection('users').doc(uid).set(userData);
  }
}
