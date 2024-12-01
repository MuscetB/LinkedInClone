import { Routes } from '@angular/router';
import { AuthGuard } from '../src/app/auth.guard';
import { AuthComponent } from '../src/app/auth/auth.component';
import { ChatComponent } from '../src/app/chat/chat.component';
import { HomeComponent } from '../src/app/home/home.component';
import { ProfileComponent } from '../src/app/profile/profile.component';
import { SearchComponent } from '../src/app/search/search.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard]},
  { path: 'search', component: SearchComponent, canActivate: [AuthGuard] },
  { path: 'login', component: AuthComponent },
  { path: 'register', component: AuthComponent },
  { path: 'chat', component: ChatComponent, canActivate: [AuthGuard] },
  { path: 'profile/:userId', component: ProfileComponent, canActivate: [AuthGuard] },
];
