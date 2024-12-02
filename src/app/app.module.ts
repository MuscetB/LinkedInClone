import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GoogleMapsModule } from '@angular/google-maps';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule } from 'ngx-toastr';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { environment } from '../environments/environments';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { AuthComponent } from './auth/auth.component';
import { ChatComponent } from './chat/chat.component';
import { EducationModalComponent } from './education-modal/education-modal.component';
import { HeaderComponent } from './header/header.component';
import { HomeComponent } from './home/home.component';
import { ImageModalComponent } from './image-modal/image-modal.component';
import { ProfileComponent } from './profile/profile.component';
import { SearchComponent } from './search/search.component';
import { GeocodingService } from './services/geocoding.service';
import { HeaderService } from './services/header.service';
import { ProfileService } from './services/profile.service';
import { UserService } from './services/user.service';
import { SkillsModalComponent } from './skills-modal/skills-modal.component';


@NgModule({
  declarations: [
    HeaderComponent,
    AppComponent,
    HomeComponent,
    ProfileComponent,
    SearchComponent,
    AuthComponent,
    ChatComponent,
    EducationModalComponent,
    SkillsModalComponent,
    ImageModalComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    RouterModule.forRoot(routes),
    FormsModule,
    ReactiveFormsModule,
    AngularFireModule.initializeApp(environment.firebaseConfig),
    AngularFireStorageModule,
    AngularFirestoreModule,
    GoogleMapsModule,
    AngularFireAuthModule,
    CommonModule,
    NgbModule,
    BrowserAnimationsModule,
    ToastrModule.forRoot({
      positionClass: 'toast-top-right', // Pozicija
      timeOut: 4000, // Vrijeme prikazivanja poruke
      progressBar: true, // Prikazuje progress bar
      closeButton: true, // Prikazuje gumb za zatvaranje
      preventDuplicates: true, // Sprječava duple obavijesti
      newestOnTop: true, // Nova obavijest će se prikazati na vrhu
      tapToDismiss: true,
    }),
    DialogModule,
    BadgeModule,
    ButtonModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [GeocodingService, ProfileService, UserService, HeaderService],
  bootstrap: [AppComponent],
})
export class AppModule {}
