import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingRegionsComponentComponent } from './setting-regions-component.component';

describe('SettingRegionsComponentComponent', () => {
  let component: SettingRegionsComponentComponent;
  let fixture: ComponentFixture<SettingRegionsComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingRegionsComponentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SettingRegionsComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
