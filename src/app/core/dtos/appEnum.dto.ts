export class AppEnum {
  serviceId1 = "1";
  serviceId2 = "2";
  serviceId3 = "3";
  serviceId4 = "4";
  serviceId5 = "5";
  serviceId6 = "6";
  serviceId7 = "7";
  serviceId1001 = "1001";
  serviceId1002 = "1002";
}

export enum ServiceStatus {
  Accept = 1,
  Reject = 2,
  New = 3,
  Wait = 4,
  Received = 5,
  ReturnForModifications = 7,
  RejectForReason = 1222
}
export enum ServicesType {
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
