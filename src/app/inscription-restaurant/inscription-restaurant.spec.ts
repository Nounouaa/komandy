import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InscriptionRestaurant } from './inscription-restaurant';

describe('InscriptionRestaurant', () => {
  let component: InscriptionRestaurant;
  let fixture: ComponentFixture<InscriptionRestaurant>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InscriptionRestaurant],
    }).compileComponents();

    fixture = TestBed.createComponent(InscriptionRestaurant);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
