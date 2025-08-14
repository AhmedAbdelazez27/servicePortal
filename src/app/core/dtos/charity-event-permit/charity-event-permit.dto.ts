export interface Step1Value {
  userId: string;
  requestDate: string; // RFC3339
  eventName: string;
  eventLocation: string;
  startDate: string;   // RFC3339
  endDate: string;     // RFC3339
  supervisorName: string;
  jopTitle: string;
  telephone1: string;
  telephone2: string;
  email: string | null;
  advertisementType: 1 | 2;
  notes: string | null;
  donationCollectionChannelIds: number[];
}

export interface PartnerRow {
  name: string;
  type: number;              
  licenseIssuer: string | null;
  licenseExpiryDate: string | null;  
  licenseNumber: string | null;
  contactDetails: string | null;
  mainApplyServiceId: number | null;
}