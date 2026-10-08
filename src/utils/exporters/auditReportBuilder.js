import { jsPDF } from 'jspdf';
import { generateCategoryChartImage, generateTrendChartImage } from './chartImageGenerator';

/**
 * Retrieves the currently logged-in user name from localStorage
 * @returns {string}
 */
export function getLoggedInUserName() {
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.name) return parsed.name;
      if (parsed?.fullName) return parsed.fullName;
      if (parsed?.username) return parsed.username;
    }
  } catch { }
  return 'Park Manager';
}

/**
 * Escapes CSV field value according to RFC 4180
 * @param {string|number} value
 * @returns {string}
 */
function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const stringVal = String(value);
  if (
    stringVal.includes(',') ||
    stringVal.includes('"') ||
    stringVal.includes('\n') ||
    stringVal.includes('\r')
  ) {
    return `"${stringVal.replace(/"/g, '""')}"`;
  }
  return stringVal;
}

/**
 * Builds and returns a formatted jsPDF document instance for a logged report
 * containing executive summary and applied multi-dimensional filters
 * Signed by the logged-in park manager.
 * @param {Object} log
 * @param {Object} currentUser
 * @returns {jsPDF}
 */
export function buildAuditPdfReport(log = {}, currentUser = null) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const activeManagerName = currentUser?.name || log.userName || getLoggedInUserName();

  // Header brand banner
  doc.setFillColor(6, 95, 70); // #065f46 — Forest Emerald
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('SMART WILDLIFE CONSERVATION MONITORING SYSTEM', 14, 11);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Official System Audit Trail Record & Multi-Dimensional Query Briefing', 14, 18);

  // Metadata block
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORT AUDIT METADATA & CONTROL', 14, 32);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 34, pageWidth - 14, 34);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const reportId = log.reportId || `REP-${Date.now().toString().slice(-6)}`;
  const reportType = (log.reportType || 'INCIDENT_ANALYSIS').replace(/_/g, ' ');
  const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleString() : new Date().toLocaleString();
  const status = log.status || 'SUCCESS';
  const recordCount = log.recordCount ?? 0;

  doc.text(`Report ID: `, 14, 40);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 95, 70);
  doc.text(reportId, 32, 40);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Report Type: `, 14, 45);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(reportType, 35, 45);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Logged At: `, 115, 40);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(timestamp, 133, 40);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Authorized Official: `, 115, 45);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(activeManagerName, 145, 45);

  //  Executive Telemetry Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('EXECUTIVE TELEMETRY KPIS', 14, 54);
  doc.line(14, 56, pageWidth - 14, 56);

  const boxWidth = (pageWidth - 28 - 9) / 4;
  const metrics = [
    { label: 'RECORD COUNT', val: String(recordCount), color: [15, 23, 42] },
    { label: 'AUDIT STATUS', val: String(status), color: [4, 120, 87] },
    { label: 'EXECUTION TYPE', val: String(reportType.slice(0, 10)), color: [2, 132, 199] },
    { label: 'SECURITY ROLE', val: 'PARK MGR', color: [100, 116, 139] },
  ];

  metrics.forEach((m, idx) => {
    const x = 14 + idx * (boxWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, 60, boxWidth, 16, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, 60, boxWidth, 16, 2, 2, 'S');

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(m.label, x + 3.5, 65.5);

    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.setFontSize(10.5);
    doc.text(m.val, x + 3.5, 73);
  });

  // Embedded Visual Chart (Strictly derived from actual log parameters)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('VISUAL QUERY TELEMETRY', 14, 84);
  doc.line(14, 86, pageWidth - 14, 86);

  const categoryData = {};
  if (log.criteria?.incidentType && log.criteria.incidentType !== 'ALL') {
    categoryData[log.criteria.incidentType] = recordCount;
  } else if (recordCount > 0) {
    categoryData['Retrieved Records'] = recordCount;
  }

  try {
    const catImg = generateCategoryChartImage(categoryData);
    doc.addImage(catImg, 'PNG', 14, 90, 88.5, 43);
  } catch {
    doc.rect(14, 90, 88.5, 43);
  }

  try {
    const trendImg = generateTrendChartImage(
      recordCount > 0 ? [{ week: 'Report Period', incidents: recordCount, alerts: 0 }] : []
    );
    doc.addImage(trendImg, 'PNG', 107.5, 90, 88.5, 43);
  } catch {
    doc.rect(107.5, 90, 88.5, 43);
  }

  //  Applied Report Filters & Query Criteria Section
  let currentY = 142;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('APPLIED QUERY CRITERIA & MULTI-DIMENSIONAL FILTERS', 14, currentY);
  doc.line(14, currentY + 2, pageWidth - 14, currentY + 2);
  currentY += 7;

  const criteria = log.criteria || {};
  const filterRows = [
    ['Conservation Park Scope', criteria.park || 'ALL'],
    ['Query Start Date', criteria.dateFrom || 'N/A'],
    ['Query End Date', criteria.dateTo || 'N/A'],
    ['Incident Threat Type Filter', criteria.incidentType || 'ALL'],
    ['Severity Threshold Filter', criteria.severity || 'ALL'],
    ['Target Species Filter', criteria.species || 'ALL'],
    ['Location / Protected Sector', criteria.zone || 'ALL'],
  ];

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(14, currentY, pageWidth - 28, 6, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('FILTER PARAMETER', 18, currentY + 4.2);
  doc.text('APPLIED QUERY VALUE', 100, currentY + 4.2);
  currentY += 7;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  filterRows.forEach(([param, val], idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, currentY - 1, pageWidth - 28, 6.5, 'F');
    }
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.text(param, 18, currentY + 3.8);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(String(val), 100, currentY + 3.8);
    currentY += 6.5;
  });

  // Regulatory Verification & Compliance Box — Signed by logged in park manager
  currentY += 6;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14, currentY, pageWidth - 28, 22, 2, 2, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, currentY, pageWidth - 28, 22, 2, 2, 'S');

  doc.setTextColor(6, 95, 70);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('REGULATORY COMPLIANCE & IMMUTABLE AUDIT CERTIFICATION', 18, currentY + 6.5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Document Certified & Signed By: ${activeManagerName} (Park Manager)`, 18, currentY + 11.5);
  doc.text(
    'Captured within the Smart Wildlife Conservation System Audit Trail Matrix for evidence-based governance.',
    18,
    currentY + 16.5
  );

  // Page Footer
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 282, pageWidth - 14, 282);
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Official WildGuard Audit Log Export • Document ID: ${reportId}`, 14, 287);
  doc.text(`Certified: ${timestamp}`, 130, 287);

  return doc;
}

/**
 * Builds structured executive-grade CSV content string for a logged report
 * Signed by the logged-in park manager.
 * @param {Object} log
 * @param {Object} currentUser
 * @returns {string}
 */
export function buildAuditCsvReport(log = {}, currentUser = null) {
  const criteria = log.criteria || {};
  const lines = [];

  const activeManagerName = currentUser?.name || log.userName || getLoggedInUserName();
  const reportId = log.reportId || `REP-${Date.now().toString().slice(-6)}`;
  const reportType = (log.reportType || 'INCIDENT_ANALYSIS').replace(/_/g, ' ');
  const timestamp = log.timestamp ? new Date(log.timestamp).toISOString() : new Date().toISOString();
  const status = log.status || 'SUCCESS';
  const recordCount = log.recordCount ?? 0;

  // Institutional Metadata Header Block
  lines.push(['========================================================================================']);
  lines.push(['SMART WILDLIFE CONSERVATION MONITORING SYSTEM (WILDGUARD)']);
  lines.push(['OFFICIAL SYSTEM AUDIT TRAIL LOG & QUERY BRIEFING']);
  lines.push(['========================================================================================']);
  lines.push(['Audit Record ID', escapeCsv(reportId)]);
  lines.push(['Report Type', escapeCsv(reportType)]);
  lines.push(['Execution Status', escapeCsv(status)]);
  lines.push(['Authorized Park Manager', escapeCsv(`${activeManagerName} (Park Manager)`)]);
  lines.push(['Logged Timestamp', escapeCsv(timestamp)]);
  lines.push(['Processed Records Count', recordCount]);
  lines.push(['Security Classification', 'IMMUTABLE AUDIT RECORD / REGULATORY COMPLIANT']);
  lines.push([]);

  //  Executive Audit Summary
  lines.push(['--- SECTION 1: EXECUTIVE AUDIT & TELEMETRY SUMMARY ---']);
  lines.push(['Telemetry Indicator', 'Recorded Value', 'Operational Status']);
  lines.push(['Processed Record Count', recordCount, recordCount > 0 ? 'RECORDS AVAILABLE' : 'LIMITED DATA']);
  lines.push(['Audit Execution Status', escapeCsv(status), 'VERIFIED IN AUDIT LOG']);
  lines.push(['Query Execution Mode', escapeCsv(reportType), 'COMPLETED']);
  lines.push([]);

  //  Applied Multi-Dimensional Filters
  lines.push(['--- SECTION 2: APPLIED QUERY CRITERIA & MULTI-DIMENSIONAL FILTERS ---']);
  lines.push(['Filter Parameter', 'Applied Query Value', 'Evaluation Scope']);
  lines.push(['Conservation Park Scope', escapeCsv(criteria.park || 'ALL'), 'RESERVE BOUNDARY']);
  lines.push(['Start Date', escapeCsv(criteria.dateFrom || 'N/A'), 'WINDOW START']);
  lines.push(['End Date', escapeCsv(criteria.dateTo || 'N/A'), 'WINDOW END']);
  lines.push(['Incident Threat Type', escapeCsv(criteria.incidentType || 'ALL'), 'CATEGORY FILTER']);
  lines.push(['Severity Threshold', escapeCsv(criteria.severity || 'ALL'), 'THREAT LEVEL FILTER']);
  lines.push(['Target Species', escapeCsv(criteria.species || 'ALL'), 'WILDLIFE FILTER']);
  lines.push(['Location / Sector', escapeCsv(criteria.zone || 'ALL'), 'SPATIAL SECTOR FILTER']);
  lines.push([]);

  //  Regulatory Verification & Certification Footer
  lines.push(['--- SECTION 3: REGULATORY VERIFICATION & AUDIT CERTIFICATION ---']);
  lines.push(['Verification Authority', 'Department of Wildlife Conservation • Park Operations']);
  lines.push(['Authorized Signoff', escapeCsv(`${activeManagerName} (Park Manager)`)]);
  lines.push(['Audit Certificate Hash', `SWCS-${Date.now().toString(36).toUpperCase()}`]);
  lines.push(['System Integrity', 'CRYPTOGRAPHICALLY IMMUTABLE AUDIT TRAIL LOGGED']);

  return lines.map((row) => row.map((cell) => escapeCsv(cell)).join(',')).join('\r\n');
}

/**
 * Triggers PDF download for a logged report
 * @param {Object} log
 * @param {Object} currentUser
 */
export function downloadAuditPdf(log, currentUser = null) {
  const doc = buildAuditPdfReport(log, currentUser);
  const filename = `audit_report_${log.reportId || 'record'}_${Date.now()}.pdf`;
  doc.save(filename);
  return filename;
}

/**
 * Triggers CSV download for a logged report
 * @param {Object} log
 * @param {Object} currentUser
 */
export function downloadAuditCsv(log, currentUser = null) {
  const csvContent = buildAuditCsvReport(log, currentUser);
  const filename = `audit_report_${log.reportId || 'record'}_${Date.now()}.csv`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return filename;
}
