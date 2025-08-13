import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttachmentsConfigComponent } from './attachments-config.component';

describe('AttachmentsConfigComponent', () => {
  let component: AttachmentsConfigComponent;
  let fixture: ComponentFixture<AttachmentsConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttachmentsConfigComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttachmentsConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
