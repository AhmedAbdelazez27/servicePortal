export interface DistributionSiteRequestDto {
  id?: number;
  mainApplyServiceId?: number;
  userId?: string;
  locationType?: string;
  locationTypeId?: number;
  ownerName?: string;
  regionName?: string;
  streetName?: string;
  groundNo?: string;
  address?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  locationId?: number;
  isConsultantFromAjman?: boolean;
  isConsultantApprovedFromPolice?: boolean;
  supervisorName?: string;
  jopTitle?: string;
  supervisorMobile?: string;
  tentIsSetUp?: boolean;
  tentDate?: string;
  serviceType?: number;
  distributionSitePhotoPath?: string;
  distributionSiteCoordinators?: string;
  attachments?: DistributionSiteAttachmentDto[];
  partners?: DistributionSitePartnerDto[];
}

export interface CreateDistributionSiteRequestDto {
  mainApplyServiceId?: number; // will send as 0
  userId: string;
  locationType?: string;
  locationTypeId: number;
  ownerName?: string;
  regionName?: string;
  streetName?: string;
  groundNo?: string;
  address?: string;
  startDate: string;
  endDate: string;
  notes?: string;
  locationId?: number;
  isConsultantFromAjman?: boolean;
  isConsultantApprovedFromPolice?: boolean;
  supervisorName?: string;
  jopTitle?: string;
  supervisorMobile?: string;
  tentIsSetUp?: boolean;
  tentDate?: string;
  serviceType: ServiceType;
  distributionSitePhotoPath?: string;
  distributionSiteCoordinators?: string;
  attachments?: DistributionSiteAttachmentDto[];
  partners?: DistributionSitePartnerDto[];
}

export interface UpdateDistributionSiteRequestDto {
  id: number;
  mainApplyServiceId?: number;
  userId?: string;
  locationType?: string;
  locationTypeId?: number;
  ownerName?: string;
  regionName?: string;
  streetName?: string;
  groundNo?: string;
  address?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  locationId?: number;
  isConsultantFromAjman?: boolean;
  isConsultantApprovedFromPolice?: boolean;
  supervisorName?: string;
  jopTitle?: string;
  supervisorMobile?: string;
  tentIsSetUp?: boolean;
  tentDate?: string;
  serviceType?: number;
  distributionSitePhotoPath?: string;
  distributionSiteCoordinators?: string;
  attachments?: DistributionSiteAttachmentDto[];
  partners?: DistributionSitePartnerDto[];
}

export interface DistributionSiteAttachmentDto {
  fileBase64: string;
  fileName: string;
  masterId: number; // will send as 0 for create
  attConfigID: number;
}

export interface DistributionSitePartnerDto {
  name: string;
  type: PartnerType;
  licenseIssuer?: string;
  licenseExpiryDate?: string;
  licenseNumber?: string;
  contactDetails?: string;
  mainApplyServiceId?: number; // will send as 0 for create
  attachments?: DistributionSiteAttachmentDto[]; // Partner-specific attachments
}

export enum PartnerType {
  Person = 1,
  Government = 2,
  Supplier = 3,
  Company = 4
}

export enum ServiceType {
  TentPermission = 1,
  CharityEventPermit = 2,
  RequestForStaffAppointment = 3,
  ReligiousInstitutionRequest = 4,
  RequestAnEventAnnouncement = 5,
  DonationCampaignPermitRequest = 6,
  GrievanceRequest = 7,
  DistributionSitePermitApplication = 1001,
  RequestComplaint = 1002
}

export interface DistributionLocationTypeDto {
  id: number;
  text: string;
  value: string;
}

export interface RegionDto {
  id: number;
  text: string;
  value: string;
}

export interface LocationMapDto {
  id: number;
  locationType: string;
  locationOwner: string;
  region: string;
  street: string;
  locationNo: string;
  address: string;
  locationName: string;
  locationCoordinates: string;
  regionMaxCount: number;
  isAvailable: boolean;
  locationTypeId: number;
}

export interface LocationDetailsDto {
  id: number;
  locationOwner: string;
  region: string;
  street: string;
  address: string;
  locationNo: string;
  notes: string;
  locationTypeId: number;
  locationCoordinates: string;
}

export interface CheckLocationAvailabilityDto {
  locationId: number;
  userId: string;
}

export interface GetAllDistributionSiteRequestParameter {
  skip: number;
  take: number;
  searchValue?: string;
  userId?: string;
  locationTypeId?: number;
  startDate?: string;
  endDate?: string;
}

export interface PagedResultDto<T> {
  totalCount: number;
  items: T[];
}

export interface Select2Item {
  id: string | number;
  text: string;
  label ?:any;
}

export interface Select2RequestDto {
  skip: number;
  take: number;
  searchTerm?: string;
  userId?: string;
}

export interface Select2Result {
  results: Select2Item[];
  total: number;
}
