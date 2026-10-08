import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantLayout } from './restaurant-layout';

describe('RestaurantLayout', () => {
  let component: RestaurantLayout;
  let fixture: ComponentFixture<RestaurantLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantLayout],
    }).compileComponents();

    fixture = TestBed.createComponent(RestaurantLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
