import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantClient } from './restaurant-client';

describe('RestaurantClient', () => {
  let component: RestaurantClient;
  let fixture: ComponentFixture<RestaurantClient>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantClient],
    }).compileComponents();

    fixture = TestBed.createComponent(RestaurantClient);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
