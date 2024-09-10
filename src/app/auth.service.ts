// auth.service.ts
import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import firebase from 'firebase/compat/app';
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
  // private removeUndefinedFields(obj: any) {
  //   const cleanedObj: any = {};
  //   Object.keys(obj).forEach(key => {
  //     if (obj[key] !== undefined) {
  //       cleanedObj[key] = obj[key];
  //     }
  //   });
  //   return cleanedObj;
  // }

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
      throw error; // Prosleđivanje greške dalje
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
  
  // Nova funkcija za dobijanje trenutno prijavljenog korisnika s detaljima
  async getCurrentUserDetails(): Promise<any> {
    const user = await this.afAuth.currentUser;
    if (user) {
      const userDoc = await this.firestore.collection('users').doc(user.uid).get().toPromise();
      return userDoc?.data();
    } else {
      return null;
    }
  }

  saveUserData(uid: string, userData: any): Promise<void> {
    return this.firestore.collection('users').doc(uid).set(userData);
  }
  
  // Check if email already exists
  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const result = await this.firestore
        .collection('users', (ref) => ref.where('email', '==', email))
        .get()
        .toPromise();
  
      return result !== undefined && !result.empty;
    } catch (error) {
      console.error('Error checking email existence:', error);
      return false;
    }
  }
  
  // Function to sign in with Google
  async googleSignIn(): Promise<void> {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const credential = await this.afAuth.signInWithPopup(provider);

      if (credential.user) {
        const user = credential.user;
        const userData = {
          uid: user.uid,
          email: user.email,
          firstName: user.displayName?.split(' ')[0],
          lastName: user.displayName?.split(' ')[1],
          profileImage: user.photoURL,
        };

        // Save or update user data in Firestore
        await this.firestore.collection('users').doc(user.uid).set(userData, { merge: true });

        this.router.navigate(['/home']);
      }
    } catch (error) {
      console.error('Error during Google Sign-In:', error);
    }
  }
}
