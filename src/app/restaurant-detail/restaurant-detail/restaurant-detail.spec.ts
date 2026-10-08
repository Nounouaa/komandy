import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantDetail } from './restaurant-detail';

describe('RestaurantDetail', () => {
  let component: RestaurantDetail;
  let fixture: ComponentFixture<RestaurantDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(RestaurantDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
