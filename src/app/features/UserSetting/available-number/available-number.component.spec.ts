import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvailableNumberComponent } from './available-number.component';

describe('AvailableNumberComponent', () => {
  let component: AvailableNumberComponent;
  let fixture: ComponentFixture<AvailableNumberComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvailableNumberComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AvailableNumberComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
