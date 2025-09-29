export class ApiEndpoints {
  static readonly User = {
    Base: '/User',
    GetAll: '/GetAll',
    GetById: (id: string) => `/User/${id}`,
    //Delete: (id: string) => `/User/Delete/${id}`,
    Delete: '/Delete',
    GetUsersSelect2List: '/User/GetUsersSelect2List',
    GetUserPermissionList: (id: string) => `/Permission/GetAll/${id}`,
    AssignActionPermission: '/Permission/CreateUserPermission',
    DeleteActionPermission: '/Permission/DeleteUserPermission',
    UserType: '/UserTypes',
    ChangePassword: '/ChangePassword',
    ForgotPassword: '/ForgotPassword ',
    verifyOtp: '/Otp/Verify',
    OtpSendViaEmail: '/Otp/SendViaEmail',
    ResetPassword: '/ResetPassword',
    UpdateUserStatus: '/UpdateUserStatus',
    UAEPassBaseURL: '/UAEPass',
    GetLoginInfo: '/Login',
    GetUAEPAssInfo: '/Register',
    GetMyProfile: '/GetMyProfile',

  };

  static readonly Roles = {
    Base: '/Roles',
    GetPaginated: '/Roles',
    GetAll: '/GetAll',
    GetById: (id: string) => `/${id}`,
    Delete: (id: string) => `/Delete/${id}`,
    Unassign: '/UnAssignRole',
    GetRoleUsers: (roleId: string) => `/GetRoleUsers/${roleId}`,
    GetRolesSelect2List: '/GetRolesSelect2List',
    Assign: '/AssignRole',
    unAssign: '/UnAssignRole',
    GetScreensList: '/GetScreensList',
    AssignScreenPermission: '/AssignScreenPermission',
    GetUserOfRole: (id: string) => `/GetRoleUsers/${id}`,
  };

  static readonly Departments = {
    Base: '/Department',
    Create: '/Create',
    Update: '/Update',
    Get: (id: number) => `/Get/${id}`,
    GetAll: '/GetAll',
    Delete: (id: number) => `/Delete/${id}`,
    Select2: '/Select2',
  };

  static readonly UsersDepartments = {
    Base: '/UsersDepartments',
    Assign: '/Assign',
  };

  static readonly UsersEntities = {
    Base: '/UsersEntities',
    GetUsersEntitiesSelect2List: '/GetAll',
    AssignUserEntities: '/AssignUserEntities',
    AssignRoleEntities: '/AssignRoleEntities',
  };

  static readonly Entity = {
    Base: '/Entity',
    GetSelect2List: '/GetSelect2List',
    GetAll: '/Entity/GetAll',
    GetById: (id: string) => `/Entity/${id}`,
  };

  static readonly AvailableNumber = {
    Base: '/AvailableNumber',
    Create: '/Create',
    Update: '/Update',
    GetAll: '/GetAll',
    GetById: (id: number) => `/GetById/${id}`,
    Delete: (id: number) => `/Delete/${id}`,
  };

  static readonly ContactInformation = {
    Base: '/ContactInformation',
    Create: '/Create',
    Update: '/Update',
    GetAll: '/GetAll',
    GetById: (id: number) => `/GetById/${id}`,
    Delete: (id: number) => `/Delete/${id}`,
  };

  static readonly EntityInfo = {
    Base: '/Lookup/EntityInfo',
  };
  static readonly UserStatus = {
    Base: '/Lookup/UserStatus',
  };


  static readonly ApMiscPaymentHeader = {
    Base: '/ApMiscPaymentHeader',
    GetAll: '/GetAll',
    GetById: (paymentId: string, entityId: string) =>
      `/GetDetailById/${paymentId}/${entityId}`,
    GetPaymentDetailsById: (paymentId: string, entityId: string) =>
      `/GetPaymentDetails/${paymentId}/${entityId}`,
    GetPaymentLinesById: (paymentId: string, entityId: string) =>
      `/GetPaymentLines/${paymentId}/${entityId}`,
  };

  static readonly ArMiscReceiptHeader = {
    Base: '/ArMiscReciptHeader',
    GetAll: '/GetAll',
    GetById: (miscReceiptId: string, entityId: string) =>
      `/GetReceiptHeader/${miscReceiptId}/${entityId}`,
    GetReceiptDetailsById: (miscReceiptId: string, entityId: string) =>
      `/GetReceiptDetails/${miscReceiptId}/${entityId}`,
    GetReceiptLinesById: (miscReceiptId: string, entityId: string) =>
      `/GetReceiptLines/${miscReceiptId}/${entityId}`,
  };

  static readonly ApMiscPaymentTransactionHDR = {
    Base: '/ApPaymentTransactionsHdr',
    GetAll: '/GetAll',
    GetById: (paymentId: string, entityId: string) =>
      `/Get/${paymentId}/${entityId}`,
  };

  static readonly ApVendor = {
    Base: '/ApVendor',
    GetAll: '/GetAll',
    GetById: (vendorId: string, entityId: string) =>
      `/Get/${vendorId}/${entityId}`,
  };

  static readonly GlJeHeader = {
    Base: '/GlJeHeader',
    GetAll: '/GetAll',
    GetById: (receiptId: string, entityId: string) =>
      `/GetGeneralJournalHeaderDetails/${receiptId}/${entityId}`,
    GetLineDetailsById: (receiptId: string, entityId: string) =>
      `/GetGLLines/${receiptId}/${entityId}`,
  };

  static readonly InvoiceHd = {
    Base: '/VwApInvoiceHd',
    GetAll: '/GetAll',
    GetDetailById: (tr_Id: string, entityId: string) =>
      `/GetInvoiceheaderDetails/${tr_Id}/${entityId}`,
    GetById: '/GetInvoiceheaderDetails',
    GetTrDetailsById: '/GetInvoiceTr',
  };

  static readonly FinancialReports = {
    Base: '/FinancialReports',
    CachReceiptRptEndPoint: '/GetCachReceiptRpt',
    GetGeneralLJournalRptEndPoint: '/GetGeneralLJournalRpt',
    GetReceiptRptEndPoint: '/GetReceiptRpt',
    GetVendorsPayRptEndPoint: '/GetVendorsPayRpt',
    GetGeneralProLosRptEndPoint: '/GetGeneralProLosRpt',
    GetTotalBenDonationsRptEndPoint: '/GetTotalBenDonationsRpt',
    GetGetGlTrialBalancesRptEndPoint: '/GetGlTrialBalancesRpt',
    GetGeneralBalanceSheetRptEndPoint: '/GetGeneralBalanceSheetRpt',
  };
  static readonly beneficent = {
    Base: '/SpBeneficents',
    GetAll: '/GetAll',
    GetDetailById: '/Get',
    GetById: (beneficentId: string, entityId: string) =>
      `/GetCasesSearch/${beneficentId}/${entityId}`,
  };

  static readonly Attachments = {
    Base: '/Attachments',
    GetAll: '/GetAll',
    GetById: (id: number) => `/${id}`,
    Create: '',
    Update: '/Update',
    Delete: (id: number) => `/Delete/${id}`,
    SaveFile: '/SaveFile',
    SaveFiles: '/files',
    DeleteFile: (id: number) => `/file/${id}`,
    GetByMasterId: (masterId: number, masterType: number) =>
      `/${masterId}/${masterType}`,
    GetListByMasterId: (masterId: number, masterType: number) =>
      `/list/${masterId}/${masterType}`,
    GetListByMasterIds: '/list/multiple',
  };

  static readonly AttachmentsConfig = {
    Base: '/AttachmentsConfig',
    GetAll: '/GetAll',
    GetById: (id: number) => `/${id}`,
    Create: '/Create',
    Update: '/Update',
    Delete: (id: number) => `/Delete/${id}`,
  };

  static readonly AttachmentsConfigType = {
    Base: '/Lookup/AttachmentsConfigType',
  };

  static readonly LocationType = {
    Base: '/Lookup/LocationType',
  };

  static readonly Location = {
    Base: '/Location',
    Create: '/Create',
    GetAll: '/GetAll',
    GetById: (id: number) => `/Get/${id}`,
    Update: '/Update',
    Delete: (id: number) => `/Delete/${id}`,
    Select2: '/Select2',
    CheckAvailable: '/CheckAvailable',
    GetInteractiveMap: '/GetInteractiveMap',
  };
  static readonly SponsorshipReports = {
    Base: '/GuaranteesReports',
    GetBeneficentsRptEndPoint: '/GetBeneficentsRpt',
    GetCaseSearchRptEndPoint: '/GetCaseSearchRpt',
    GetBenifcientTotalRptEndPoint: '/GetBenifcientTotalRpt',
    GetCaseAidEntitiesRptEndPoint: '/GetCaseAidEntitiesRpt',
    GetCaseSearchListRptEndPoint: '/GetCaseSearchListRpt',
  };

  static readonly SpCasesPayment = {
    Base: '/SpCasesPayment',
    GetspCasesPaymentHdrBase: '/SpCasesPaymentHdr',
    GetAll: '/GetAll',
    GetById: (composeKey: string) => `/Get/${composeKey}`,
    GetspCasesPaymentHdr: (composeKey: string, entityId: string) =>
      `/GetByCode/${composeKey}/${entityId}`,
  };

  static readonly spContracts = {
    Base: '/SpContracts',
    GetAll: '/GetContractsRequests',
    GetContractByIdBase: '/SpContractCases',
    GetContractById: (contractId: string, entityId: string) =>
      `/GetSpContract/${contractId}/${entityId}`,
    GetContractCasesById: (contractId: string, entityId: string) =>
      `/Get/${contractId}/${entityId}`,
  };

  static readonly AidRequest = {
    Base: '/AidRequest',
    AidRequestsZakatBase: '/AidRequestsZakat',
    AidRequestsStudiesBase: '/AidRequestsStudies',
    QuotationHeaderBase: '/QuotationHeader',
    GetAll: '/GetAll',
    GetShowDetailById: (caseCode: string, entityId: string) =>
      `/GetPortaCAidRequest/${caseCode}/${entityId}`,
    GetZakatStudyDetailById: (headerId: string, entityId: string) =>
      `/GetAidRequestsZakat/${headerId}/${entityId}`,
    GetAidRequestsStudyDetailById: (headerId: string, entityId: string) =>
      `/GetAidRequestsStudy/${headerId}/${entityId}`,
    GetQuotationHeaderDetailById: (headerId: string, entityId: string) =>`/GetQuotationHeader/${headerId}/${entityId}`,
  };

  static readonly SocialCasesReports = {
    Base: '/SocialCasesReports',
    GetOrdersListRptEndPoint: '/GetOrdersListRpt',
    GetCasesEntitiesRptEndPoint: '/GetCasesEntitiesRpt',
    GetCaseHelpRptEndPoint: '/GetCaseHelpRpt',
  };

  static readonly caseSearch = {
    Base: '/SpCases',
    GetAll: '/GetAll',
    GetCaseHistoryDetailBase: '/SpCasesHistory',
    GetCasePaymentHdrDetailBase: '/SpCasesPaymentHdr',
    GetContractDetailBase: '/SpContractCases',

    GetById: (caseId: string, entityId: string) => `/Get/${caseId}/${entityId}`,
    GetCaseHistoryDetailsById: (caseId: string, entityId: string) =>
      `/GetCasesHistory/${caseId}/${entityId}`,
    GetCasePaymentHdrDetailsById: (caseId: string, entityId: string) =>
      `/Get/${caseId}/${entityId}`,
    GetContractDetailById: (contractId: string, entityId: string) =>
      `/GetSpContract/${contractId}/${entityId}`,
    GetContractCasesDetailById: (contractId: string, entityId: string) =>
      `/Get/${contractId}/${entityId}`,
  };

  static readonly ServiceRequestsReports = {
    Base: '/ServiceRequestsReports',
    GetServiceRequestsDetailsRptEndPoint: '/GetServiceRequestsDetailsRpt',
    GetTotalServiceRequestsRptEndPoint: '/GetTotalServiceRequestsRpt',
  };

  static readonly Regions = {
    Base: '/Regions',
    Create: '/Create',
    GetAll: '/GetAll',
    GetById: (id: number) => `/Get/${id}`,
    Update: '/Update',
    Delete: (id: number) => `/Delete/${id}`,
    Select2: '/Select2',
  };

  static readonly ProjectReports = {
    Base: '/ProjectReports',
    GetProjectListRptEndPoint: '/GetProjectListRpt ',
  };

  static readonly ScProject = {
    Base: '/ScProject',
    GetAll: '/GetAllProject',
    GetDetailsByIdBase: '/ProjectsHdr',
    GetDetailsById: (projectId: string, entityId: string) =>
      `/GetProjectHeader/${projectId}/${entityId}`,
    GetRecieptProjectsDetailsByIdBase: '/ArMiscReciptHeader',
    GetRecieptProjectsDetailsById: (projectId: string, entityId: string) =>
      `/GetMiscRecieptProjects/${projectId}/${entityId}`,
    GetProjectImplement: (projectId: string, entityId: string) =>
      `/CpProjectImplement/${projectId}/${entityId}`,
  };
  static readonly Charts = {
    Base: '/Charts',
    RevenueAndExpenses: '/RevenueAndExpenses',
  };

  static readonly Services = {
    Base: '/Services',
    GetAll: '/GetAll',
    GetById: (id: number) => `/Get/${id}`,
    Update: '/Update',
    Delete: (id: number) => `/Delete/${id}`,
  };

  static readonly RequestPlaint = {
    Base: '/RequestPlaint',
    Create: '/Create',
    GetByMainApplyServiceId: (mainApplyServiceId: number) =>
      `/GetByMainApplyServiceId/${mainApplyServiceId}`,
  };

  static readonly MainApplyRequestService = {
    Base: '/MainApplyRequestService',
    GetSelect2: '/GetSelect2',
  };

  static readonly Lookup = {
    PlaintReasons: '/Lookup/PlaintReasons',
    ComplaintType: '/Lookup/ComplaintType',
    TentLocationType: '/Lookup/TentLocationType',
    DistributionLocationType: '/Lookup/DistributionLocationType',
  };

  static readonly RequestComplaint = {
    Base: '/RequestComplaint',
    Create: '/Create',
    GetByMainApplyServiceId: (mainApplyServiceId: number) =>
      `/GetByMainApplyServiceId/${mainApplyServiceId}`,
  };
  static readonly MainApplyService = {
    Base: '/MainApplyRequestService',
    GetAll: '/GetAll',
    GetById: (id: string) => `/Get/${id}`,
    Update: '/Update',
  };

  static readonly FastingTentRequest = {
    Base: '/FastingTentRequest',
    Create: '',
    GetByMainApplyServiceId: (mainApplyServiceId: number) =>
      `/GetByMainApplyServiceId/${mainApplyServiceId}`,
    GetAll: '/GetAll',
    Update: '/Update',
    Delete: (id: number) => `/Delete/${id}`,
  };

  static readonly DistributionSiteRequest = {
    Base: '/DistributionSiteRequest',
    Create: '',
    GetByMainApplyServiceId: (mainApplyServiceId: number) =>
      `/GetByMainApplyServiceId/${mainApplyServiceId}`,
    GetAll: '/GetAll',
    Update: '/Update',
    Delete: (id: number) => `/Delete/${id}`,
  };
  static readonly RequestEventPermits = {
    Base: '/RequestEventPermits',
    Create: '/Create'
  };
  static readonly CharityEventPermit = {
    Base: '/CharityEventPermit',
    Create: '/Create'
  };

  static readonly Notifications = {
    Base: '/Notifications',
    GetAll: '/Notifications/GetAll',
    GetById: (id: string) => `/Notifications/Get/${id}`,
    Create: '/Notifications/Create',
    MarkAsSeen: (id: string) => `/Notifications/MarkAsSeen/${id}`,
    //GetUnseenCount: (userId: string) => `/Notifications/GetUnseenCount/${userId}`,
    GetUnseenCount: '/GetUnseenCount',
    SendToDepartment: '/Notifications/SendToDepartment'
  };

  static readonly FCMToken = {
    Update: '/User/UpdateFCMToken'
  };
  
  static readonly Advertisement = {
    Create: '/Advertisement/Create'
  };


  static readonly UAE_PASS_CONFIG = {
    baseUrl: 'https://stg-id.uaepass.ae/idshub',

    //getURLCredention: {
    //  clientId: 'sandbox_stage',
    //  //  redirectUri: 'http://compassint.ddns.net:2040/login'
    //  redirectUri: 'http://localhost:4200/login',
    //  clientsecret: 'HnlHOJTkTb66Y5H'
    //},

    getURLCredention: {
      clientId: 'ccc_web_stg',
      clientsecret: 'Q9pOTvlchYARcSFL',
      redirectUri: 'https://192.168.51.130:2001/login'
    }
  };
}
