import { Injectable } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { ToastrService } from "ngx-toastr";
import { Subject, forkJoin, Observable, takeUntil } from "rxjs";
import { environment } from "../../../../environments/environment";
import { mainApplyServiceDto, FiltermainApplyServiceByIdDto } from "../../dtos/mainApplyService/mainApplyService.dto";
import { SpinnerService } from "../spinner.service";
import { MainApplyService } from "./mainApplyService.service";
import { ServicesType } from "../../dtos/appEnum.dto";


@Injectable({
  providedIn: 'root'
})

export class MainApplyServiceReportService {

  showReport: boolean = false;
  id: string | null = null;
  qrCodeBase64: string | null = null;
  qrCodeUrl: string | null = null;
  reportHeader: string | null = null;
  reportFooter: string | null = null;
  reportFooter1: string | null = null;
  reportFooter2: string | null = null;
  reportHeaderIcon: string | null = null;
  currecntDept: string | null = null;
  private destroy$ = new Subject<void>();
  reportData: mainApplyServiceDto = {} as mainApplyServiceDto;
  reportWindow = window.open('', '_blank');
  constructor(
    private mainApplyService: MainApplyService,
    private translate: TranslateService,
    private spinnerService: SpinnerService,
    private toastr: ToastrService,
  ) { }


