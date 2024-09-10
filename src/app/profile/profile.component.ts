import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { finalize } from 'rxjs';
import { AuthService } from '../auth.service';
import { EducationModalComponent } from '../education-modal/education-modal.component';
import { GeocodingService } from '../geocoding.service';
import { ImageModalComponent } from '../image-modal/image-modal.component';
import { ProfileService } from '../profile.service';
import { SkillsModalComponent } from '../skills-modal/skills-modal.component';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  userData: any = {
    education: [],
    skills: [],
  };
  editMode: boolean = false;
  userId: string | undefined;
  userPosts: any[] = []; // Dodano za Activity div
  isCurrentUserProfile: boolean = false; // Dodano za provjeru korisničkog profila

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
      email: [
        { value: '', disabled: true },
        [Validators.required, Validators.email],
      ],
      contact: [''],
      address: [''],
      education: this.fb.array([]),
      skills: this.fb.array([]),
      bio: [''],
    });

    this.authService.getUser().subscribe((user) => {
      if (user) {
        this.userId = user.uid;
      }
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(async (params) => {
      this.userId = params['userId'];
  
      if (!this.userId) {
        const currentUser = await this.afAuth.currentUser;
        if (currentUser) {
          this.userId = currentUser.uid;
          this.isCurrentUserProfile = true;
        }
      }
  
      if (this.userId) {
        await this.loadUserDataAndPosts();
      }
    });
  }
  
  
  async loadUserDataAndPosts(): Promise<void> {
    try {
      // Provjera trenutnog korisnika
      const currentUser = await this.afAuth.currentUser;
  
      if (currentUser) {
        this.isCurrentUserProfile = currentUser.uid === this.userId;
      }
  
      // Dohvat korisničkih podataka
      this.firestore
        .collection('users')
        .doc(this.userId)
        .valueChanges()
        .subscribe((userData: any) => {
          this.userData = userData;
  
          // Inicijalizacija education i skills polja ako nisu definirana
          if (
            !this.userData.education ||
            !Array.isArray(this.userData.education)
          ) {
            this.userData.education = [];
          }
          if (!this.userData.skills || !Array.isArray(this.userData.skills)) {
            this.userData.skills = [];
          }
  
          this.profileForm.patchValue(userData);
          this.profileForm.setControl(
            'education',
            this.fb.array(this.userData.education || [])
          );
          this.profileForm.setControl(
            'skills',
            this.fb.array(this.userData.skills || [])
          );
        });
  
      // Dohvat postova za korisnika
      this.firestore
        .collection('posts', (ref) =>
          ref.where('userId', '==', this.userId).orderBy('timestamp', 'desc')
        )
        .valueChanges()
        .subscribe((posts: any[]) => {
          console.log('Posts:', posts);
          this.userPosts = posts;
        });
  
    } catch (error) {
      console.error('Error loading user data and posts:', error);
    }
  }
  
  
  

  onSubmit(): void {
    if (this.profileForm.valid) {
      const userData = this.profileForm.value;
      this.geocodingService.getCoordinates(userData.address).subscribe(
        (coords) => {
          userData.position = coords;
          if (this.userId) {
            this.firestore
              .collection('users')
              .doc(this.userId)
              .update(userData)
              .then(() => {
                console.log('Profile updated successfully');
                this.toggleEditMode(); // Zatvaranje edit moda nakon ažuriranja
              })
              .catch((error) => {
                console.log('Error updating profile: ', error);
              });
          } else {
            this.afAuth.authState.subscribe((user) => {
              if (user) {
                this.firestore
                  .collection('users')
                  .doc(user.uid)
                  .update(userData)
                  .then(() => {
                    console.log('Profile updated successfully');
                    this.toggleEditMode(); // Zatvaranje edit moda nakon ažuriranja
                  })
                  .catch((error) => {
                    console.log('Error updating profile: ', error);
                  });
              }
            });
          }
        },
        (error) => {
          console.error('Error getting coordinates for user address: ', error);
        }
      );
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
      this.profileForm.get('profileImageUrl')?.value ||
        'assets/images/add-photo.png',
      true
    );
  }

  // Otvaranje image-modal za pozadinsku sliku
  openBackgroundImageModal(): void {
    this.openImageModal(
      this.profileForm.get('backgroundImageUrl')?.value ||
        'assets/images/background.png',
      false
    );
  }

  deleteImage(isProfileImage: boolean) {
    if (this.userId) {
      const imageField = isProfileImage
        ? 'profileImageUrl'
        : 'backgroundImageUrl';
      this.firestore
        .collection('users')
        .doc(this.userId)
        .update({ [imageField]: null })
        .then(() => {
          this.profileForm.patchValue({ [imageField]: null });
          console.log(
            `${
              isProfileImage ? 'Profile' : 'Background'
            } image deleted successfully`
          );
        })
        .catch((error) => {
          console.error(
            `Error deleting ${
              isProfileImage ? 'profile' : 'background'
            } image: `,
            error
          );
        });
    }
  }

  onProfileImageChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const filePath = `profileImages/${file.name}`;
      const fileRef = this.storage.ref(filePath);
      const task = this.storage.upload(filePath, file);
      task
        .snapshotChanges()
        .pipe(
          finalize(() => {
            fileRef.getDownloadURL().subscribe((url) => {
              this.profileForm.patchValue({ profileImageUrl: url });
            });
          })
        )
        .subscribe();
    }
  }

  onBackgroundImageChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const filePath = `backgroundImages/${file.name}`;
      const fileRef = this.storage.ref(filePath);
      const task = this.storage.upload(filePath, file);
      task
        .snapshotChanges()
        .pipe(
          finalize(() => {
            fileRef.getDownloadURL().subscribe((url) => {
              this.profileForm.patchValue({ backgroundImageUrl: url });
            });
          })
        )
        .subscribe();
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

  openEducationForm() {
    const modalRef = this.modalService.open(EducationModalComponent);
    modalRef.result
      .then((result) => {
        if (result) {
          this.userData.education.push(result);
          this.updateUserData(); // Funkcija za spremanje u bazu
        }
      })
      .catch((error) => {
        console.error('Modal dismissed', error);
      });
  }

  openEducationModal(education?: any) {
    const modalRef = this.modalService.open(EducationModalComponent);
    if (education) {
      modalRef.componentInstance.education = education;
    }

    modalRef.componentInstance.educationSaved.subscribe(
      (savedEducation: any) => {
        if (!this.userData.education) {
          this.userData.education = [];
        }
        if (education) {
          // Ažuriraj postojeću edukaciju
          const index = this.userData.education.indexOf(education);
          if (index !== -1) {
            this.userData.education[index] = savedEducation;
          }
        } else {
          // Dodaj novu edukaciju
          this.userData.education.push(savedEducation);
        }

        // Spremi ažurirani education array u Firebase
        this.firestore
          .collection('users')
          .doc(this.userId)
          .update({
            education: this.userData.education,
          })
          .then(() => {
            console.log('Education saved successfully');
          })
          .catch((error) => {
            console.error('Error saving education: ', error);
          });
      }
    );
  }

  removeEducation(index: number): void {
    if (index > -1) {
      this.userData.education.splice(index, 1);
      this.firestore
        .collection('users')
        .doc(this.userId)
        .update({
          education: this.userData.education,
        })
        .then(() => {
          console.log('Education removed successfully');
        })
        .catch((error) => {
          console.error('Error removing education: ', error);
        });
    }
  }

  openSkillsForm(skill?: any): void {
    const modalRef = this.modalService.open(SkillsModalComponent);

    if (skill) {
      modalRef.componentInstance.skill = skill;
    }

    modalRef.componentInstance.skillSaved.subscribe((savedSkill: any) => {
      if (!this.userData.skills) {
        this.userData.skills = [];
      }

      if (skill) {
        const index = this.userData.skills.indexOf(skill);
        if (index !== -1) {
          this.userData.skills[index] = savedSkill;
        }
      } else {
        this.userData.skills.push(savedSkill);
      }

      this.updateUserData(); // Spremanje ažuriranog niza veština u Firebase
    });

    modalRef.componentInstance.skillUpdated.subscribe((updatedSkill: any) => {
      if (!this.userData.skills) {
        this.userData.skills = [];
      }

      const index = this.userData.skills.indexOf(skill);
      if (index !== -1) {
        this.userData.skills[index] = updatedSkill;
        this.updateUserData(); // Ažuriraj i spremi promene u Firebase
      }
    });

    modalRef.result.catch((error) => {
      console.error('Modal dismissed', error);
    });
  }

  removeSkill(index: number): void {
    if (index > -1) {
      this.userData.skills.splice(index, 1);
      this.updateUserData(); // Save the updated skills array in Firebase
    }
  }

  updateUserData() {
    if (this.userId) {
      this.firestore
        .collection('users')
        .doc(this.userId)
        .update({
          education: this.userData.education,
          skills: this.userData.skills,
        })
        .then(() => {
          console.log('User data updated successfully');
        })
        .catch((error) => {
          console.error('Error updating user data: ', error);
        });
    }
  }
}
