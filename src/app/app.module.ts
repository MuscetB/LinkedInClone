import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { HttpClientModule } from '@angular/common/http';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GoogleMapsModule } from '@angular/google-maps';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
// import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { environment } from '../environments/environments';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { AuthComponent } from './auth/auth.component';
import { ChatComponent } from './chat/chat.component';
import { EducationModalComponent } from './education-modal/education-modal.component';
import { GeocodingService } from './geocoding.service';
import { HeaderService } from './header.service';
import { HeaderComponent } from './header/header.component';
import { HomeComponent } from './home/home.component';
import { ProfileService } from './profile.service';
import { ProfileComponent } from './profile/profile.component';
import { SearchComponent } from './search/search.component';
import { SkillsModalComponent } from './skills-modal/skills-modal.component';
import { UserService } from './user.service';

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
    BrowserAnimationsModule,
    ToastrModule.forRoot({
      timeOut: 10000, // 10 seconds
      positionClass: 'toast-top-right', // You can set this to the position you prefer
      preventDuplicates: true,
    })
    // NgbModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [GeocodingService, ProfileService, UserService, HeaderService],
  bootstrap: [AppComponent],
})
export class AppModule {}
