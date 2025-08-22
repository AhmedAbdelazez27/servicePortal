export class FiltermainApplyServiceDto {
  searchValue: string | null = null;
  skip: number = 0;
  take: number = 10;
  orderByValue: string | null = null;

  userId: string | null = null;
  serviceId: string | null = null;
  serviceType: string | null = null;
  serviceStatus: string | null = null;
  applyDate: string | null = null;
  applyNo: string | null = null;

  userIdstr: string | null = null;
  serviceIdstr: string | null = null;
  serviceTypestr: string | null = null;
  serviceStatusstr: string | null = null;
  applyDatestr: string | null = null;
}
export class FiltermainApplyServiceByIdDto {
  id: string | null = null;
}
export class mainApplyServiceDto {
  id: number | null = null;
  userId: string | null = null;
  serviceId: number | null = null;
  applyDate: Date | null = null;
  applyNo: string | null = null;
  parentId: number | null = null;
  lastStatus: string | null = null;
  lastStatusEN: string | null = null;
  lastModified: Date | null = null;
  permitNumber: string | null = null;
  notesForApproving: string | null = null;
  reasonForModification: string | null = null;
  service: ServiceDto | null = null;
  user: AppUserDto | null = null;
  workFlowSteps: WorkFlowStepDto[] = [];
  attachments: AttachmentDto[] = [];
  partners: PartnerDto[] = [];
  requestAdvertisementAdLocations: RequestAdvertisementAdLocationDto[] = [];
  requestAdvertisementAdMethods: RequestAdvertisementAdMethodDto[] = [];
  requestAdvertisementTargets: RequestAdvertisementTargetDto[] = [];
  requestPlaintEvidences: RequestPlaintEvidenceDto[] = [];
  requestPlaintJustifications: RequestPlaintJustificationDto[] = [];
  requestPlaintReasons: RequestPlaintReasonDto[] = [];
  fastingTentService: FastingTentServiceDto | null = null;
  requestEventPermit: RequestEventPermitDto | null = null;
  requestPlaint: RequestPlaintDto | null = null;
  charityEventPermit: CharityEventPermitDto | null = null;
  requestComplaint: RequestComplaintDto | null = null;
}
export class ServiceDto {
  serviceId: number | null = null;
  serviceName: string | null = null;
  serviceNameEn: string | null = null;
  descriptionAr: string | null = null;
  descriptionEn: string | null = null;
  mainServiceClassificationId: number | null = null;
  subServiceClassificationId: number | null = null;
  serviceRefrenceNo: string | null = null;
  serviceType: number | null = null;
  serviceTypeName: string | null = null;
  active: boolean | true = true;
  lastModified: Date | null = null;
  attributes: AttributeDto | null = null;
  serviceDepartments: ServiceDepartmentDto | null = null;
  attachmentsConfigs: AttachmentsConfigDto[] | null = null;
}
export class AttributeDto {
  id: number | null = null;
  nameAr: string | null = null;
  nameEn: string | null = null;
  referenceAttributeType: number | null = null;
  referenceAttributeId: number | null = null;
  viewOrder: number | null = null;
  attributeValues: AttributeValueDto[] = [];
}
export class AttributeValueDto {
  id: number | null = null;
  valueAr: string | null = null;
  valueEn: string | null = null;
  viewOrder: number | null = null;
  attributeId: number | null = null;
}

export class ServiceDepartmentDto {
  serviceDeptId: number | null = null;
  serviceId: number | null = null;
  deptId: number | null = null;
  serviceLevel: number | null = null;
  lastModified: Date | null = null;
  departmentAction: number | null = null;
  departmentActionName: string | null = null;
  stepName: string | null = null;
  department: DepartmentDto | null = null;
}
export class DepartmentDto {
  dept_ID: number | null = null;
  aname: string | null = null;
  ename: string | null = null;
  isActive: boolean | true = true;
  last_Modify: Date | null = null;
}
export class AttachmentsConfigDto {
  id: number | null = null;
  attachmentsConfigType: number | null = null;
  name: string | null = null;
  nameEn: string | null = null;
  active: boolean | true = true;
  mendatory: boolean | true = true;
  lastModified: Date | null = null;
  attachments: AttachmentDto[] = [];
}

