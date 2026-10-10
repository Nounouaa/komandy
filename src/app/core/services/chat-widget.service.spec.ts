import { TestBed } from '@angular/core/testing';

import { ChatWidgetService } from './chat-widget.service';

describe('ChatWidgetService', () => {
  let service: ChatWidgetService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatWidgetService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
