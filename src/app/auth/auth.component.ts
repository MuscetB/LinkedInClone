import { Component, OnInit } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../auth.service';
import { GeocodingService } from '../geocoding.service';

@Component({
  selector: 'app-auth',
  // standalone: true,
  // imports: [],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css'],
})
export class AuthComponent implements OnInit {
  authForm!: FormGroup;
  isLoginMode = true;
  selectedFile: File | null = null;
  passwordFieldType: string = 'password';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private storage: AngularFireStorage,
    private router: Router,
    private geocodingService: GeocodingService
  ) {}

  ngOnInit(): void {
    this.authForm = this.fb.group({
      firstName: [''],
      lastName: [''],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: [
        '',
        [Validators.required, this.matchValues('password')],
      ],
      contact: [''],
      address: [''],
      education: [''],
      skills: [''],
      bio: [''],
      profileImage: ['']
    });
  }

  matchValues(matchTo: string): (AbstractControl: AbstractControl) => void {
    return (control: AbstractControl) => {
      const formGroup = control.parent as FormGroup;
      const matchingControl = formGroup?.controls[matchTo];

      if (matchingControl && control.value !== matchingControl.value) {
        return { isMatching: false };
      } else {
        return null;
      }
    };
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
  }

  // auth.component.ts
onSubmit(): void {
  const email = this.authForm.value.email;
  const password = this.authForm.value.password;
  
  if (this.isLoginMode) {
    this.authService.login(email, password).then(() => {
      this.router.navigate(['/home']);
    }).catch(error => {
      console.error('Error during login: ', error);
    });
  } else {
    const firstName = this.authForm.value.firstName;
    const lastName = this.authForm.value.lastName;
    const contact = this.authForm.value.contact;
    const address = this.authForm.value.address;
    const education = this.authForm.value.education;
    const skills = this.authForm.value.skills;
    const bio = this.authForm.value.bio;
    const profileImage = this.authForm.value.profileImage;

    const userData = {
      firstName,
      lastName,
      contact,
      address,
      education,
      skills,
      bio,
      profileImage
    };

    this.authService
      .register(email, password, userData)
      .then((userCredential) => {
        if (userCredential && userCredential.user) {
          const userId = userCredential.user.uid;
          if (this.selectedFile) {
            const filePath = `profileImages/${userId}`;
            const fileRef = this.storage.ref(filePath);
            this.storage
              .upload(filePath, this.selectedFile)
              .snapshotChanges()
              .pipe(
                finalize(() => {
                  fileRef.getDownloadURL().subscribe((url) => {
                    userData.profileImage = url;
                    this.saveUserData(userId, userData);
                  });
                })
              )
              .subscribe();
          } else {
            this.saveUserData(userId, userData);
          }
        } else {
          console.error('Error: User is undefined');
        }
      })
      .catch((error) => {
        console.error('Error during registration', error);
      });
  }
}

private saveUserData(uid: string, userData: any): void {
  this.geocodingService.getCoordinates(userData.address).subscribe(coords => {
    userData.position = coords;
    this.authService
      .saveUserData(uid, userData)
      .then(() => {
        this.router.navigate(['/login']);
      })
      .catch((error) => {
        console.error('Error saving user data:', error);
      });
  } , error => {
    console.error('Error getting coordinates for user address: ', error);
  });
}


  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
  }
  
  togglePasswordVisibility(): void {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }
}