export class AttachmentDto {
  id: number | null = null;
  masterId: number | null = null;
  imgPath: string | null = null;
  masterType: number | null = null;
  attachmentTitle: string | null = null;
  lastModified: Date | null = null;
  attConfigID: number | null = null;
}
export class AppUserDto {
  id: string | null = null;
  masterId: number | null = null;
  name: string | null = null;
  nameEn: string | null = null;
  telNumber: string | null = null;
  address: string | null = null;
  gender: number | null = null;
  cityId: string | null = null;
  countryId: string | null = null;
  entityIdInfo: string | null = null;
  userName: string | null = null;
  phoneNumber: string | null = null;
  email: string | null = null;
  userType: number | null = null;
  userTypeName: string | null = null;
  foundationType: string | null = null;
  foundationName: string | null = null;
  licenseNumber: string | null = null;
  licenseEndDate: Date | null = null;
  civilId: string | null = null;
  fax: string | null = null;
  boxNo: string | null = null;
  entityId: string | null = null;
  applyDate: Date | null = null;
  userStatus: number | null = null;
  userStatusName: string | null = null;
  serviceType: number | null = null;
  attachments: AttachmentDto[] = [];
}

export class WorkFlowStepDto {
  paymentId: string | null = null;
  id: number | null = null;
  empId: string | null = null;
  deptId: number | null = null;
  departmentName: string | null = null;
  mainApplyServiceId: number | null = null;
  serviceStatus: number | null = null;
  serviceStatusName: string | null = null;
  refuseReason: string | null = null;
  stepOrder: number | null = null;
  lastModified: Date | null = null;
  workFlowComments: WorkFlowCommentDto[] = [];
}
export class WorkFlowCommentDto {
  paymentId: string | null = null;
  id: number | null = null;
  empId: string | null = null;
  employeeDepartmentName: string | null = null;

  workFlowStepsId: number | null = null;
  comment: string | null = null;
  lastModified: Date | null = null;
  commentTypeId: number | null = null;
  attachments: AttachmentDto[] = [];
}


export class PartnerDto {
  id: number | null = null;
  name: string | null = null;
  type: number | null = null;
  typeName: string | null = null;
  licenseIssuer: string | null = null;
  licenseExpiryDate: Date | null = null;
  licenseNumber: string | null = null;
  contactDetails: string | null = null;
  createdBy: string | null = null;
  creationDate: Date | null = null;

  modifiedBy: string | null = null;
  modificationDate: Date | null = null;
  mainApplyServiceId: number | null = null;
  attachments: AttachmentDto[] = [];
}

export class RequestAdvertisementAdLocationDto {
  id: number | null = null;
  mainApplyServiceId: number | null = null;
  location: string | null = null;
}

export class RequestAdvertisementAdMethodDto {
  id: number | null = null;
  mainApplyServiceId: number | null = null;
  lkpAdMethodId: number | null = null;
  othertxt: string | null = null;
}

export class RequestAdvertisementTargetDto {
  id: number | null = null;
  mainApplyServiceId: number | null = null;
  lkpTargetTypeId: number | null = null;
  othertxt: string | null = null;
}

export class RequestPlaintEvidenceDto {
  id: number | null = null;
  mainApplyServiceId: number | null = null;
  evidence: string | null = null;
}

export class RequestPlaintJustificationDto {
  id: number | null = null;
  mainApplyServiceId: number | null = null;
  justification: string | null = null;
}

export class RequestPlaintReasonDto {
  id: number | null = null;
  mainApplyServiceId: number | null = null;
  lkpPlaintReasonsId: number | null = null;
  lkpPlaintReasonsName: string | null = null;
}

export class FastingTentServiceDto {
  id: number | null = null;
  mainApplyServiceId: number | null = null;
  userId: string | null = null;
  locationType: string | null = null;
  locationTypeId: number | null = null;
  ownerName: string | null = null;
  regionName: string | null = null;
  streetName: string | null = null;
  groundNo: string | null = null;
  address: string | null = null;
  startDate: Date | null = null;
  endDate: Date | null = null;
  notes: string | null = null;
  locationId: number | null = null;
  isConsultantFromAjman: boolean | true = true;
  isConsultantApprovedFromPolice: boolean | true = true;
  supervisorName: string | null = null;
  jopTitle: string | null = null;
  supervisorMobile: string | null = null;
  tentIsSetUp: boolean | true = true;
  tentDate: Date | null = null;
  distributionSiteCoordinators: string | null = null;
  distributionSitePhotoPath: string | null = null;
  location: LocationDto | null = null;
  mainApplyService: mainApplyServiceDto | null = null;
}

export class LocationDto {
  id: number | null = null;
  locationType: string | null = null;
  locationOwner: string | null = null;
  region: string | null = null;
  street: string | null = null;
  locationNo: string | null = null;
  address: string | null = null;
  locationName: string | null = null;
  entityId: string | null = null;
  locationCoordinates: string | null = null;
  isActive: boolean | true = true;
  regionId: number | null = null;
  locationTypeId: number | null = null;
  notes: string | null = null;
  locationPhotoPath: string | null = null;
  regionEntity: RegionDto | null = null;
  attachment: AttachmentDto | null = null;
}

