import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InscriptionClient } from './inscription-client';

describe('InscriptionClient', () => {
  let component: InscriptionClient;
  let fixture: ComponentFixture<InscriptionClient>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InscriptionClient],
    }).compileComponents();

    fixture = TestBed.createComponent(InscriptionClient);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
