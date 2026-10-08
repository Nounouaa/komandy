import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfilRestaurant } from './profil-restaurant';

describe('ProfilRestaurant', () => {
  let component: ProfilRestaurant;
  let fixture: ComponentFixture<ProfilRestaurant>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilRestaurant],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilRestaurant);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
