import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { GeocodingService } from '../services/geocoding.service';
import { HeaderService } from '../services/header.service';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css'],
})
export class AuthComponent implements OnInit, OnDestroy {
  authForm!: FormGroup;
  isLoginMode = true;
  selectedFile: File | null = null;
  passwordFieldType: string = 'password';
  loginError: string = '';
  emailExists: boolean = false;

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private router: Router,
    private geocodingService: GeocodingService,
    private headerService: HeaderService
  ) {}

  ngOnInit(): void {
    this.headerService.hide();
    // Initialize form with common controls
    this.initializeForm();
  }

  ngOnDestroy(): void {
    // No need for headerService anymore, removing that code.
    this.headerService.show();
  }

  // Helper function for password matching
  matchValues(matchTo: string): (AbstractControl: AbstractControl) => void {
    return (control: AbstractControl) => {
      const formGroup = control.parent as FormGroup;
      const matchingControl = formGroup?.controls[matchTo];

      return matchingControl && control.value !== matchingControl.value
        ? { isMatching: false }
        : null;
    };
  }

  onSubmit(): void {
    if (this.authForm.invalid && !this.isLoginMode) {
      this.authForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.authForm.value;

    if (this.isLoginMode) {
      this.handleLogin(email, password);
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

  private initializeForm(): void {
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
  }

  // Handling login
  private handleLogin(email: string, password: string): void {
    this.authService
      .login(email, password)
      .then(() => this.router.navigate(['/home']))
      .catch((error) => {
        this.loginError =
          'Wrong email or password. Try again or create an account.';
        console.error('Error during login: ', error);
      });
  }

   // Register user and upload profile image
  private registerUser(): void {
    const { email, password, ...userData } = this.authForm.value;
    this.authService.register(email, password, userData)
      .then((userCredential) => {
        if (userCredential && userCredential.user) {
          if (this.selectedFile) {
            this.authService.uploadProfileImage(userCredential.user.uid, this.selectedFile, userData);
          } else {
            this.saveUserData(userCredential.user.uid, userData);
          }
        }
      }).catch((error) => {
        if (error.code === 'auth/email-already-in-use') {
          this.authForm.get('email')?.setErrors({ emailExists: true });
        }
        console.error('Error during registration: ', error);
      });
  }

  // Save user data including geocoding
  private saveUserData(uid: string, userData: any): void {
    this.geocodingService.getCoordinates(userData.address).subscribe(
      (coords) => {
        userData.position = coords;
        this.authService
          .saveUserData(uid, userData)
          .then(() => this.router.navigate(['/home']))
          .catch((error) => console.error('Error saving user data:', error));
      },
      (error) =>
        console.error('Error getting coordinates for user address:', error)
    );
  }

  // Switch between login and registration mode
  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
  }

  // Toggle password visibility
  togglePasswordVisibility(): void {
    this.passwordFieldType =
      this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  // Handle Google sign-in
  onGoogleSignIn(): void {
    this.authService
      .googleSignIn()
      .then(() => console.log('Google Sign-In successful'))
      .catch((error) => console.error('Google Sign-In error:'));
  }

  // Handle file selection
  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
  }
}
