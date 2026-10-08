import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Paiements } from './paiements';

describe('Paiements', () => {
  let component: Paiements;
  let fixture: ComponentFixture<Paiements>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Paiements],
    }).compileComponents();

    fixture = TestBed.createComponent(Paiements);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
