import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';
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
  connectionSent: boolean = false;  // Praćenje je li zahtjev već poslan
  currentUserId: string | undefined; // Dodano za pohranu trenutnog korisničkog ID-a
  isConnected: boolean = false; // Provjera je li povezan

  
  constructor(
    private profileService: ProfileService,
    private fb: FormBuilder,
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private geocodingService: GeocodingService,
    private router: Router,
    private route: ActivatedRoute,
    private modalService: NgbModal, 
    private toastr: ToastrService, // Toastr za notifikacije
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
        this.currentUserId = user.uid;
      }
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(async (params) => {
      this.userId = params['userId']; // Dohvati ID korisnika iz URL-a (ako postoji)
      // Ako nema userId iz URL-a, postavi trenutnog korisnika
      if (!this.userId) {
        const currentUser = await this.afAuth.currentUser;
        if (currentUser) {
          this.userId = currentUser.uid;
          this.isCurrentUserProfile = true; // Ovo je profil trenutnog korisnika
        }
      }

      // Ako imamo userId (iz URL-a ili trenutnog korisnika), učitaj podatke
      if (this.userId) {
        await this.loadUserDataAndPosts();
        this.checkConnection(); // Provjeri status povezanosti
      }
    });
  }
  
  async loadUserDataAndPosts(): Promise<void> {
    try {
      // Provjera trenutnog korisnika
      const currentUser = await this.afAuth.currentUser;

      if (currentUser) {
        // Ako je ID iz URL-a jednak trenutnom korisniku, omogućite edit
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
    modalRef.componentInstance.imageUrl =
      this.profileForm.get('profileImageUrl')?.value ||
      'assets/images/add-photo.png';
    modalRef.componentInstance.isProfileImage = isProfileImage;

    modalRef.componentInstance.isCurrentUserProfile = this.isCurrentUserProfile;

    modalRef.componentInstance.onImageChange.subscribe((newUrl: string) => {
      if (this.isCurrentUserProfile) {
        this.profileForm.patchValue({ profileImageUrl: newUrl });
      }
    });

    modalRef.componentInstance.onDelete.subscribe(() => {
      if (this.isCurrentUserProfile) {
        this.profileForm.patchValue({ profileImageUrl: '' });
      }
    });
  }

  // Otvaranje image-modal za profilnu sliku
  openProfileImageModal() {
    const modalRef = this.modalService.open(ImageModalComponent);
    modalRef.componentInstance.imageUrl = this.profileForm.get('profileImageUrl')?.value || 'assets/images/default-profile.png';
    modalRef.componentInstance.isProfileImage = true; // Set this to true to indicate it's a profile image
    modalRef.componentInstance.isCurrentUserProfile = true; // Set this based on current user's profile
  }

  //Otvaranje image-modal za pozadinsku sliku
  openBackgroundImageModal() {
    const modalRef = this.modalService.open(ImageModalComponent);
    modalRef.componentInstance.imageUrl = this.profileForm.get('backgroundImageUrl')?.value || 'assets/images/default-background.png';
    modalRef.componentInstance.isProfileImage = false; // Set this to false to indicate it's a background image
    modalRef.componentInstance.isCurrentUserProfile = true; // Set this based on current user's profile
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
  
  sendConnectionRequest() {
    const connectionRequest = {
      from: this.currentUserId,  // Trenutni korisnik (koji šalje zahtjev)
      to: this.userId,           // Korisnik kojem šalje zahtjev
      timestamp: new Date(),
      status: 'pending'          // Status zahtjeva
    };
  
    // Provjeri da li već postoji zahtjev između ova dva korisnika
    this.firestore.collection('connectionRequests', ref => 
      ref.where('from', '==', this.currentUserId).where('to', '==', this.userId)
    ).get().subscribe(snapshot => {
      if (snapshot.empty) {
        // Ako nema prethodnih zahtjeva, pošalji novi
        this.firestore.collection('connectionRequests').add(connectionRequest)
          .then(() => {
            this.connectionSent = true;  // Oznaka da je zahtjev poslan
            this.toastr.success('Connection request sent.');
  
            // Ažuriraj sve gumbove na Pending
            this.updatePendingButtons(this.userId!);
          })
          .catch((error) => {
            console.error('Error sending connection request: ', error);
            this.toastr.error('Failed to send connection request.');
          });
      } else {
        // Ako već postoji zahtjev, ne dozvoli ponovno slanje
        this.toastr.warning('Connection request already sent.');
      }
    });
  }
  // Funkcija za ažuriranje svih Connect gumbova u Pending
  updatePendingButtons(userId: string): void {
    const buttons = document.querySelectorAll(`[data-userid="${userId}"]`);
    buttons.forEach(button => {
      const htmlButton = button as HTMLButtonElement; // Kastanje u HTMLButtonElement
      htmlButton.textContent = 'Pending';
      htmlButton.disabled = true;  // Onemogući ponovno klikanje dok se zahtjev ne obradi
    });
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
    modalRef.componentInstance.education = education;

    console.log('Proslijeđena vrijednost isCurrentUserProfile:', this.isCurrentUserProfile);  // Dodaj ovo za praćenje

    // Prosljeđivanje informacije je li trenutni korisnik vlasnik profila
    modalRef.componentInstance.isCurrentUserProfile = this.isCurrentUserProfile;

    modalRef.componentInstance.educationSaved.subscribe((savedEducation: any) => {
      if (!this.userData.education) {
        this.userData.education = [];
      }
      if (education) {
        const index = this.userData.education.indexOf(education);
        if (index !== -1) {
          this.userData.education[index] = savedEducation;
        }
      } else {
        this.userData.education.push(savedEducation);
      }
      this.updateUserData(); // Funkcija za spremanje u bazu, premještena ovdje
    });
  }

  removeEducation(index: number): void {
    if (index > -1) {
      this.userData.education.splice(index, 1);
      this.updateUserData()
    }
  }

  openSkillsForm(skill?: any): void {
    const modalRef = this.modalService.open(SkillsModalComponent);
    modalRef.componentInstance.skill = skill;

    // Prosljeđivanje informacije je li trenutni korisnik vlasnik profila
    modalRef.componentInstance.isCurrentUserProfile = this.isCurrentUserProfile;

    if (this.isCurrentUserProfile) {
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
  
        this.updateUserData();
      });
    }
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
  
  // Provjera statusa povezivanja
  checkConnection(): void {
    if (this.userId) {
      this.profileService.checkConnection(this.userId).subscribe((connected: boolean) => {
        this.isConnected = connected;
      });
    }
  }
  
  checkExistingRequests(): void {
    this.firestore.collection('connectionRequests', ref => 
      ref.where('from', '==', this.currentUserId).where('to', '==', this.userId)
    ).valueChanges().subscribe((requests: any[]) => {
      if (requests.length > 0 && requests[0].status === 'pending') {
        this.connectionSent = true;  // Ako postoji zahtjev, postavi gumb na Pending
      }
    });
  }

  // Metoda za potvrdu unconnect-a
  confirmUnconnect(): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to unconnect with this user?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, unconnect',
      cancelButtonText: 'No, cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.unconnectUser();
      }
    });
  }
  
   // Unconnect logika
   unconnectUser(): void {
    this.profileService.unconnectUser(this.userId!).subscribe(() => {
      this.toastr.success('You are no longer connected.');
      this.isConnected = false; // Ažuriraj status povezanosti
      this.checkConnection(); // Ponovno provjeri povezivost nakon unconnect-a
    }, (error) => {
      this.toastr.error('Failed to unconnect from the user.');
    });
  }
}
