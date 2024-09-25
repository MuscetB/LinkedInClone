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
  educationForm: FormGroup;

  constructor(public activeModal: NgbActiveModal, private fb: FormBuilder) {
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

  ngOnInit(): void {
    console.log('Primljena vrijednost isCurrentUserProfile u modalu:', this.isCurrentUserProfile); // Provjera u modalu
    if (this.education) {
      this.educationForm.patchValue(this.education); // Ako se uređuje, popuniti formu
    }
  }

  onSubmit() {
    if (this.educationForm.valid) {
      this.activeModal.close(this.educationForm.value); // Vrati unesene podatke i zatvori modal
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
  
  openStartDatePicker() {
    Swal.fire({
      title: 'Select Start Date',
      input: 'date', // Postavite input tip na 'date'
      inputLabel: 'Start Date',
      inputPlaceholder: 'Select a start date',
      showCancelButton: true,
      confirmButtonText: 'Select',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value) {
          return 'Please select a valid start date!';
        }
        return undefined; // Vraća undefined ako je validacija uspješna
      },
      preConfirm: (value) => {
        return value; // Možete dodati dodatne validacije ako je potrebno
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.educationForm.get('startDate')?.setValue(result.value); // Postavljanje odabranog datuma u obrazac
      }
    });
  }
  
  openEndDatePicker() {
    Swal.fire({
      title: 'Select End Date',
      input: 'date', // Postavite input tip na 'date'
      inputLabel: 'End Date',
      inputPlaceholder: 'Select an end date',
      showCancelButton: true,
      confirmButtonText: 'Select',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value) {
          return 'Please select a valid end date!';
        }
        return undefined; // Vraća undefined ako je validacija uspješna
      },
      preConfirm: (value) => {
        return value; // Možete dodati dodatne validacije ako je potrebno
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.educationForm.get('endDate')?.setValue(result.value); // Postavljanje odabranog datuma u obrazac
      }
    });
  }
  
  
}
