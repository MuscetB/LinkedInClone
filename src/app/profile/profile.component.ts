import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { finalize } from 'rxjs';
import { AuthService } from '../auth.service';
import { GeocodingService } from '../geocoding.service';
import { ImageModalComponent } from '../image-modal/image-modal.component';
import { ProfileService } from '../profile.service';


@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  userData: any;
  editMode: boolean = false;
  userId: string | null = null;
  userPosts: any[] = []; // Dodano za Activity div
  


  constructor(
    private profileService: ProfileService,
    private fb: FormBuilder,
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private geocodingService: GeocodingService,
    private router: Router,
    private route: ActivatedRoute,
    private modalService: NgbModal, // Dodano
    private authService: AuthService
  ) {
    this.profileForm = this.fb.group({
      profileImageUrl: [''],
      backgroundImageUrl: [''],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      contact: [''],
      address: [''],
      education: [''],
      skills: [''],
      bio: [''],
    });
    
    this.authService.getUser().subscribe(user => {
      if (user) {
        this.userId = user.uid;
      }
    });
  }

  ngOnInit(): void {
  this.route.params.subscribe(params => {
    this.userId = params['userId'];
    if (this.userId) {
      this.firestore.collection('users').doc(this.userId).valueChanges().subscribe((userData: any) => {
        this.userData = userData;

        // Ensure education is initialized as an array
        if (!this.userData.education) {
          this.userData.education = [];
        }

        this.profileForm.patchValue(userData);
      });
    } else {
      this.afAuth.authState.subscribe(
        (user) => {
          if (user) {
            this.firestore
              .collection('users')
              .doc(user.uid)
              .valueChanges()
              .subscribe((userData: any) => {
                this.userData = userData;

                // Ensure education is initialized as an array
                if (!this.userData.education) {
                  this.userData.education = [];
                }

                this.profileForm.patchValue(userData);
              });
          } else {
            console.error('No user data found');
          }
        },
        (error) => {
          console.error('Error fetching user data: ', error);
        }
      );
    }
  });
}


  onSubmit(): void {
    if (this.profileForm.valid) {
      const userData = this.profileForm.value;
      this.geocodingService.getCoordinates(userData.address).subscribe(coords => {
        userData.position = coords;
        if (this.userId) {
          this.firestore.collection('users').doc(this.userId).update(userData).then(() => {
            console.log('Profile updated successfully');
          }).catch((error) => {
            console.log('Error updating profile: ', error);
          });
        } else {
          this.afAuth.authState.subscribe(user => {
            if (user) {
              this.firestore.collection('users').doc(user.uid).update(userData).then(() => {
                console.log('Profile updated successfully');
              }).catch((error) => {
                console.log('Error updating profile: ', error);
              });
            }
          });
        }
      }, error => {
        console.error('Error getting coordinates for user address: ', error);
      });
    }
  }
  
  openImageModal(imageUrl: string, isProfileImage: boolean): void {
    const modalRef = this.modalService.open(ImageModalComponent);
    modalRef.componentInstance.imageUrl = imageUrl;
    modalRef.componentInstance.isProfileImage = isProfileImage;

    modalRef.componentInstance.onImageChange.subscribe((newUrl: string) => {
      if (isProfileImage) {
        this.profileForm.patchValue({ profileImageUrl: newUrl });
      } else {
        this.profileForm.patchValue({ backgroundImageUrl: newUrl });
      }
    });

    modalRef.componentInstance.onDelete.subscribe(() => {
      if (isProfileImage) {
        this.profileForm.patchValue({ profileImageUrl: '' });
      } else {
        this.profileForm.patchValue({ backgroundImageUrl: '' });
      }
    });
  }
  
   // Otvaranje image-modal za profilnu sliku
   openProfileImageModal(): void {
    this.openImageModal(
      this.profileForm.get('profileImageUrl')?.value || 'assets/images/add-photo.png', true);
  }

  // Otvaranje image-modal za pozadinsku sliku
  openBackgroundImageModal(): void {
    this.openImageModal(
      this.profileForm.get('backgroundImageUrl')?.value || 'assets/images/background.png', false);
  }

  deleteImage(isProfileImage: boolean) {
    if (this.userId) {
      const imageField = isProfileImage ? 'profileImageUrl' : 'backgroundImageUrl';
      this.firestore.collection('users').doc(this.userId).update({ [imageField]: null }).then(() => {
        this.profileForm.patchValue({ [imageField]: null });
        console.log(`${isProfileImage ? 'Profile' : 'Background'} image deleted successfully`);
      }).catch(error => {
        console.error(`Error deleting ${isProfileImage ? 'profile' : 'background'} image: `, error);
      });
    }
  }

  
  onProfileImageChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const filePath = `profileImages/${file.name}`;
      const fileRef = this.storage.ref(filePath);
      const task = this.storage.upload(filePath, file);
      task.snapshotChanges().pipe(
        finalize(() => {
          fileRef.getDownloadURL().subscribe(url => {
            this.profileForm.patchValue({ profileImageUrl: url });
          });
        })
      ).subscribe();
    }
  }

  onBackgroundImageChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const filePath = `backgroundImages/${file.name}`;
      const fileRef = this.storage.ref(filePath);
      const task = this.storage.upload(filePath, file);
      task.snapshotChanges().pipe(
        finalize(() => {
          fileRef.getDownloadURL().subscribe(url => {
            this.profileForm.patchValue({ backgroundImageUrl: url });
          });
        })
      ).subscribe();
    }
  }
  
  startChat(): void {
    if (this.userId) {
      this.router.navigate(['/chat', { userId: this.userId }]);
    }
  }

  toggleEditMode() {
    this.editMode = !this.editMode;
  }
  
  addEducation(): void {
     // Ensure that userData.education is an array
  if (!this.userData.education || !Array.isArray(this.userData.education)) {
    this.userData.education = [];
  }

  // Add a new blank education object to the array
  const newEducation = {
    schoolName: '',
    degree: '',
    startDate: '',
    endDate: ''
  };

  this.userData.education.push(newEducation);
  }

  removeEducation(education: any): void {
    const index = this.userData.education.indexOf(education);
    if (index > -1) {
      this.userData.education.splice(index, 1);
    }
  }

  addSkill(): void {
    const newSkill = prompt('Enter new skill:');
    if (newSkill) {
      this.userData.skills.push(newSkill);
    }
  }

  removeSkill(skill: string): void {
    const index = this.userData.skills.indexOf(skill);
    if (index > -1) {
      this.userData.skills.splice(index, 1);
    }
  }
}