  async printDatabyId(id: string, serviceId: number, status: string): Promise<void> {
    this.spinnerService.show();

    const params: FiltermainApplyServiceByIdDto = { id };
    //const qrUrl = `${environment.apiBaseUrl}login/PrintD?no=${id}&status=${status}`;
    const baseUrl = window.location.origin;

    const qrUrl = `${baseUrl}/report-view/${id}/${serviceId}/${status}`;

    try {
      // Generate QR with fallback
      this.qrCodeBase64 = await this.generateQRCodeWithRetry(qrUrl, 2, 3000);
      
    } catch {
      console.warn('QR generation failed, using fallback QR');
      const QRCode = (await import("qrcode")).default;
      this.qrCodeBase64 = await QRCode.toDataURL('Fallback QR', { width: 120 });
    }

    forkJoin({
      mischeaderdata: this.mainApplyService.getDetailById(params) as Observable<mainApplyServiceDto | mainApplyServiceDto[]>,
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          try {
            const reportDatas = Array.isArray(result.mischeaderdata)
              ? result.mischeaderdata[0] ?? ({} as mainApplyServiceDto)
              : result.mischeaderdata;

            const baseUrl = window.location.origin;
            //this.reportHeader = `${baseUrl}/assets/images/council-logo.png`;
            this.reportHeader = `${baseUrl}/assets/images/reportHeaderNew.png`;
            this.reportFooter = `${baseUrl}/assets/images/reportFooter.png`;
            this.reportFooter1 = `${baseUrl}/assets/images/reportFooter1.png`;
            this.reportFooter2 = `${baseUrl}/assets/images/reportFooter2.png`;
            this.reportHeaderIcon = `${baseUrl}/assets/images/reportHeaderIcon.png`;
            this.reportData = reportDatas;
            this.id = id;
            // Open new window for report
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
              alert('Please allow pop-ups for this site.');
              return;
            }

            // ✅ Strict A4 styling
            // ✅ Strict one-page A4 style
            const isArabic = this.translate.currentLang === 'ar';

            const a4Style = `
<style>
  @page {
    size: A4 portrait;
    margin: 10mm;
  }

  html {
    overflow: auto !important;
  }

  html, body {
    margin: 0;
    padding: 0;
    width: 190mm !important;
    height: 277mm !important;
    background: #fff;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    font-family: ${isArabic ? '"DIN Next LT Arabic Regular", "Tahoma", sans-serif' : '"Arial", sans-serif'} !important;
    direction: ${isArabic ? 'rtl' : 'ltr'};
    text-align: ${isArabic ? 'right' : 'left'};
  }

  body {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    background: #f2f2f2; /* light gray background outside A4 */
  }

  .a4-page {
    box-sizing: border-box;
    width: 190mm;
    height: 277mm;
    margin: 0 auto;
    padding: 2mm 2mm 35mm 2mm; /* leave space for footer */
    background: #fff;
    border: 1px solid #ddd;
    position: relative;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    text-align: ${isArabic ? 'right' : 'left'};
  }

  .report-content {
    flex: 1 0 auto;
    text-align: inherit;
  }

  .report-footer {
    flex-shrink: 0;
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    direction: ${isArabic ? 'rtl' : 'ltr'};
  }

  td, th {
    border: 1px solid #ccc;
    padding: 5px;
    vertical-align: top;
    word-break: break-word;
    text-align: ${isArabic ? 'right' : 'left'};
  }

  img {
    max-width: 100%;
    height: auto;
  }

  .badge {
    padding: 4px 10px;
    border-radius: 5px;
    color: #fff;
    font-weight: bold;
  }

  /* ✅ Toolbar for download button */
  .toolbar {
    text-align: right;
    background: #f8f9fa;
    padding: 10px;
    border-bottom: 1px solid #ccc;
    position: sticky;
    top: 0;
  }

  .btn-download {
    background: #007bff;
    color: white;
    border: none;
    padding: 8px 15px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.3s;
  }

  .btn-download:hover {
    background: #0056b3;
  }

  @media print {
    html, body {
      overflow: hidden !important;
    }
    .toolbar { display: none !important; }
    .a4-page {
      box-shadow: none !important;
      border: none !important;
      width: 190mm !important;
      height: 277mm !important;
    }
  }
</style>`;



            let reportHtml = '';

            if (serviceId === ServicesType.TentPermission) {
              if (status === 'final') {
                reportHtml = this.buildFinalFastingTentServiceReport();
              } else {
                reportHtml = this.buildInitialFastingTentServiceReport();
              }
            }
            else if (serviceId === ServicesType.CharityEventPermit) {
              reportHtml = this.buildCharityEventPermitReport();
            }
            else if (serviceId === ServicesType.RequestForStaffAppointment) {
              this.translate
                .get(['mainApplyServiceReportsResourceName.NO_REPORT'])
                .subscribe(translations => {
                  this.toastr.error(
                    `${translations['mainApplyServiceReportsResourceName.NO_REPORT']}`,
                  );
                });
              return;
            }
            else if (serviceId === ServicesType.ReligiousInstitutionRequest) {
              this.translate
                .get(['mainApplyServiceReportsResourceName.NoPermission'])
                .subscribe(translations => {
                  this.toastr.error(
                    `${translations['mainApplyServiceReportsResourceName.NO_REPORT']}`,
                  );
                });
              return;
            }
            else if (serviceId === ServicesType.RequestAnEventAnnouncement) {
              this.translate
                .get(['mainApplyServiceReportsResourceName.NoPermission'])
                .subscribe(translations => {
                  this.toastr.error(
                    `${translations['mainApplyServiceReportsResourceName.NO_REPORT']}`,
                  );
                });
              return;
            }
            else if (serviceId === ServicesType.DonationCampaignPermitRequest) {
              reportHtml = this.buildDonationCampaignPermitRequestReport();
            }
            else if (serviceId === ServicesType.GrievanceRequest) {
              reportHtml = this.buildGrievanceRequestReport();
            }
            else if (serviceId === ServicesType.DistributionSitePermitApplication) {
              reportHtml = this.buildDistributionSitePermitApplicationReport();
            }
            else if (serviceId === ServicesType.RequestComplaint) {
              reportHtml = this.buildRequestComplaintReport();
            }
            else {
              reportHtml = `<p>No report template available for this service.</p>`;
            }

            printWindow.document.open();
            printWindow.document.write(`
            <html><head>${a4Style}</head>

            <body>
            <div class="a4-page" id="reportContent">
            ${reportHtml}
            </div>
            <script>
            document.getElementById('btnDownloadPDF').addEventListener('click', function() {
              window.print();
              });
              </script>
              </body>
              </html>
              `);
            printWindow.document.close();


          } catch (error) {
            console.error('Error showing report:', error);
          } finally {
            this.spinnerService.hide();
          }
        },
        error: (err) => {
          console.error('Error fetching data:', err);
          this.spinnerService.hide();
        },
      });
  }

  async printData(id: string, serviceId: number, status: string): Promise<void> {
    this.spinnerService.show();

    const params: FiltermainApplyServiceByIdDto = { id };
    //const qrUrl = `${environment.apiBaseUrl}login/PrintD?no=${id}&status=${status}`;
    const baseUrl = window.location.origin;

    const qrUrl = `${baseUrl}/report-view/${id}/${serviceId}/${status}`;

    try {
      // Generate QR with fallback
      this.qrCodeBase64 = await this.generateQRCodeWithRetry(qrUrl, 2, 3000);

    } catch {
      console.warn('QR generation failed, using fallback QR');
      const QRCode = (await import("qrcode")).default;
      this.qrCodeBase64 = await QRCode.toDataURL('Fallback QR', { width: 120 });
    }

    forkJoin({
      mischeaderdata: this.mainApplyService.getDetailById(params) as Observable<mainApplyServiceDto | mainApplyServiceDto[]>,
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          try {
            const reportDatas = Array.isArray(result.mischeaderdata)
              ? result.mischeaderdata[0] ?? ({} as mainApplyServiceDto)
              : result.mischeaderdata;

            const baseUrl = window.location.origin;
            //this.reportHeader = `${baseUrl}/assets/images/council-logo.png`;
            this.reportHeader = `${baseUrl}/assets/images/reportHeaderNew.png`;
            this.reportFooter = `${baseUrl}/assets/images/reportFooter.png`;
            this.reportFooter1 = `${baseUrl}/assets/images/reportFooter1.png`;
            this.reportFooter2 = `${baseUrl}/assets/images/reportFooter2.png`;
            this.reportHeaderIcon = `${baseUrl}/assets/images/reportHeaderIcon.png`;
            this.reportData = reportDatas;
            this.id = id;
            // Open new window for report
            const printWindow = window;
            if (!printWindow) {
              alert('Please allow pop-ups for this site.');
              return;
            }

            // ✅ Strict A4 styling
            // ✅ Strict one-page A4 style
            const isArabic = this.translate.currentLang === 'ar';

            const a4Style = `
<style>
  @page {
    size: A4 portrait;
    margin: 10mm;
  }

  html {
    overflow: auto !important;
  }

  html, body {
    margin: 0;
    padding: 0;
    width: 190mm !important;
    height: 277mm !important;
    background: #fff;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    font-family: ${isArabic ? '"DIN Next LT Arabic Regular", "Tahoma", sans-serif' : '"Arial", sans-serif'} !important;
    direction: ${isArabic ? 'rtl' : 'ltr'};
    text-align: ${isArabic ? 'right' : 'left'};
  }

  body {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    background: #f2f2f2; /* light gray background outside A4 */
  }

  .a4-page {
    box-sizing: border-box;
    width: 190mm;
    height: 277mm;
    margin: 0 auto;
    padding: 2mm 2mm 35mm 2mm; /* leave space for footer */
    background: #fff;
    border: 1px solid #ddd;
    position: relative;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    text-align: ${isArabic ? 'right' : 'left'};
  }

  .report-content {
    flex: 1 0 auto;
    text-align: inherit;
  }

  .report-footer {
    flex-shrink: 0;
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    direction: ${isArabic ? 'rtl' : 'ltr'};
  }

  td, th {
    border: 1px solid #ccc;
    padding: 5px;
    vertical-align: top;
    word-break: break-word;
    text-align: ${isArabic ? 'right' : 'left'};
  }

  img {
    max-width: 100%;
    height: auto;
  }

  .badge {
    padding: 4px 10px;
    border-radius: 5px;
    color: #fff;
    font-weight: bold;
  }

  /* ✅ Toolbar for download button */
  .toolbar {
    text-align: right;
    background: #f8f9fa;
    padding: 10px;
    border-bottom: 1px solid #ccc;
    position: sticky;
    top: 0;
  }

  .btn-download {
    background: #007bff;
    color: white;
    border: none;
    padding: 8px 15px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.3s;
  }

  .btn-download:hover {
    background: #0056b3;
  }

  @media print {
    html, body {
      overflow: hidden !important;
    }
    .toolbar { display: none !important; }
    .a4-page {
      box-shadow: none !important;
      border: none !important;
      width: 190mm !important;
      height: 277mm !important;
    }
  }
</style>`;



            let reportHtml = '';

            if (serviceId === ServicesType.TentPermission) {
              if (status === 'final') {
                reportHtml = this.buildFinalFastingTentServiceReport();
              } else {
                reportHtml = this.buildInitialFastingTentServiceReport();
              }
            }
            else if (serviceId === ServicesType.CharityEventPermit) {
              reportHtml = this.buildCharityEventPermitReport();
            }
            else if (serviceId === ServicesType.RequestForStaffAppointment) {
              this.translate
                .get(['mainApplyServiceReportsResourceName.NO_REPORT'])
                .subscribe(translations => {
                  this.toastr.error(
                    `${translations['mainApplyServiceReportsResourceName.NO_REPORT']}`,
                  );
                });
              return;
            }
            else if (serviceId === ServicesType.ReligiousInstitutionRequest) {
              this.translate
                .get(['mainApplyServiceReportsResourceName.NoPermission'])
                .subscribe(translations => {
                  this.toastr.error(
                    `${translations['mainApplyServiceReportsResourceName.NO_REPORT']}`,
                  );
                });
              return;
            }
            else if (serviceId === ServicesType.RequestAnEventAnnouncement) {
              this.translate
                .get(['mainApplyServiceReportsResourceName.NoPermission'])
                .subscribe(translations => {
                  this.toastr.error(
                    `${translations['mainApplyServiceReportsResourceName.NO_REPORT']}`,
                  );
                });
              return;
            }
            else if (serviceId === ServicesType.DonationCampaignPermitRequest) {
              reportHtml = this.buildDonationCampaignPermitRequestReport();
            }
            else if (serviceId === ServicesType.GrievanceRequest) {
              reportHtml = this.buildGrievanceRequestReport();
            }
            else if (serviceId === ServicesType.DistributionSitePermitApplication) {
              reportHtml = this.buildDistributionSitePermitApplicationReport();
            }
            else if (serviceId === ServicesType.RequestComplaint) {
              reportHtml = this.buildRequestComplaintReport();
            }
            else {
              reportHtml = `<p>No report template available for this service.</p>`;
            }

            printWindow.document.open();
            printWindow.document.write(`
            <html><head>${a4Style}</head>

            <body>
            <div class="a4-page" id="reportContent">
            ${reportHtml}
            </div>
            <script>
            document.getElementById('btnDownloadPDF').addEventListener('click', function() {
              window.print();
              });
              </script>
              </body>
              </html>
              `);
            printWindow.document.close();


          } catch (error) {
            console.error('Error showing report:', error);
          } finally {
            this.spinnerService.hide();
          }
        },
        error: (err) => {
          console.error('Error fetching data:', err);
          this.spinnerService.hide();
        },
      });
  }


  private async generateQRCodeWithRetry(url: string, retries: number, timeout: number): Promise<string> {
    // Dynamic import QRCode
    const QRCode = (await import("qrcode")).default;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const qrPromise = QRCode.toDataURL(url, {
          errorCorrectionLevel: 'M',
          width: 120,
        });

        const result = await Promise.race<string>([
          qrPromise as Promise<string>,
          new Promise<string>((_, reject) => setTimeout(() => reject('timeout'), timeout)),
        ]);

        return result;
      } catch (error) {
        console.warn(`QR generation attempt ${attempt + 1} failed:`, error);
        if (attempt === retries) throw error;
      }
    }
    throw new Error('QR generation failed after retries');
  }

  formatDate(date: Date | string | null): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0'); // months are 0-based
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  }



  private buildInitialFastingTentServiceReport(): string {
    return `
   <div id="report">
    <div style="width: 100%; text-align: center;">
      <img src="${this.reportHeader}" alt="Header" style="width: 50%; height: auto;">
    </div>

    <div style="padding: 50px 25px 10px 25px;">

     <table style="width:100%; border-collapse:collapse; table-layout:fixed;">
  <tr>
    <!-- First Row -->
    <td style="width:20%; padding:4px; vertical-align:center;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.REQUEST_DATE')}</strong> :
      ${this.formatDate(this.reportData?.applyDate)}
    </td>

    <td style="width:20%; padding:4px; vertical-align:center;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.REQUEST_NUMBER')}</strong> :
      ${this.reportData?.applyNo}
    </td>

    <td style="width:20%; padding:4px; vertical-align:center;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.PERMIT_NUMBER')}</strong> :
      ${this.reportData?.permitNumber}
    </td>

    <td style="width:20%; padding:4px; text-align:center; vertical-align:top;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.PERMIT_TYPE')}</strong>
    </td>

    <!-- QR Code spans both rows -->
    <td rowspan="2" style="width:20%; text-align:center; vertical-align:middle;">
      <img src="${this.qrCodeBase64}" alt="QR Code" style="width:100px; height:100px;">
    </td>
  </tr>

  <!-- Second Row -->
  <tr>
    <td style="width:20%; height:5%;"></td>
    <td style="width:20%; height:5%;"></td>
    <td style="width:20%; height:5%;"></td>

    <td style="width:20%; text-align:center; vertical-align:bottom;">
      <div style="margin-top:8px;">
        <span style="background:#d8b45b;color:#fff;padding:3px 10px;border-radius:5px;font-weight:bold;">
        ${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.STATUS_NAME')}
        </span>
      </div>
    </td>
  </tr>
</table>

      <div style="text-align:center;background:#ccc;border:1px solid #ccc;padding:6px;font-weight:bold;font-size:15px;margin-top:5px;">
        ${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.TABLE_HEADER')}
      </div>

      <table>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.FOUNDATION_NAME')} : </strong>
          <span style="color:black;">${this.reportData?.user?.foundationName ?? ''}</span></td>
        </tr>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.FOUNDATION_ADDRESS')} : </strong>
          <span style="color:black;">${this.reportData?.fastingTentService?.address ?? ''}</span></td>
        </tr>
      </table>

      <table>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.REQUEST_TYPE')} : </strong>
          <span style="color:black;">${this.reportData?.requestEventPermit?.lkpRequestTypeName ?? ''}</span></td>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.CONTACT_NUMBER')} : </strong>
          <span style="color:black;">${this.reportData?.user?.telNumber ?? ''}</span></td>
        </tr>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.PERMIT_END_DATE')} : </strong>
          <span style="color:black;">${this.formatDate(this.reportData?.fastingTentService?.endDate ?? null)}</span></td>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.PERMIT_START_DATE')} : </strong>
          <span style="color:black;">${this.formatDate(this.reportData?.fastingTentService?.startDate ?? null)}</span></td>
        </tr>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.TENT_SETUP_DATE')} : </strong>
          <span style="color:black;">${this.formatDate(this.reportData?.fastingTentService?.tentDate ?? null)}</span></td>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.TENT_REMOVAL_DATE')} : </strong>
          <span style="color:black;">${this.formatDate(this.reportData?.fastingTentService?.tentConstructDate ?? null)}</span></td>
        </tr>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.CONTRACTOR_NAME')} : </strong>
          <span style="color:black;">${this.formatDate(this.reportData?.fastingTentService?.consultantName ?? null)}</span></td>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.CONTRACTOR_CONTACT_NUMBER')} : </strong>
          <span style="color:black;">${this.formatDate(this.reportData?.fastingTentService?.consultantNumber ?? null)}</span></td>
        </tr>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.AREA')}: </strong>
          <span style="color:black;">${this.reportData?.fastingTentService?.regionName ?? ''}</span></td>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.STREET_NAME')} : </strong>
          <span style="color:black;">${this.reportData?.fastingTentService?.streetName ?? ''}</span></td>
        </tr>
      </table>

      <div style="border:1px solid #ccc;border-top:none;padding:6px;font-size:13px;">
        <strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.SITE_DETAILS')} : </strong>
        <span style="color:black;">${this.reportData?.fastingTentService?.notes ?? ''}</span>
      </div>

      <p style="color:red;font-weight:bold;font-size:12px;margin-top:10px;">
        *${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.NOTE')}
      </p>

      <h4>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.TERMS_AND_CONDITIONS')}</h4>

       <table>
        <tr>
          <td><li>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.CONDITION_1')}</li>
          <span style="color:black;">${this.reportData?.user?.foundationName ?? ''}</span></td>
        </tr>
        <tr style="background:#ccc;border:1px solid #ccc;>
          <td><li>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.CONDITION_2')} : </li>
          <span style="color:black;">${this.reportData?.fastingTentService?.address ?? ''}</span></td>
        </tr>
      </table>
      <ol style="font-size:13px;line-height:1.6;padding-right:20px;color:#333;">
        <li> style="background:#f5f5f5;"${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.CONDITION_1')}</li>
        <li>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.CONDITION_2')}</li>
        <li style="background:#f5f5f5;">${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.CONDITION_3')}</li>
        <li>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.CONDITION_4')}</li>
        <li style="background:#f5f5f5;">${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.CONDITION_5')}</li>
        <li>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.CONDITION_6')}</li>
        <li style="background:#f5f5f5;">${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.CONDITION_7')}</li>
        <li>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.CONDITION_8')}</li>
        <li style="background:#f5f5f5;">${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.CONDITION_9')}</li>
        <li>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.CONDITION_10')}</li>
        <li style="background:#f5f5f5;">${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.CONDITION_11')}</li>
        <li>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.CONDITION_12')}</li>
        <li style="background:#f5f5f5;">${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.CONDITION_13')}</li>
        <li>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.CONDITION_14')}</li>
      </ol>
    </div>

    <div class="report-footer">
      <img src="${this.reportFooter}" alt="Footer" style="width:100%;height:auto;">
    </div>
  </div>
  `;
  }


  private buildFinalFastingTentServiceReport(): string {
    return `
   <div id="report">
    <div style="width: 100%; text-align: center;">
      <img src="${this.reportHeader}" alt="Header" style="width: 50%; height: auto;">
    </div>

    <div style="padding: 50px 25px 10px 25px;">
 <table style="width:100%; border-collapse:collapse; table-layout:fixed;">
  <tr>
    <!-- First Row -->
    <td style="width:20%; padding:4px; vertical-align:center;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.REQUEST_DATE')}</strong> :
      ${this.formatDate(this.reportData?.applyDate)}
    </td>

    <td style="width:20%; padding:4px; vertical-align:center;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.REQUEST_NUMBER')}</strong> :
      ${this.reportData?.applyNo}
    </td>

    <td style="width:20%; padding:4px; vertical-align:center;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.PERMIT_NUMBER')}</strong> :
      ${this.reportData?.permitNumber}
    </td>

    <td style="width:20%; padding:4px; text-align:center; vertical-align:top;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.PERMIT_TYPE')}</strong>
    </td>

    <!-- QR Code spans both rows -->
    <td rowspan="2" style="width:20%; text-align:center; vertical-align:middle;">
      <img src="${this.qrCodeBase64}" alt="QR Code" style="width:100px; height:100px;">
    </td>
  </tr>

  <!-- Second Row -->
  <tr>
    <td style="width:20%; height:5%;"></td>
    <td style="width:20%; height:5%;"></td>
    <td style="width:20%; height:5%;"></td>

    <td style="width:20%; text-align:center; vertical-align:bottom;">
      <div style="margin-top:8px;">
        <span style="background:#28a745; color:#fff; padding:3px 10px; border-radius:5px; font-weight:bold; display:inline-block;">
          ${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.STATUS_NAME')}
        </span>
      </div>
    </td>
  </tr>
</table>

      <div style="text-align:center;background:#ccc;border:1px solid #ccc;padding:6px;font-weight:bold;font-size:15px;margin-top:5px;">
        ${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.TABLE_HEADER')}
      </div>

      <table>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.FOUNDATION_NAME')} : </strong>
          <span style="color:black;">${this.reportData?.user?.foundationName ?? ''}</span></td>
        </tr>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.FOUNDATION_ADDRESS')} : </strong>
          <span style="color:black;">${this.reportData?.fastingTentService?.address ?? ''}</span></td>
        </tr>
      </table>

      <table>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.REQUEST_TYPE')} : </strong>
          <span style="color:black;">${this.reportData?.requestEventPermit?.lkpRequestTypeName ?? ''}</span></td>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.CONTACT_NUMBER')} : </strong>
          <span style="color:black;">${this.reportData?.user?.telNumber ?? ''}</span></td>
        </tr>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.PERMIT_END_DATE')} : </strong>
          <span style="color:black;">${this.formatDate(this.reportData?.fastingTentService?.endDate ?? null)}</span></td>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.PERMIT_START_DATE')} : </strong>
          <span style="color:black;">${this.formatDate(this.reportData?.fastingTentService?.startDate ?? null)}</span></td>
        </tr>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.TENT_SETUP_DATE')} : </strong>
          <span style="color:black;">${this.formatDate(this.reportData?.fastingTentService?.tentDate ?? null)}</span></td>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.TENT_REMOVAL_DATE')} : </strong>
          <span style="color:black;">${this.formatDate(this.reportData?.fastingTentService?.tentConstructDate ?? null)}</span></td>
        </tr>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.CONTRACTOR_NAME')} : </strong>
          <span style="color:black;">${this.formatDate(this.reportData?.fastingTentService?.consultantName ?? null)}</span></td>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.CONTRACTOR_CONTACT_NUMBER')} : </strong>
          <span style="color:black;">${this.formatDate(this.reportData?.fastingTentService?.consultantNumber ?? null)}</span></td>
        </tr>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.AREA')}: </strong>
          <span style="color:black;">${this.reportData?.fastingTentService?.regionName ?? ''}</span></td>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.STREET_NAME')} : </strong>
          <span style="color:black;">${this.reportData?.fastingTentService?.streetName ?? ''}</span></td>
        </tr>
      </table>

      <div style="border:1px solid #ccc;border-top:none;padding:6px;font-size:13px;">
        <strong>${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.SITE_DETAILS')} : </strong>
        <span style="color:black;">${this.reportData?.fastingTentService?.notes ?? ''}</span>
      </div>

      <p style="color:red;font-weight:bold;font-size:12px;margin-top:10px;">
        *${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.NOTE')}
      </p>

      <h4>${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.TERMS_AND_CONDITIONS')}</h4>
      <ol style="font-size:13px;line-height:1.6;padding-right:20px;color:#333;">
        <li style="background:#f5f5f5;">${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.CONDITION_1')}</li>
        <li>${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.CONDITION_2')}</li>
        <li style="background:#f5f5f5;">${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.CONDITION_3')}</li>
        <li>${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.CONDITION_4')}</li>
        <li style="background:#f5f5f5;">${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.CONDITION_5')}</li>
        <li>${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.CONDITION_6')}</li>
        <li style="background:#f5f5f5;">${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.CONDITION_7')}</li>
        <li>${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.CONDITION_8')}</li>
        <li style="background:#f5f5f5;">${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.CONDITION_9')}</li>
        <li>${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.CONDITION_10')}</li>
        <li style="background:#f5f5f5;">${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.CONDITION_11')}</li>
        <li>${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.CONDITION_12')}</li>
        <li style="background:#f5f5f5;">${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.CONDITION_13')}</li>
        <li>${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.CONDITION_14')}</li>
      </ol>
    </div>

    <div class="report-footer">
      <img src="${this.reportFooter}" alt="Footer" style="width:100%;height:auto;">
    </div>
  </div>
  `;
  }


  private buildCharityEventPermitReport(): string {
    return `
   <div id="report">
    <div style="width: 100%; text-align: center;">
      <img src="${this.reportHeader}" alt="Header" style="width: 50%; height: auto;">
    </div>

    <div style="padding: 50px 25px 10px 25px;">
     <table style="width:100%; border-collapse:collapse; table-layout:fixed;">
  <tr>
    <td style="width:20%; padding:4px; vertical-align:center;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.REQUEST_DATE')}</strong> :
      ${this.formatDate(this.reportData?.applyDate)}
    </td>

    <td style="width:20%; padding:4px; vertical-align:center;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.REQUEST_NUMBER')}</strong> :
      ${this.reportData?.applyNo}
    </td>

    <td style="width:20%; padding:4px; vertical-align:center;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.PERMIT_NUMBER')}</strong> :
      ${this.reportData?.permitNumber}
    </td>

    <td style="width:20%; padding:4px; text-align:center; vertical-align:top;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.PERMIT_TYPE')}</strong>
    </td>

    <td rowspan="2" style="width:20%; text-align:center; vertical-align:middle;">
      <img src="${this.qrCodeBase64}" alt="QR Code" style="width:100px; height:100px;">
    </td>
  </tr>

  <tr>
    <td style="width:20%; height:5%;"></td>
    <td style="width:20%; height:5%;"></td>
    <td style="width:20%; height:5%;"></td>

    <td style="width:20%; text-align:center; vertical-align:bottom;">
      <div style="margin-top:8px;">
         <span style="background:#28a745;color:#fff;padding:3px 10px;border-radius:5px;font-weight:bold;">
    ${this.translate.instant('mainApplyServiceReportsResourceName.CHARITY_EVENT_PERMIT_REPORT.STATUS_NAME')}
  </span>
      </div>
    </td>
  </tr>
</table>


      <div style="text-align:center;background:#ccc;border:1px solid #ccc;padding:6px;font-weight:bold;font-size:15px;margin-top:5px;">
        ${this.translate.instant('mainApplyServiceReportsResourceName.CHARITY_EVENT_PERMIT_REPORT.TABLE_HEADER')}
      </div>

      <table>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.CHARITY_EVENT_PERMIT_REPORT.FOUNDATION_NAME')} : </strong>
          <span style="color:black;">${this.reportData?.user?.foundationName ?? ''}</span></td>
        </tr>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.CHARITY_EVENT_PERMIT_REPORT.EVENT_TITLE')} : </strong>
          <span style="color:black;">${this.reportData?.charityEventPermit?.eventName ?? ''}</span></td>
        </tr>
      </table>

      <table>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.CHARITY_EVENT_PERMIT_REPORT.EVENT_LOCATION')} : </strong>
          <span style="color:black;">${this.reportData?.charityEventPermit?.eventLocation ?? ''}</span></td>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.CHARITY_EVENT_PERMIT_REPORT.SUPERVISOR_NAME')} : </strong>
          <span style="color:black;">${this.reportData?.charityEventPermit?.supervisorName ?? ''}</span></td>
        </tr>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.CHARITY_EVENT_PERMIT_REPORT.CONTACT_NUMBER_1')} : </strong>
          <span style="color:black;">${this.formatDate(this.reportData?.charityEventPermit?.telephone1 ?? null)}</span></td>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.CHARITY_EVENT_PERMIT_REPORT.CONTACT_NUMBER_2')} : </strong>
          <span style="color:black;">${this.formatDate(this.reportData?.charityEventPermit?.telephone2 ?? null)}</span></td>
        </tr>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.CHARITY_EVENT_PERMIT_REPORT.PERMIT_END_DATE')} : </strong>
          <span style="color:black;">${this.formatDate(this.reportData?.charityEventPermit?.endDate ?? null)}</span></td>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.CHARITY_EVENT_PERMIT_REPORT.PERMIT_START_DATE')} : </strong>
          <span style="color:black;">${this.formatDate(this.reportData?.charityEventPermit?.startDate ?? null)}</span></td>
        </tr>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.CHARITY_EVENT_PERMIT_REPORT.ADVERTISEMENT')}: </strong>
          <span style="color:black;">${this.reportData?.charityEventPermit?.advertisementTypeName ?? ''}</span></td>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.CHARITY_EVENT_PERMIT_REPORT.DONATION_CHANNELS')} : </strong>
          <span style="color:black;">${this.reportData?.charityEventPermit?.donationCollectionChannels?.[0].nameAr ?? ''}</span></td>
        </tr>
      </table>

      <div style="border:1px solid #ccc;border-top:none;padding:6px;font-size:13px;">
        <strong>${this.translate.instant('mainApplyServiceReportsResourceName.CHARITY_EVENT_PERMIT_REPORT.PARTICIPATING_ENTITIES')} : </strong>
        <span style="color:black;">${this.reportData?.charityEventPermit?.eventName ?? ''}</span>
      </div>

      <h4>${this.translate.instant('mainApplyServiceReportsResourceName.CHARITY_EVENT_PERMIT_REPORT.TERMS_AND_CONDITIONS')}</h4>
      <ol style="font-size:13px;line-height:1.6;padding-right:20px;color:#333;">
        <li style="background:#f5f5f5;">${this.translate.instant('mainApplyServiceReportsResourceName.CHARITY_EVENT_PERMIT_REPORT.CONDITION_1')}</li>
        <li>${this.translate.instant('mainApplyServiceReportsResourceName.CHARITY_EVENT_PERMIT_REPORT.CONDITION_2')}</li>
      </ol>
    </div>

    <div class="report-footer">
      <img src="${this.reportFooter1}" alt="Footer" style="width:100%;height:auto;">
    </div>
  </div>
  `;
  }


  private buildRequestForStaffAppointmentReport(): string {
    return ``;
  }


  private buildReligiousInstitutionRequestReport(): string {
    return ``;
  }


  private buildRequestAnEventAnnouncementReport(): string {
    return ``;
  }


  private buildDonationCampaignPermitRequestReport(): string {
    return `
   <div id="report">
    <div style="width: 100%; text-align: center;">
      <img src="${this.reportHeader}" alt="Header" style="width: 50%; height: auto;">
    </div>

   
    <div style="padding: 50px 25px 10px 25px;">

       <table style="width:100%; border-collapse:collapse; table-layout:fixed;">
  <tr>
    <td style="width:20%; padding:4px; vertical-align:center;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.REQUEST_DATE')}</strong> :
      ${this.formatDate(this.reportData?.applyDate)}
    </td>

    <td style="width:20%; padding:4px; vertical-align:center;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.REQUEST_NUMBER')}</strong> :
      ${this.reportData?.applyNo}
    </td>

    <td style="width:20%; padding:4px; vertical-align:center;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.PERMIT_NUMBER')}</strong> :
      ${this.reportData?.permitNumber}
    </td>

    <td style="width:20%; padding:4px; text-align:center; vertical-align:top;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.PERMIT_TYPE')}</strong>
    </td>

    <td rowspan="2" style="width:20%; text-align:center; vertical-align:middle;">
      <img src="${this.qrCodeBase64}" alt="QR Code" style="width:100px; height:100px;">
    </td>
  </tr>

  <tr>
    <td style="width:20%; height:5%;"></td>
    <td style="width:20%; height:5%;"></td>
    <td style="width:20%; height:5%;"></td>

    <td style="width:20%; text-align:center; vertical-align:bottom;">
      <div style="margin-top:8px;">
       <span style="background:#28a745;color:#fff;padding:3px 10px;border-radius:5px;font-weight:bold;">
    ${this.translate.instant('mainApplyServiceReportsResourceName.DONATION_CAMPAIGN_PERMIT_REQUEST_REPORT.STATUS_NAME')}
  </span>
      </div>
    </td>
  </tr>
</table>


      <div style="text-align:center;background:#ccc;border:1px solid #ccc;padding:6px;font-weight:bold;font-size:15px;margin-top:5px;">
        ${this.translate.instant('mainApplyServiceReportsResourceName.DONATION_CAMPAIGN_PERMIT_REQUEST_REPORT.TABLE_HEADER')}
      </div>

      <table>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.DONATION_CAMPAIGN_PERMIT_REQUEST_REPORT.ENTITY_NAME')} : </strong>
          <span style="color:black;">${this.reportData?.requestEventPermit?.admin ?? ''}</span></td>
        </tr>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.DONATION_CAMPAIGN_PERMIT_REQUEST_REPORT.PROJECT_NAME')} : </strong>
          <span style="color:black;">${this.reportData?.requestEventPermit?.eventName ?? ''}</span></td>
        </tr>
      </table>

      <table>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.DONATION_CAMPAIGN_PERMIT_REQUEST_REPORT.PROJECT_TYPE')} : </strong>
          <span style="color:black;">${this.reportData?.requestEventPermit?.lkpRequestTypeName ?? ''}</span></td>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.DONATION_CAMPAIGN_PERMIT_REQUEST_REPORT.TARGET_AMOUNT')} : </strong>
          <span style="color:black;">${this.reportData?.requestEventPermit?.targetedAmount ?? ''}</span></td>
        </tr>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.DONATION_CAMPAIGN_PERMIT_REQUEST_REPORT.SUPERVISOR_NAME')} : </strong>
          <span style="color:black;">${this.formatDate(this.reportData?.requestEventPermit?.admin ?? null)}</span></td>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.DONATION_CAMPAIGN_PERMIT_REQUEST_REPORT.CONTACT_NUMBER')} : </strong>
          <span style="color:black;">${this.formatDate(this.reportData?.requestEventPermit?.adminTel ?? null)}</span></td>
        </tr>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.DONATION_CAMPAIGN_PERMIT_REQUEST_REPORT.PERMIT_END_DATE')} : </strong>
          <span style="color:black;">${this.formatDate(this.reportData?.requestEventPermit?.endDate ?? null)}</span></td>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.DONATION_CAMPAIGN_PERMIT_REQUEST_REPORT.PERMIT_START_DATE')} : </strong>
          <span style="color:black;">${this.formatDate(this.reportData?.requestEventPermit?.startDate ?? null)}</span></td>
        </tr>
      </table>

      <div style="border:1px solid #ccc;border-top:none;padding:6px;font-size:13px;">
        <strong>${this.translate.instant('mainApplyServiceReportsResourceName.DONATION_CAMPAIGN_PERMIT_REQUEST_REPORT.DONATION_CHANNELS')} : </strong>
        <span style="color:black;">${this.reportData?.requestEventPermit?.donationCollectionChannels?.[0].nameAr ?? ''}</span>
      </div>

      <div style="border:1px solid #ccc;border-top:none;padding:6px;font-size:13px;">
        <strong>${this.translate.instant('mainApplyServiceReportsResourceName.DONATION_CAMPAIGN_PERMIT_REQUEST_REPORT.BENEFICIARY_DATA')} : </strong>
        <span style="color:black;">${this.reportData?.requestEventPermit?.beneficiaryIdNumber ?? ''}</span>
      </div>

      <div style="border:1px solid #ccc;border-top:none;padding:6px;font-size:13px;">
        <strong>${this.translate.instant('mainApplyServiceReportsResourceName.DONATION_CAMPAIGN_PERMIT_REQUEST_REPORT.PARTICIPATING_ENTITIES')} : </strong>
        <span style="color:black;">${this.reportData?.requestEventPermit?.delegateName ?? ''}</span>
      </div>

      <h4>${this.translate.instant('mainApplyServiceReportsResourceName.DONATION_CAMPAIGN_PERMIT_REQUEST_REPORT.TERMS_AND_CONDITIONS')}</h4>
      <ol style="font-size:13px;line-height:1.6;padding-right:20px;color:#333;">
        <li style="background:#f5f5f5;">${this.translate.instant('mainApplyServiceReportsResourceName.DONATION_CAMPAIGN_PERMIT_REQUEST_REPORT.CONDITION_1')}</li>
        <li>${this.translate.instant('mainApplyServiceReportsResourceName.DONATION_CAMPAIGN_PERMIT_REQUEST_REPORT.CONDITION_2')}</li>
      </ol>
    </div>

    <div class="report-footer">
      <img src="${this.reportFooter1}" alt="Footer" style="width:100%;height:auto;">
    </div>
  </div>
  `;
  }


  private buildGrievanceRequestReport(): string {
    return `
   <div id="report">
    <div style="width: 100%; text-align: center;">
      <img src="${this.reportHeader}" alt="Header" style="width: 50%; height: auto;">
    </div>

    <div style="padding: 50px 25px 10px 25px;">
         <table style="width:100%; border-collapse:collapse; table-layout:fixed;">
  <tr>
    <td style="width:20%; padding:4px; vertical-align:center;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.REQUEST_DATE')}</strong> :
      ${this.formatDate(this.reportData?.applyDate)}
    </td>

    <td style="width:20%; padding:4px; vertical-align:center;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.REQUEST_NUMBER')}</strong> :
      ${this.reportData?.applyNo}
    </td>

    <td style="width:20%; padding:4px; vertical-align:center;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.PERMIT_NUMBER')}</strong> :
      ${this.reportData?.permitNumber}
    </td>

    <td style="width:20%; padding:4px; text-align:center; vertical-align:top;"></td>

    <td rowspan="2" style="width:20%; text-align:center; vertical-align:middle;">
      <img src="${this.qrCodeBase64}" alt="QR Code" style="width:100px; height:100px;">
    </td>
  </tr>

  <tr>
    <td style="width:20%; height:5%;"></td>
    <td style="width:20%; height:5%;"></td>
    <td style="width:20%; height:5%;"></td>
    <td style="width:20%; height:5%;"></td>
  </tr>
</table>

      <div style="text-align:center;background:#ccc;border:1px solid #ccc;padding:6px;font-weight:bold;font-size:15px;margin-top:5px;">
        ${this.translate.instant('mainApplyServiceReportsResourceName.GRIEVANCE_REQUEST_REPORT.TABLE_HEADER')}
      </div>

      <table>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.GRIEVANCE_REQUEST_REPORT.ENTITY_NAME')} : </strong>
          <span style="color:black;">${this.reportData?.user?.foundationName ?? ''}</span></td>
        </tr>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.GRIEVANCE_REQUEST_REPORT.PREVIOUS_REQUEST_DETAILS')} : </strong>
          <span style="color:black;">${this.reportData?.fastingTentService?.address ?? ''}</span></td>
        </tr>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.GRIEVANCE_REQUEST_REPORT.APPEAL_DETAILS')} : </strong>
          <span style="color:black;">${this.reportData?.fastingTentService?.address ?? ''}</span></td>
        </tr>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.GRIEVANCE_REQUEST_REPORT.FINAL_NOTES')} : </strong>
          <span style="color:black;">${this.reportData?.fastingTentService?.address ?? ''}</span></td>
        </tr>
      </table>

      <h4>${this.translate.instant('mainApplyServiceReportsResourceName.GRIEVANCE_REQUEST_REPORT.TERMS_AND_CONDITIONS')}</h4>
      <ol style="font-size:13px;line-height:1.6;padding-right:20px;color:#333;">
        <li style="background:#f5f5f5;">${this.translate.instant('mainApplyServiceReportsResourceName.GRIEVANCE_REQUEST_REPORT.CONDITION_1')}</li>
      </ol>
    </div>

    <div class="report-footer">
      <img src="${this.reportFooter1}" alt="Footer" style="width:100%;height:auto;">
    </div>
  </div>
  `;
  }


  private buildDistributionSitePermitApplicationReport(): string {
    return `
   <div id="report">
    <div style="width: 100%; text-align: center;">
      <img src="${this.reportHeader}" alt="Header" style="width: 50%; height: auto;">
    </div>

    <div style="padding: 50px 25px 10px 25px;">
          <table style="width:100%; border-collapse:collapse; table-layout:fixed;">
  <tr>
    <td style="width:20%; padding:4px; vertical-align:center;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.REQUEST_DATE')}</strong> :
      ${this.formatDate(this.reportData?.applyDate)}
    </td>

    <td style="width:20%; padding:4px; vertical-align:center;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.REQUEST_NUMBER')}</strong> :
      ${this.reportData?.applyNo}
    </td>

    <td style="width:20%; padding:4px; vertical-align:center;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.PERMIT_NUMBER')}</strong> :
      ${this.reportData?.permitNumber}
    </td>

    <td style="width:20%; padding:4px; text-align:center; vertical-align:top;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.FINAL_FASTING_TENT_SERVICE_REPORT.PERMIT_TYPE')}</strong>
    </td>

    <td rowspan="2" style="width:20%; text-align:center; vertical-align:middle;">
      <img src="${this.qrCodeBase64}" alt="QR Code" style="width:100px; height:100px;">
    </td>
  </tr>

  <tr>
    <td style="width:20%; height:5%;"></td>
    <td style="width:20%; height:5%;"></td>
    <td style="width:20%; height:5%;"></td>

    <td style="width:20%; text-align:center; vertical-align:bottom;">
      <div style="margin-top:8px;">
         <span style="background:#28a745;color:#fff;padding:3px 10px;border-radius:5px;font-weight:bold;">
    ${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.STATUS_NAME')}
  </span>
      </div>
    </td>
  </tr>
</table>

      <div style="text-align:center;background:#ccc;border:1px solid #ccc;padding:6px;font-weight:bold;font-size:15px;margin-top:5px;">
        ${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.TABLE_HEADER')}
      </div>

      <table>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.ENTITY_NAME')} : </strong>
          <span style="color:black;">${this.reportData?.entityName ?? ''}</span></td>
        </tr>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.ADDRESS')} : </strong>
          <span style="color:black;">${this.reportData?.fastingTentService?.address ?? ''}</span></td>
        </tr>
      </table>

      <table>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.REQUEST_TYPE')} : </strong>
          <span style="color:black;">${this.reportData?.fastingTentService?.locationType ?? ''}</span></td>
           <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.DISTRIBUTION_SITE')} : </strong>
          <span style="color:black;">${this.reportData?.fastingTentService?.distributionSiteCoordinators ?? ''}</span></td>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.CONTACT_NUMBER')} : </strong>
          <span style="color:black;">${this.reportData?.user?.telNumber ?? ''}</span></td>
        </tr>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.PERMIT_END_DATE')} : </strong>
          <span style="color:black;">${this.formatDate(this.reportData?.fastingTentService?.endDate ?? null)}</span></td>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.PERMIT_START_DATE')} : </strong>
          <span style="color:black;">${this.formatDate(this.reportData?.fastingTentService?.startDate ?? null)}</span></td>
        </tr>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.AREA')}: </strong>
          <span style="color:black;">${this.reportData?.fastingTentService?.regionName ?? ''}</span></td>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.STREET_NAME')} : </strong>
          <span style="color:black;">${this.reportData?.fastingTentService?.streetName ?? ''}</span></td>
        </tr>
      </table>

      <div style="border:1px solid #ccc;border-top:none;padding:6px;font-size:13px;">
        <strong>${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.SITE_DETAILS')} : </strong>
        <span style="color:black;">${this.reportData?.fastingTentService?.notes ?? ''}</span>
      </div>

      <p style="color:red;font-weight:bold;font-size:12px;margin-top:10px;">
        *${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.NOTE')}
      </p>

      <h4>${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.TERMS_CONDITIONS')}</h4>
      <ol style="font-size:13px;line-height:1.6;padding-right:20px;color:#333;">
        <li style="background:#f5f5f5;">${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.CONDITION_1')}</li>
        <li>${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.CONDITION_2')}</li>
        <li style="background:#f5f5f5;">${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.CONDITION_3')}</li>
        <li>${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.CONDITION_4')}</li>
        <li style="background:#f5f5f5;">${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.CONDITION_5')}</li>
        <li>${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.CONDITION_6')}</li>
        <li style="background:#f5f5f5;">${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.CONDITION_7')}</li>
        <li>${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.CONDITION_8')}</li>
        <li style="background:#f5f5f5;">${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.CONDITION_9')}</li>
        <li>${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.CONDITION_10')}</li>
        <li style="background:#f5f5f5;">${this.translate.instant('mainApplyServiceReportsResourceName.DISTRIBUTION_SITE_PERMIT_APPLICATION_REPORT.CONDITION_11')}</li>
      </ol>
    </div>

    <div class="report-footer">
      <img src="${this.reportFooter2}" alt="Footer" style="width:100%;height:auto;">
    </div>
  </div>
  `;
  }


  private buildRequestComplaintReport(): string {
    return `
   <div id="report">
    <div style="width: 100%; text-align: center;">
      <img src="${this.reportHeader}" alt="Header" style="width: 50%; height: auto;">
    </div>

    <div style="padding: 50px 25px 10px 25px;">
          <table style="width:100%; border-collapse:collapse; table-layout:fixed;">
  <tr>
    <td style="width:20%; padding:4px; vertical-align:center;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.REQUEST_DATE')}</strong> :
      ${this.formatDate(this.reportData?.applyDate)}
    </td>

    <td style="width:20%; padding:4px; vertical-align:center;">
      <strong>${this.translate.instant('mainApplyServiceReportsResourceName.INITIAL_FASTING_TENT_SERVICE_REPORT.REQUEST_NUMBER')}</strong> :
      ${this.reportData?.applyNo}
    </td>

    <td style="width:20%; padding:4px; text-align:center; vertical-align:top;"></td>
    <td style="width:20%; padding:4px; text-align:center; vertical-align:top;"></td>

    <td rowspan="2" style="width:20%; text-align:center; vertical-align:middle;">
      <img src="${this.qrCodeBase64}" alt="QR Code" style="width:100px; height:100px;">
    </td>
  </tr>

  <tr>
    <td style="width:20%; height:5%;"></td>
    <td style="width:20%; height:5%;"></td>
    <td style="width:20%; height:5%;"></td>
    <td style="width:20%; height:5%;"></td>
  </tr>
</table>

      <div style="text-align:center;background:#f5f5f5;border:1px solid #ccc;padding:6px;font-weight:bold;font-size:15px;margin-top:5px;">
        ${this.translate.instant('mainApplyServiceReportsResourceName.REQUEST_COMPLAINT_REPORT.TABLE_HEADER')}
      </div>

      <table>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.REQUEST_COMPLAINT_REPORT.APPLICANT_NAME')} : </strong>
          <span style="color:black;">${this.reportData?.requestComplaint?.applicantName ?? ''}</span></td>
        </tr>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.REQUEST_COMPLAINT_REPORT.REQUEST_TYPE')} : </strong>
          <span style="color:black;">${this.reportData?.requestComplaint?.complaintTypeName ?? ''}</span></td>
        </tr>
      </table>

      <table>
        <tr>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.REQUEST_COMPLAINT_REPORT.CONTACT_NUMBER')} : </strong>
          <span style="color:black;">${this.reportData?.requestComplaint?.contactNumber ?? ''}</span></td>
          <td><strong>${this.translate.instant('mainApplyServiceReportsResourceName.REQUEST_COMPLAINT_REPORT.EMAIL')} : </strong>
          <span style="color:black;">${this.reportData?.requestComplaint?.email ?? ''}</span></td>
        </tr>
      </table>

      <div style="border:1px solid #ccc;border-top:none;padding:6px;font-size:13px;">
        <strong>${this.translate.instant('mainApplyServiceReportsResourceName.REQUEST_COMPLAINT_REPORT.REQUEST_DETAILS')} : </strong>
        <span style="color:black;">${this.reportData?.requestComplaint?.notes ?? ''}</span>
      </div>

      <h4>${this.translate.instant('mainApplyServiceReportsResourceName.REQUEST_COMPLAINT_REPORT.TERMS_AND_CONDITIONS')}</h4>
      <ol style="font-size:13px;line-height:1.6;padding-right:20px;color:#333;">
        <li style="background:#f5f5f5;">${this.translate.instant('mainApplyServiceReportsResourceName.REQUEST_COMPLAINT_REPORT.CONDITION_1')}</li>
      </ol>
    </div>

    <div class="report-footer">
      <img src="${this.reportFooter1}" alt="Footer" style="width:100%;height:auto;">
    </div>
  </div>
  `;
  }
} 
