import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantStatistique } from './restaurant-statistique';

describe('RestaurantStatistique', () => {
  let component: RestaurantStatistique;
  let fixture: ComponentFixture<RestaurantStatistique>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantStatistique],
    }).compileComponents();

    fixture = TestBed.createComponent(RestaurantStatistique);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
