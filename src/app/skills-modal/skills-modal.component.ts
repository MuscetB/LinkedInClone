import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-skills-modal',
  templateUrl: './skills-modal.component.html',
  styleUrls: ['./skills-modal.component.css']
})
export class SkillsModalComponent implements OnInit {
  skillForm: FormGroup;
  @Input() skill: any;  // Prihvata postojeće podatke o vještini
  @Output() skillSaved = new EventEmitter<any>();
  @Output() skillUpdated = new EventEmitter<any>();
  isUpdateMode: boolean = false;  // Prati da li je forma u modu za ažuriranje
  formChanged: boolean = false; // Ovo će pratiti promjene u formi
  @Input() isCurrentUserProfile: boolean = false; // Dodajemo isCurrentUserProfile kao input varijablu


  constructor(public activeModal: NgbActiveModal, private fb: FormBuilder) {
    this.skillForm = this.fb.group({
      skillName: ['', Validators.required],
      relatedField: [''],
      experience: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    if (this.skill) {
      this.isUpdateMode = true;
      this.skillForm.patchValue(this.skill);
    }

    // Pratimo promene u formi
    this.skillForm.valueChanges.subscribe(() => {
      this.checkForChanges();
    });
  }

  checkForChanges() {
    if (this.skill) {
      this.formChanged = !this.skillForm.pristine;
    }
  }

  saveSkill() {
    if (this.skillForm.valid) {
      console.log('Skill to save:', this.skillForm.value);
      this.skillSaved.emit(this.skillForm.value);
      this.activeModal.close(this.skillForm.value);
    }
  }

  dismiss() {
    this.activeModal.dismiss();
  }
  
  confirmUpdate(): void {
    if (this.skillForm.valid) {
      const confirmed = confirm('Are you sure you want to update this skill?');
      if (confirmed) {
        console.log("update mess")
        this.skillUpdated.emit(this.skillForm.value);
        this.activeModal.close(this.skillForm.value);
      }
    }
  }
}
