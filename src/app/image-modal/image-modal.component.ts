import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-image-modal',
  templateUrl: './image-modal.component.html',
  styleUrls: ['./image-modal.component.css'],
})
export class ImageModalComponent implements OnInit {
  @Input() imageUrl: string | undefined;
  @Input() isProfileImage: boolean | undefined;
  @Input() isCurrentUserProfile: boolean | undefined;

  @Output() onDelete: EventEmitter<void> = new EventEmitter();
  @Output() onImageChange: EventEmitter<string> = new EventEmitter();

  selectedFile: File | null = null;
  previewUrl: string | ArrayBuffer | null = null;
  isLoading: boolean = false;

  constructor(
    public activeModal: NgbActiveModal,
    private storage: AngularFireStorage,
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore
  ) {}

  ngOnInit(): void {
    console.log(
      'isCurrentUserProfile in ImageModal:',
      this.isCurrentUserProfile
    );
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  uploadImage(): void {
    if (!this.isCurrentUserProfile) {
      console.warn('Unauthorized action: Only the current user can upload images.');
      return;
    }
    this.isLoading = true;
    this.afAuth.authState.subscribe((user) => {
      if (user && this.selectedFile) {
        const filePath = `${
          this.isProfileImage ? 'profileImages' : 'backgroundImages'
        }/${user.uid}`;
        const fileRef = this.storage.ref(filePath);
        const task = this.storage.upload(filePath, this.selectedFile);

        task
          .snapshotChanges()
          .pipe(
            finalize(() => {
              fileRef.getDownloadURL().subscribe((url) => {
                this.onImageChange.emit(url);
                const updateData = this.isProfileImage
                  ? { profileImageUrl: url }
                  : { backgroundImageUrl: url };
                this.firestore
                  .collection('users')
                  .doc(user.uid)
                  .update(updateData)
                  .then(() => {
                    this.isLoading = false;
                    this.activeModal.close();
                  });
              });
            })
          )
          .subscribe();
      } else {
        this.isLoading = false;
        console.error('User is not authenticated or no file selected');
      }
    });
  }

  deleteImage(): void {
    if (!this.isCurrentUserProfile) {
      console.warn('Unauthorized action: Only the current user can delete images.');
      return;
    }
    this.isLoading = true;
    this.afAuth.authState.subscribe((user) => {
      if (user) {
        const defaultImageUrl = this.isProfileImage
          ? 'assets/images/add-photo.png'
          : 'assets/images/background.png';

        const updateData = this.isProfileImage
          ? { profileImageUrl: defaultImageUrl }
          : { backgroundImageUrl: defaultImageUrl };

        this.firestore
          .collection('users')
          .doc(user.uid)
          .update(updateData)
          .then(() => {
            this.onImageChange.emit(defaultImageUrl);
            this.isLoading = false;
            this.activeModal.close();
          });
      } else {
        this.isLoading = false;
        console.error('User not authenticated');
      }
    });
  }
}
