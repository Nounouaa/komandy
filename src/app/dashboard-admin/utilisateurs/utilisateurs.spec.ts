import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Utilisateurs } from './utilisateurs';

describe('Utilisateurs', () => {
  let component: Utilisateurs;
  let fixture: ComponentFixture<Utilisateurs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Utilisateurs],
    }).compileComponents();

    fixture = TestBed.createComponent(Utilisateurs);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
