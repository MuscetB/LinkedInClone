import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SkillsModalComponent } from './skills-modal.component';

describe('SkillsModalComponent', () => {
  let component: SkillsModalComponent;
  let fixture: ComponentFixture<SkillsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkillsModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SkillsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
