import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Produits } from './produits';

describe('Produits', () => {
  let component: Produits;
  let fixture: ComponentFixture<Produits>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Produits],
    }).compileComponents();

    fixture = TestBed.createComponent(Produits);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
