import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-education-modal',
  templateUrl: './education-modal.component.html',
  styleUrls: ['./education-modal.component.css'],
})
export class EducationModalComponent implements OnInit {
  @Input() education: any; // Input da primimo podatke o edukaciji
  @Input() isCurrentUserProfile: boolean = false; // Dodajemo isCurrentUserProfile kao input varijablu
  @Output() educationSaved = new EventEmitter<any>(); // Emitiranje obrazovanja nakon spremanja

  educationForm!: FormGroup;

  constructor(public readonly activeModal: NgbActiveModal, private readonly fb: FormBuilder) {
    this.initializeForm();
  }

  ngOnInit(): void {
    if (this.education) {
      this.educationForm.patchValue(this.education);
    }
  }

  private initializeForm(): void {
    this.educationForm = this.fb.group({
      schoolName: ['', Validators.required],
      degree: ['', Validators.required],
      fieldOfStudy: ['', Validators.required],
      startDate: [''],
      endDate: [''],
      grade: [''],
      activities: [''],
      description: [''],
    });
  }

  onSubmit() {
    if (this.educationForm.valid) {
      this.activeModal.close(this.educationForm.value);
    }
  }

  saveEducation() {
    if (this.educationForm.valid) {
      this.educationSaved.emit(this.educationForm.value);
      this.activeModal.close();
    }
  }

  close() {
    this.activeModal.dismiss();
  }

  openDatePicker(field: 'startDate' | 'endDate', title: string) {
    Swal.fire({
      title: `Select ${title}`,
      input: 'date',
      inputLabel: `${title}`,
      inputPlaceholder: `Select a ${title.toLowerCase()}`,
      showCancelButton: true,
      confirmButtonText: 'Select',
      cancelButtonText: 'Cancel',
      inputValidator: (value) =>
        !value ? `Please select a valid ${title.toLowerCase()}!` : undefined,
    }).then((result) => {
      if (result.isConfirmed) {
        this.educationForm.get(field)?.setValue(result.value);
      }
    });
  }
}
