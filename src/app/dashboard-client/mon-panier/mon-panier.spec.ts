import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonPanier } from './mon-panier';

describe('MonPanier', () => {
  let component: MonPanier;
  let fixture: ComponentFixture<MonPanier>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonPanier],
    }).compileComponents();

    fixture = TestBed.createComponent(MonPanier);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
