import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestKomandy } from './test-komandy';

describe('TestKomandy', () => {
  let component: TestKomandy;
  let fixture: ComponentFixture<TestKomandy>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestKomandy],
    }).compileComponents();

    fixture = TestBed.createComponent(TestKomandy);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
