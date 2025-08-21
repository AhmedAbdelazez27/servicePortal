export interface Step1Value {
  userId: string;
  requestDate: string; 
  eventName: string;
  eventLocation: string;
  startDate: string;   
  endDate: string;     
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

// ---- Models (اختياري للتوضيح) ----
export interface RequestAdvertisementTarget {
  mainApplyServiceId: number | null;
  lkpTargetTypeId: number;
  othertxt: string | null;
}

export interface RequestAdvertisementMethod {
  mainApplyServiceId: number | null;
  lkpAdMethodId: number;
  othertxt: string | null;
}

export interface RequestAdvertisementLocation {
  mainApplyServiceId: number | null;
  location: string;
}

export interface RequestAdvertisementAttachment {
  fileBase64: string;
  fileName: string;
  masterId: number;
  attConfigID: number;
}

export interface RequestAdvertisement {
  parentId: number | null;
  mainApplyServiceId: number | null;
  requestNo: number | null;
  serviceType: number;          
  workFlowServiceType: number;  
  requestDate: string;           
  userId: string;
  provider: string | null;
  adTitle: string;
  adLang: 'ar' | 'en';
  startDate: string;             
  endDate: string;               
  mobile: string | null;
  supervisorName: string | null;
  fax: string | null;
  eMail: string | null;
  targetedAmount: number | null;
  newAd: boolean | null;
  reNewAd: boolean | null;
  oldPermNumber: string | null;
  requestEventPermitId: number | null;
  attachments: RequestAdvertisementAttachment[];
  requestAdvertisementTargets: RequestAdvertisementTarget[];
  requestAdvertisementAdLocations: RequestAdvertisementLocation[];
  requestAdvertisementAdMethods: RequestAdvertisementMethod[];
}


export interface PermitRequestForm {
  requestDate: string;                    // RFC3339
  lkpRequestTypeId: any;          
  userId: string;                         // max 450
  requestSide: string;                    // max 200
  supervisingSide: string;                // max 200
  eventName: string;                      // max 200
  startDate: string;                      // RFC3339
  endDate: string;                        // RFC3339
  lkpPermitTypeId: any;            
  eventLocation: string;                  // max 500
  amStartTime: string;                    // RFC3339 or ''
  amEndTime: string;                      // RFC3339 or ''
  pmStartTime: string;                    // RFC3339 or ''
  pmEndTime: string;                      // RFC3339 or ''
  admin: string;                          // max 200
  delegateName: string;                   // max 200
  alternateName: string;                  // max 100
  adminTel: string;                       // 7..20, phone pattern
  telephone: string;                      // 7..20, phone pattern
  email: string | null;                   // max 50, email
  notes: string | null;                   // max 4000
  targetedAmount: number | null;          // >= 0
  beneficiaryIdNumber: string | null;
  donationCollectionChannelIds: number[]; // min length 1
}
