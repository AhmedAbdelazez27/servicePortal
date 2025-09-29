export interface NotificationDto {
  notificationId: string; // Guid from backend
  titleAr: string;
  titleEn: string;
  messageAr?: string | null;
  messageEn?: string | null;
  notificationDate: string; // DateTime from backend
  empId?: string | null;
  isSeen: boolean;
  workFlowStepsId?: number | null; // long from backend
  registerId?: string | null;
  link?: string | null;
  lastModify: string; // DateTime from backend
  serviceStatus?: ServiceStatus | null;
  serviceStatusName?: string | null;
  messageId?: string | null;
  
  // Keep 'id' for backward compatibility
  id?: string;
}

export interface CreateNotificationDto {
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  empId?: string; // EmpId that make workflow
  workFlowStepsId?: number;
  registerId: string; // toUserId
}

export interface CreateDepartmentNotificationDto {
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  workFlowStepsId?: number;
  departmentId: number;
}

export interface SendNotificationToDepartmentDto {
  workFlowStepsId?: number;
  departmentId: number;
  serviceType: ServiceType;
  serviceStatus: ServiceStatus;
  applyNo: string;
}

export interface GetAllNotificationRequestDto {
 // userId: string;
  isSeen?: boolean;
  skip: number;
  take: number;
}

// Enums to match backend
export enum ServiceType {
  TentPermission = 1,
  CharityEventPermit = 2,
  GrievanceRequest = 3,
  DonationCampaignPermitRequest = 4,
  DistributionSitePermitApplication = 5,
  RequestComplaint = 6
}

export enum ServiceStatus {
  Pending = 1,
  InProgress = 2,
  Approved = 3,
  Rejected = 4,
  Completed = 5
}

export interface UpdateFCMTokenDto {
  fcmToken: string;
  userId: string;
}

export interface PagedResultDto<T> {
  totalCount: number;
  data: T[];
}