export class RegionDto {
  id: number | null = null;
  regionArabicName: string | null = null;
  regionEnglishName: string | null = null;
  maxCountOfLocations: number | null = null;
  currenLocationCount: number | null = null;
  isActive: boolean | true = true;
}

export class RequestEventPermitDto {
  id: number | null = null;
  mainApplyServiceId: number | null = null;
  requestDate: Date | null = null;
  requestNo: number | null = null;
  lkpRequestTypeId: number | null = null;
  lkpRequestTypeName: string | null = null;
  requestSide: string | null = null;
  supervisingSide: string | null = null;
  eventName: string | null = null;
  startDate: Date | null = null;
  endDate: Date | null = null;
  lkpPermitTypeId: number | null = null;
  lkpPermitTypeName: string | null = null;
  eventLocation: string | null = null;
  amStartTime: Date | null = null;
  amEndTime: Date | null = null;
  pmStartTime: Date | null = null;
  pmEndTime: Date | null = null;
  admin: string | null = null;
  delegateName: string | null = null;
  alternateName: string | null = null;
  adminTel: string | null = null;
  telephone: string | null = null;
  email: string | null = null;
  notes: string | null = null;
  targetedAmount: number | null = null;
  beneficiaryIdNumber: string | null = null;
  requestAdvertisements: RequestAdvertisementDto[] = [];
  donationCollectionChannels: DonationCollectionChannelDto[] = [];
  mainApplyService: mainApplyServiceDto[] = [];
}

export class DonationCollectionChannelDto {
  id: number | null = null;
  nameAr: string | null = null;
  nameEn: string | null = null;
  descriptionAr: string | null = null;
  descriptionEn: string | null = null;
  isActive: boolean | true = true;
}

export class RequestAdvertisementDto {
  id: number | null = null;
  mainApplyServiceId: number | null = null;
  requestNo: number | null = null;
  requestDate: Date | null = null;
  provider: string | null = null;
  adTitle: string | null = null;
  adLang: string | null = null;
  startDate: Date | null = null;
  endDate: Date | null = null;
  mobile: string | null = null;
  supervisorName: string | null = null;
  fax: string | null = null;
  eMail: string | null = null;
  targetedAmount: number | null = null;
  newAd: boolean | true = true;
  reNewAd: boolean | true = true;
  oldPermNumber: string | null = null;
  parentId: number | null = null;
  requestEventPermitId: number | null = null;
  attachment: AttachmentDto[] = [];
  requestAdvertisementTargets: RequestAdvertisementTargetDto[] = [];
  requestAdvertisementAdLocations: RequestAdvertisementAdLocationDto[] = [];
  requestAdvertisementAdMethods: RequestAdvertisementAdMethodDto[] = [];
}

export class RequestPlaintDto {
  id: number | null = null;
  mainApplyServiceId: number | null = null;
  requestMainApplyServiceId: number | null = null;
  requestNo: number | null = null;
  requestDate: Date | null = null;
  notes: string | null = null;
  details: string | null = null;
  mainApplyService: mainApplyServiceDto | null = null;
  attachmentsConfigs: AttachmentsConfigDto [] = [];
}

export class CharityEventPermitDto {
  id: number | null = null;
  mainApplyServiceId: number | null = null;
  requestNo: number | null = null;
  requestDate: Date | null = null;
  eventName: string | null = null;
  eventLocation: string | null = null;
  startDate: Date | null = null;
  endDate: Date | null = null;
  supervisorName: string | null = null;
  jopTitle: string | null = null;
  telephone1: string | null = null;
  telephone2: string | null = null;
  email: string | null = null;
  advertisementType: number | null = null;
  advertisementTypeName: string | null = null;
  notes: string | null = null;
  requestAdvertisements: RequestAdvertisementDto[] = [];
  donationCollectionChannels: DonationCollectionChannelDto[] = [];
  mainApplyService: mainApplyServiceDto | null = null;
}

export class RequestComplaintDto {
  id: number | null = null;
  userId: string | null = null;
  mainApplyServiceId: number | null = null;
  complaintType: number | null = null;
  complaintTypeName: string | null = null;
  contactNumber: string | null = null;
  applicantName: string | null = null;
  details: string | null = null;
  email: string | null = null;
  notes: string | null = null;
  requestDate: Date | null = null;
  mainApplyService: mainApplyServiceDto | null = null;
  user: AppUserDto | null = null;
}

