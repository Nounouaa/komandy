import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantSidebar } from './restaurant-sidebar';

describe('RestaurantSidebar', () => {
  let component: RestaurantSidebar;
  let fixture: ComponentFixture<RestaurantSidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantSidebar],
    }).compileComponents();

    fixture = TestBed.createComponent(RestaurantSidebar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
