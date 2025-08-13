import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocationsComponentComponent } from './locations-component.component';

describe('LocationsComponentComponent', () => {
  let component: LocationsComponentComponent;
  let fixture: ComponentFixture<LocationsComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocationsComponentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LocationsComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
