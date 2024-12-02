import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  title = 'LinkedInCloneV1';

  idleTime: number = 0; // Brojilo za neaktivnost
  maxIdleTime: number = 15 * 60 * 1000; // Maksimalno vrijeme neaktivnosti (npr. 15 minuta)
  timeout: any;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.resetTimer(); // Resetiraj timer prilikom inicijalizacije

    // Postavi interval za provjeru neaktivnosti
    this.timeout = setInterval(() => {
      this.idleTime += 1000; // Povećavaj vrijeme neaktivnosti svakih 1 sekundu
      if (this.idleTime >= this.maxIdleTime) {
        this.logoutUser();
      }
    }, 1000);
  }
  // Resetiraj timer kada se dogodi aktivnost korisnika
  @HostListener('window:mousemove') onMouseMove() {
    this.resetTimer();
  }

  @HostListener('window:keydown') onKeyDown() {
    this.resetTimer();
  }

  @HostListener('window:click') onClick() {
    this.resetTimer();
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadHandler(event: Event) {
    this.setUserOfflineBeforeUnload();
  }
  // Resetiranje timera za neaktivnost
  resetTimer() {
    this.idleTime = 0;
  }

  // Funkcija za automatsku odjavu korisnika
  logoutUser() {
    clearInterval(this.timeout); // Očisti interval kada se korisnik odjavi
    this.authService.logout(); // Poziv funkcije za odjavu
    this.router.navigate(['/login']); // Preusmjeri na login stranicu
    alert('You have been logged out due to inactivity.');
  }

  async setUserOfflineBeforeUnload() {
    const user = await this.authService.getCurrentUserDetails();
    if (user && user.uid) {
      await this.authService.setUserOfflineOnLogout(user.uid);
    }
  }
}
