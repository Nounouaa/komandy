import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Amis } from './amis';

describe('Amis', () => {
  let component: Amis;
  let fixture: ComponentFixture<Amis>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Amis],
    }).compileComponents();

    fixture = TestBed.createComponent(Amis);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
