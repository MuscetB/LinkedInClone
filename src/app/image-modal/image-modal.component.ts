import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-image-modal',
  templateUrl: './image-modal.component.html',
  styleUrls: ['./image-modal.component.css']
})
export class ImageModalComponent implements OnInit {
  @Input() imageUrl: string | undefined;
  @Input() isProfileImage: boolean | undefined;
  @Output() onDelete: EventEmitter<void> = new EventEmitter();
  @Output() onImageChange: EventEmitter<string> = new EventEmitter();
  selectedFile: File | null = null;
  previewUrl: string | ArrayBuffer | null = null; // New for previewing the image

  constructor(
    public activeModal: NgbActiveModal,
    private storage: AngularFireStorage,
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore // Dodajemo Firestore ovdje
  ) {}

  ngOnInit(): void {}

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      
       // Update the preview as soon as a new file is selected
       const reader = new FileReader();
       reader.onload = (e: any) => {
         this.previewUrl = e.target.result;
       };
       reader.readAsDataURL(file);
    }
  }

  uploadImage(): void {
    this.afAuth.authState.subscribe(user => {
      if (user) {
        if (this.selectedFile) {
          const filePath = `${this.isProfileImage ? 'profileImages' : 'backgroundImages'}/${user.uid}`;
          const fileRef = this.storage.ref(filePath);
          const task = this.storage.upload(filePath, this.selectedFile);

          task.snapshotChanges().pipe(
            finalize(() => {
              fileRef.getDownloadURL().subscribe(url => {
                this.onImageChange.emit(url);
                this.activeModal.close(); // Close the modal after upload

                // Ažuriraj korisničke podatke u Firestore s novim URL-om
                const updateData = this.isProfileImage ? { profileImageUrl: url } : { backgroundImageUrl: url };
                this.firestore.collection('users').doc(user.uid).update(updateData).then(() => {
                  console.log("User image URL updated in Firestore successfully!");
                }).catch(error => {
                  console.error("Error updating user image URL in Firestore: ", error);
                });

                this.activeModal.close(); // Zatvori modal nakon uploada
              });
            })
          ).subscribe();
        }
      } else {
        console.error('User is not authenticated');
      }
    });
  }

  deleteImage() {
    this.onDelete.emit();
    this.activeModal.close(); // Zatvori modal nakon brisanja
  }
}
