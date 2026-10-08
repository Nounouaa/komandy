import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Apropos } from './apropos';

describe('Apropos', () => {
  let component: Apropos;
  let fixture: ComponentFixture<Apropos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Apropos],
    }).compileComponents();

    fixture = TestBed.createComponent(Apropos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
