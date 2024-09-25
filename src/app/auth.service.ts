// auth.service.ts
import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  loading: boolean = false;

  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private router: Router,
    private toastr: ToastrService // injektiraj ToastrService za notifikacije
  ) {}

  async register(email: string, password: string, userData: any): Promise<any> {
    this.loading = true; // Prikaži loader
    try {
      const userCredential = await this.afAuth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      if (user) {
        const uid = user.uid;
        userData.uid = uid;
        userData.email = email;
  
        // Remove profile image related code
        await this.firestore.collection('users').doc(uid).set(userData);
  
        this.toastr.success('Registration successful!', 'Success', {
          progressBar: true,
          closeButton: true,
        });
        this.router.navigate(['/home']);
  
        return userCredential;
      } else {
        throw new Error('User is undefined');
      }
    } catch (error) {
      console.error('Error registering user: ', error);
      this.toastr.error('Registration failed. Please try again.', 'Error', {
        timeOut: 3000,
        progressBar: true,
        closeButton: true,
      });
      throw error;
    } finally {
      this.loading = false; // Ukloni loader
    }
  }
  
  async login(email: string, password: string): Promise<void> {
    this.loading = true;
    try {
      const userCredential = await this.afAuth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      if (user) {
        const uid = user.uid;
        await this.setUserOnlineOnLogin(uid);  // Postavi korisnika online
        const doc = await this.firestore.collection('users').doc(uid).get().toPromise();
        if (doc?.exists) {
          this.toastr.success('Login successful!', 'Success', {
            progressBar: true,
            closeButton: true,
          });
          this.router.navigate(['/home']);
        } else {
          console.log('No user data found for UID: ', uid);
        }
      }
    } catch (error) {
      console.error('Error logging in user: ', error);
      this.toastr.error('Login failed. Please try again.', 'Error', {
        timeOut: 3000,
        progressBar: true,
        closeButton: true,
      });
      throw error;
    } finally {
      this.loading = false;
    }
  }
  
  async logout(): Promise<void> {
    const user = await this.afAuth.currentUser;
    if (user) {
      await this.setUserOfflineOnLogout(user.uid);  // Postavi korisnika offline
    }
    this.loading = true;
    try {
      await this.afAuth.signOut();
      this.toastr.success('Successfully logged out', 'Logout', {
        progressBar: true,
        closeButton: true,
      });
      this.loading = false;
      this.router.navigate(['/login']);
    } catch (error) {
      this.toastr.error('Logout failed. Please try again.', 'Error', {
        timeOut: 3000,
        progressBar: true,
        closeButton: true,
      });
      this.loading = false;
      console.error('Error during logout: ', error);
    }
  }
  

  getUser(): Observable<any> {
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
  
  // Kada se korisnik prijavi, postavi isOnline na true
  async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    const userRef = this.firestore.collection('users').doc(userId);
    if (isOnline) {
      await userRef.update({
        isOnline: true,
        lastActive: new Date(), // Postavlja se trenutni datum i vrijeme
      });
    } else {
      await userRef.update({
        isOnline: false,
        lastActive: new Date(), // Ažuriraj vrijeme zadnje aktivnosti kada postane offline
      });
    }
  }

  // Kada se korisnik prijavi, odmah postavljamo status
  async setUserOnlineOnLogin(userId: string): Promise<void> {
    this.updateUserOnlineStatus(userId, true);
  }

  // Kada se korisnik odjavi, ažuriramo status
  async setUserOfflineOnLogout(userId: string): Promise<void> {
    this.updateUserOnlineStatus(userId, false);
  }
}
