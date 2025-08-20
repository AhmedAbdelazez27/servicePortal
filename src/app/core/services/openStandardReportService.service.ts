import * as XLSX from 'xlsx';
import { Injectable } from '@angular/core';
import { reportPrintConfig } from '../dtos/FndLookUpValuesdtos/FndLookUpValues.dto';

@Injectable({ providedIn: 'root' })
export class openStandardReportService {

  openStandardReportExcel(config: reportPrintConfig): void {
    const {
      reportTitle,
      fields = [],
      columns = [],
      data = [],
      totalLabel,
      totalKeys = [],
      fileName
    } = config;

    const filterRow = fields.map(field => {
      const value = field.value ?? '-';
      return `${field.label}: ${value}`;
    });

    const tableHeader = columns.map(col => col.title || col.label);

    const tableRows = data.map((row: any) => {
      return columns.map(col => {
        const value = col.key ? row[col.key] ?? '' : '';
        return value !== null && value !== undefined ? value : '';
      });
    });

    if (totalKeys.length > 0) {
      const totalRow: any[] = [];

      columns.forEach((col, colIndex) => {
        if (colIndex === 0) {
          totalRow.push(totalLabel);
        } else {
          const matchingKeys = totalKeys.filter(k => k === col.key);
          if (matchingKeys.length > 0) {
            const totals = matchingKeys.map(k => {
              const sum = data.reduce((acc, row) => {
                const val = row[k];
                const cleaned = parseFloat((val || '0').toString().replace(/,/g, ''));
                return acc + (isNaN(cleaned) ? 0 : cleaned);
              }, 0);
              return `${sum.toFixed(2)}`;
            });
            totalRow.push(totals.join(' / '));
          } else {
            totalRow.push('');
          }
        }
      });

      tableRows.push(totalRow);
    }


    const wsData: any[][] = [
      [reportTitle],
      [],
      filterRow,
      [],
      tableHeader,
      ...tableRows
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: tableHeader.length - 1 } }
    ];

    ws['!cols'] = tableHeader.map((_, colIdx) => {
      const maxLen = wsData.map(row => row[colIdx]?.toString().length || 0).reduce((a, b) => Math.max(a, b), 10);
      return { wch: maxLen + 2 };
    });

    const range = XLSX.utils.decode_range(ws['!ref']!);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellAddress]) continue;
        if (!ws[cellAddress].s) ws[cellAddress].s = {};
        ws[cellAddress].s.alignment = { horizontal: 'center', vertical: 'center' };
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');

    const safeFileName = fileName || `${reportTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, safeFileName);
  }


  openStandardReportPDF(config: reportPrintConfig): void {
    const {
      title,
      fields = [],
      columns = [],
      data = [],
      totalLabel,
      totalKeys = []
    } = config;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const fieldHtml = fields.map(field => `
    <div class="col-6">
      <label class="bold black">${field.label}</label>
      <p>${field.value || ''}</p>
    </div>
  `).join('');

    const tableHeaderHtml = columns.map(col => `<th>${col.label}</th>`).join('');

    const tableRowsHtml = data.map((row, i) => `
    <tr>
      <td>${i + 1}</td>
      ${columns.map(col => `<td>${col.key ? row[col.key] ?? '' : ''}</td>`).join('')}
    </tr>
  `).join('');

    const totals: Record<string, string> = {};
    for (const key of totalKeys) {
      totals[key] = data
        .reduce((sum, row) => {
          const val = row[key];
          const cleaned = parseFloat((val || '0').toString().replace(/,/g, ''));
          return sum + (isNaN(cleaned) ? 0 : cleaned);
        }, 0)
        .toFixed(2);
    }


    const totalIndexes = totalKeys.map(key => columns.findIndex(col => col.key === key) + 1);

    let totalRowCells = '';
    for (let i = 0; i <= columns.length; i++) {
      if (i === 0) {
        totalRowCells += `<td><strong>${totalLabel}</strong></td>`;
      } else {
        const index = totalIndexes.indexOf(i);
        if (index !== -1) {
          const key = totalKeys[index];
          totalRowCells += `<td><strong>${totals[key]}</strong></td>`;
        } else {
          totalRowCells += `<td></td>`;
        }
      }
    }

    printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link href="/assets/css/bootstrap.min.css" rel="stylesheet" />
      <link href="/styles.css" rel="stylesheet" />
      <title>${title}</title>
      <style>
        body { font-family: Cairo, Arial, sans-serif; background: #f7f7f7; padding: 2rem; }
        .bold { font-weight: bold; }
        .gold { color: #bfa14a; font-size: 32px; }
        .filter-label { font-weight: bold; color: #222; min-width: 120px; display: inline-block; }
        .filter-value { text-align: center; color: #444; display: inline-block; width: 100%; }
        .col-6 { padding: 10px; box-sizing: border-box; flex: 0 0 50%; max-width: 50%; }
        .row { display: flex; flex-wrap: wrap; }
        .details-table-container {
          background: #fff;
          padding: 1rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
        }
        .new-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        .new-table th, .new-table td {
          border: none; border-bottom: 1px solid #dee2e6;
          padding: 0.75rem;
          text-align: center;
        }
        .new-table thead th {
          background: #e0e0e0;
          color: #222;
          font-weight: bold;
          border: none;
          padding: 1rem 0.5rem;
          font-size: 1rem;
        }
        .new-table tfoot td {
          font-weight: bold;
          background: #fff;
        }
        .new-table thead th:first-child { border-top-left-radius: 15px; }
        .new-table thead th:last-child { border-top-right-radius: 15px; }
      </style>
    </head>
    <body>
      <div class="report-header mb-5">
        <h2 class="gold bold title-32 mb-0">${title}</h2>
        <div class="d-flex align-items-center gap-3">
          <img src="/assets/img/logo.png" width="100px" />
          <img src="/assets/img/logo.png" width="100px" />
        </div>
      </div>
      <div class="container-fluid">
        <div class="border-bottom mb-4">
          <div class="row">${fieldHtml}</div>
        </div>
        <div class="report-section">
          <table class="new-table">
            <thead>
              <tr>
                <th>#</th>
                ${tableHeaderHtml}
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
            <tfoot>
              <tr>
                ${totalRowCells}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <script>
        window.onload = function () {
          window.print();
          window.close();
        };
      </script>
    </body>
    </html>
  `);

    printWindow.document.close();
    printWindow.focus();
  }
}
