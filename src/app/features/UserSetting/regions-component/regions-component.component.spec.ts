import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegionsComponentComponent } from './regions-component.component';

describe('RegionsComponentComponent', () => {
  let component: RegionsComponentComponent;
  let fixture: ComponentFixture<RegionsComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegionsComponentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegionsComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
