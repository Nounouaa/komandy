import { TestBed } from '@angular/core/testing';

import { RestaurantBranding } from './restaurant-branding';

describe('RestaurantBranding', () => {
  let service: RestaurantBranding;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RestaurantBranding);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
