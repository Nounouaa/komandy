import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Commandes } from './commandes';

describe('Commandes', () => {
  let component: Commandes;
  let fixture: ComponentFixture<Commandes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Commandes],
    }).compileComponents();

    fixture = TestBed.createComponent(Commandes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
