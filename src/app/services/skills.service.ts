// skills.service.ts
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SkillsService {
  private skillsSubject: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  public skills$: Observable<string[]> = this.skillsSubject.asObservable();

  constructor(private firestore: AngularFirestore) {
    this.fetchSkills();
  }

  private fetchSkills() {
    this.firestore.collection('users').valueChanges().pipe(
      map(users => {
        const skillsSet = new Set<string>();
        users.forEach((user: any) => {
          if (user.skills && Array.isArray(user.skills)) {
            user.skills.forEach((skill: any) => {
              if (typeof skill === 'string') {
                skillsSet.add(skill.trim());
              } else if (typeof skill === 'object' && skill.skillName) {
                skillsSet.add(skill.skillName.trim());
              }
            });
          }
        });
        return Array.from(skillsSet).sort();
      })
    ).subscribe(skills => {
      this.skillsSubject.next(skills);
    });
  }
  
  public getSkills(): string[] {
    return this.skillsSubject.value;
  }
}



