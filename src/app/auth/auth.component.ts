import { Component, OnInit } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';
import { AuthService } from '../auth.service';
import { GeocodingService } from '../geocoding.service';
import { HeaderService } from '../header.service';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css'],
})
export class AuthComponent implements OnInit {
  authForm!: FormGroup;
  isLoginMode = true;
  selectedFile: File | null = null;
  passwordFieldType: string = 'password';
  loginError: string = '';
  emailExists: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private storage: AngularFireStorage,
    private router: Router,
    private geocodingService: GeocodingService,
    private headerService: HeaderService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.authForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: [
        '',
        [Validators.required, this.matchValues('password')],
      ],
      contact: ['', [Validators.required, Validators.pattern(/^[\d\+]+$/)]],

      address: ['', Validators.required],
      education: ['', Validators.required],
      skills: ['', Validators.required],
      bio: [''],
      profileImage: [''],
    });

    this.headerService.hide();
  }

  ngOnDestroy(): void {
    this.headerService.show();
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

  onSubmit(): void {
    if (this.authForm.invalid && !this.isLoginMode) {
      console.log(
        'Form is invalid, but continuing for debugging:',
        this.authForm.errors
      );
      this.authForm.markAllAsTouched(); // Mark all fields as touched to show validation errors
      // Do not return here for debugging purposes
    }

    console.log('Dalje...');
    const email = this.authForm.value.email;
    const password = this.authForm.value.password;

    if (this.isLoginMode) {
      this.authService
        .login(email, password)
        .then(() => {
          console.log('Login successful, navigating to home');
          this.router.navigate(['/home']);
        })
        .catch((error) => {
          console.error('Error during login: ', error);
          this.loginError =
            'Wrong email or password. Try again or create an account.';
        });
    } else {
      this.authService
        .checkEmailExists(email)
        .then((emailExists) => {
          if (emailExists) {
            this.emailExists = true;
            this.authForm.get('email')?.setErrors({ emailExists: true });
          } else {
            this.emailExists = false;
            this.registerUser();
          }
        })
        .catch((error) => {
          console.error('Error during email check: ', error);
        });
    }
  }

  private registerUser(): void {
    const email = this.authForm.value.email;
    const password = this.authForm.value.password;
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
      profileImage,
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
        if (error.code === 'auth/email-already-in-use') {
          this.authForm.get('email')?.setErrors({ emailExists: true });
        }
      });
  }

  private saveUserData(uid: string, userData: any): void {
    this.geocodingService.getCoordinates(userData.address).subscribe(
      (coords) => {
        userData.position = coords;
        this.authService
          .saveUserData(uid, userData)
          .then(() => {
            this.toastr.success('Profile created successfully!', 'Success');
            this.router.navigate(['/home']);
          })
          .catch((error) => {
            console.error('Error saving user data:', error);
          });
      },
      (error) => {
        console.error('Error getting coordinates for user address: ', error);
      }
    );
  }

  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
  }

  togglePasswordVisibility(): void {
    this.passwordFieldType =
      this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  onGoogleSignIn(): void {
    this.authService
      .googleSignIn()
      .then(() => {
        console.log('Google Sign-In successful');
      })
      .catch((error) => {
        console.error('Google Sign-In error:', error);
      });
  }
}
