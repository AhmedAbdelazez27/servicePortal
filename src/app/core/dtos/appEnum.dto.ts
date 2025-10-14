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
  RejectForReason = 3,
  Wait = 4,
  Received = 5,
  ReturnForModifications = 7
}
