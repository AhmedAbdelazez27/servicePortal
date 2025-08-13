import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegionsComponentComponent } from '../regions-component/regions-component.component';
import { LocationsComponentComponent } from '../locations-component/locations-component.component';
import { AvailableNumberComponent } from '../available-number/available-number.component';
import { ContactInformationComponent } from '../contact-information/contact-information.component';
import { AttachmentsConfigComponent } from '../attachments-config/attachments-config.component';

@Component({
  selector: 'app-setting-regions-component',
  standalone: true,
  imports: [
    CommonModule,
    RegionsComponentComponent,
    LocationsComponentComponent,
    AvailableNumberComponent,
    ContactInformationComponent,
    AttachmentsConfigComponent,
  ],
  templateUrl: './setting-regions-component.component.html',
  styleUrl: './setting-regions-component.component.scss',
})
export class SettingRegionsComponentComponent {
  activeTab: 'regions' | 'locations' | 'other' | 'contact-information' | 'attachments-config' =
    'regions';

  setActiveTab(tab: 'regions' | 'locations' | 'other' | 'contact-information' | 'attachments-config') {
    this.activeTab = tab;
  }
}
