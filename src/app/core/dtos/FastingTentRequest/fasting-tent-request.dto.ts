export interface FastingTentRequestDto {
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
  attachments?: FastingTentAttachmentDto[];
  partners?: FastingTentPartnerDto[];
}

export interface CreateFastingTentRequestDto {
  mainApplyServiceId?: number; // will send as 0
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
  locationId: number;
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
  attachments?: FastingTentAttachmentDto[];
  partners?: FastingTentPartnerDto[];
  isDraft?: boolean;
}

export interface UpdateFastingTentRequestDto {
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
  attachments?: FastingTentAttachmentDto[];
  partners?: FastingTentPartnerDto[];
}

export interface FastingTentAttachmentDto {
  fileBase64: string;
  fileName: string;
  masterId: number; // will send as 0 for create
  attConfigID: number;
}

export interface FastingTentPartnerDto {
  name: string;
  type: PartnerType;
  licenseIssuer?: string;
  licenseExpiryDate?: string;
  licenseNumber?: string;
  contactDetails?: string;
  mainApplyServiceId?: number; // will send as 0 for create
  attachments?: FastingTentAttachmentDto[]; // Partner-specific attachments
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

export interface TentLocationTypeDto {
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
  locationName: string;
  locationOwner: string;
  region: string;
  street: string;
  address: string;
  locationNo: string;
  notes: string;
  locationTypeId: number;
  locationCoordinates: string;
  locationPhotoPath?: string;
}

export interface CheckLocationAvailabilityDto {
  locationId: number;
  //userId: string;
}

export interface GetAllFastingTentRequestParameter {
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
  label ?:any
}

export interface Select2RequestDto {
  skip: number;
  take: number;
  searchTerm?: string;
  userId?: string;
  isAvailable ?: boolean;
}

export interface Select2Result {
  results: Select2Item[];
  total: number;
}
