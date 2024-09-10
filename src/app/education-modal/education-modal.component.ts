import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';


@Component({
  selector: 'app-education-modal',
  templateUrl: './education-modal.component.html',
  styleUrls: ['./education-modal.component.css'],
})
export class EducationModalComponent implements OnInit {
  @Input() education: any; // Input da primimo podatke o edukaciji
  @Output() educationSaved = new EventEmitter<any>(); // Emitiranje obrazovanja nakon spremanja
  educationForm: FormGroup;

  constructor(public activeModal: NgbActiveModal, private fb: FormBuilder) {
    this.educationForm = this.fb.group({
      schoolName: ['', Validators.required],
      degree: [''],
      fieldOfStudy: [''],
      startDate: [''],
      endDate: [''],
      grade: [''],
      activities: [''],
      description: [''],
    });
  }

  ngOnInit(): void {
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
}
