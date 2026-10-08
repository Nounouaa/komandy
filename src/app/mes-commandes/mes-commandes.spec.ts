import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MesCommandes } from './mes-commandes';

describe('MesCommandes', () => {
  let component: MesCommandes;
  let fixture: ComponentFixture<MesCommandes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MesCommandes],
    }).compileComponents();

    fixture = TestBed.createComponent(MesCommandes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
