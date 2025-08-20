import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MainApplyServiceComponent } from './mainApplyService.component';

describe('MainApplyServiceComponent', () => {
  let component: MainApplyServiceComponent;
  let fixture: ComponentFixture<MainApplyServiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainApplyServiceComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(MainApplyServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
