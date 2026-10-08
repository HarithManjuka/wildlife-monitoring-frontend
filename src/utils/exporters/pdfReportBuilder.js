import { jsPDF } from 'jspdf';
import {
  generateTrendChartImage,
  generateCategoryChartImage,
  generateHotspotChartImage,
  generatePatrolGaugeImage,
} from './chartImageGenerator';

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
 * Builds and returns a formatted multi-page jsPDF document instance with visual charts
 * Exports exactly what was fetched and computed on the dashboard, signed by the active park manager.
 * @param {Object} report
 * @param {Object} currentUser
 * @returns {jsPDF}
 */
export function buildPdfReport(report = {}, currentUser = null) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const activeManagerName = currentUser?.name || currentUser?.fullName || report?.userName || getLoggedInUserName();


  // PAGE 1: EXECUTIVE INTELLIGENCE & CHARTS


  // Header brand banner
  doc.setFillColor(6, 95, 70); // #065f46 — Forest Emerald
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('SMART WILDLIFE CONSERVATION MONITORING SYSTEM', 14, 11);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Official Conservation Analytics & Operational Intelligence Report • Executive Briefing', 14, 18);

  //  Report Metadata Block
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORT METADATA & QUERY SCOPE', 14, 32);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 34, pageWidth - 14, 34);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const reportId = report.reportId || `REP-${Date.now().toString().slice(-6)}`;
  const reportType = (report.reportType || 'INCIDENT_ANALYSIS').replace(/_/g, ' ');
  const generatedDate = new Date().toLocaleString();
  const totalIncidentsCount = report.totalIncidents ?? (report.recentIncidents || []).length;
  const status = report.status || (totalIncidentsCount > 0 ? 'SUFFICIENT DATA / VERIFIED' : 'LIMITED DATA');

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
  doc.text(`Authorized Official: `, 14, 50);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 95, 70);
  doc.text(`${activeManagerName} (Park Manager)`, 41, 50);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Generated At: `, 115, 40);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(generatedDate, 137, 40);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Evaluation Status: `, 115, 45);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 95, 70);
  doc.text(status, 142, 45);

  if (report.criteria) {
    const scopeStr = `${report.criteria.park || 'ALL'} • ${report.criteria.dateFrom || 'N/A'} to ${report.criteria.dateTo || 'N/A'} • ${report.criteria.incidentType || 'ALL'}`;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Query Scope: `, 115, 50);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(scopeStr.slice(0, 42), 136, 50);
  }

  //  Executive Telemetry KPI Cards (Exact fetched metrics)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('EXECUTIVE TELEMETRY KPIS', 14, 58);
  doc.line(14, 60, pageWidth - 14, 60);

  const boxWidth = (pageWidth - 28 - 9) / 4;
  const coverageScore = report.patrolCoverage?.coverageScore ?? 0;
  const coverageGap = report.patrolCoverage?.coverageGap ?? (100 - coverageScore);

  const metrics = [
    { label: 'TOTAL INCIDENTS', val: String(totalIncidentsCount), color: [15, 23, 42] },
    { label: 'PATROL COVERAGE', val: `${coverageScore}%`, color: [4, 120, 87] },
    { label: 'COVERAGE GAP', val: `${coverageGap}%`, color: [217, 119, 6] },
    { label: 'ACTIVE HOTSPOTS', val: String((report.hotspots || []).length), color: [225, 29, 72] },
  ];

  metrics.forEach((m, idx) => {
    const x = 14 + idx * (boxWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, 64, boxWidth, 15, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, 64, boxWidth, 15, 2, 2, 'S');

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(m.label, x + 3.5, 69);

    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.setFontSize(10.5);
    doc.text(m.val, x + 3.5, 76);
  });

  //  Embedded Visual Charts Section (Side-by-Side — uses exact dashboard data)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('VISUAL ANALYTICS & THREAT TELEMETRY', 14, 86);
  doc.line(14, 88, pageWidth - 14, 88);

  const chartW = (pageWidth - 28 - 5) / 2; // ~88.5mm
  const chartH = 43; // 43mm

  try {
    // Generate and render Visual Chart 1: Exact Trend Series Chart
    const trendImg = generateTrendChartImage(report.trend || []);
    doc.addImage(trendImg, 'PNG', 14, 90, chartW, chartH);
  } catch {
    doc.rect(14, 90, chartW, chartH);
  }

  try {
    // Generate and render Visual Chart 2: Exact Threat Categories Chart
    const catImg = generateCategoryChartImage(report.byType || {});
    doc.addImage(catImg, 'PNG', 14 + chartW + 5, 90, chartW, chartH);
  } catch {
    doc.rect(14 + chartW + 5, 90, chartW, chartH);
  }

  //  Incidents by Category Table (Exact breakdown)
  let currentY = 140;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('INCIDENT CATEGORY CLASSIFICATION BREAKDOWN', 14, currentY);
  doc.line(14, currentY + 2, pageWidth - 14, currentY + 2);
  currentY += 7;

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(14, currentY, pageWidth - 28, 6, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('THREAT / INCIDENT CATEGORY', 18, currentY + 4.2);
  doc.text('RECORDED COUNT', 110, currentY + 4.2);
  doc.text('SHARE OF TOTAL', 150, currentY + 4.2);
  currentY += 7;

  const byTypeEntries = Object.entries(report.byType || {});
  const categoryTotal = totalIncidentsCount || byTypeEntries.reduce((s, [, c]) => s + (c || 0), 0) || 1;

  if (byTypeEntries.length === 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('No incident classification records recorded for the queried timeframe.', 18, currentY + 4);
    currentY += 10;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    byTypeEntries.slice(0, 7).forEach(([cat, count], idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, currentY - 1, pageWidth - 28, 6, 'F');
      }
      doc.setTextColor(30, 41, 59);
      doc.text(String(cat), 18, currentY + 3.5);
      doc.setFont('helvetica', 'bold');
      doc.text(String(count), 110, currentY + 3.5);
      doc.setFont('helvetica', 'normal');
      const pct = Math.round(((count || 0) / categoryTotal) * 100);
      doc.text(`${pct}%`, 150, currentY + 3.5);
      currentY += 6;
    });
  }

  // Executive Observation Box on Page 1
  currentY += 4;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14, currentY, pageWidth - 28, 20, 2, 2, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, currentY, pageWidth - 28, 20, 2, 2, 'S');

  doc.setTextColor(6, 95, 70);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('EXECUTIVE CONSERVATION INTELLIGENCE NOTICE', 18, currentY + 6);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(
    'This intelligence report synthesizes live telemetry from Ranger Patrol Logs, GPS Collar sensors,',
    18,
    currentY + 11
  );
  doc.text(
    'and Community Liaison Conflict feeds to support evidence-based anti-poaching and spatial resource allocation.',
    18,
    currentY + 16
  );

  // Page 1 Footer
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 282, pageWidth - 14, 282);
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Smart Wildlife Conservation System • Official Operations Report', 14, 287);
  doc.text('Page 1 of 2', pageWidth - 28, 287);


  // PAGE 2: GEOSPATIAL RISK, PATROLS & LOGS

  doc.addPage();

  // Header brand banner Page 2
  doc.setFillColor(6, 95, 70);
  doc.rect(0, 0, pageWidth, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('GEOSPATIAL RISK HOTSPOTS & OPERATIONAL SURVEILLANCE', 14, 10);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Report ID: ${reportId} • Sector Risk Density & Master Incident Records`, 14, 16);

  // Embedded Visual Charts on Page 2 (Exact Hotspot Density + Exact Patrol Gauge)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('SECTOR HOTSPOTS & PATROL SURVEILLANCE GAUGES', 14, 28);
  doc.line(14, 30, pageWidth - 14, 30);

  try {
    // Generate and render Visual Chart 3: Exact Hotspot Density Meter
    const hotspotImg = generateHotspotChartImage(report.hotspots || []);
    doc.addImage(hotspotImg, 'PNG', 14, 34, chartW, chartH);
  } catch {
    doc.rect(14, 34, chartW, chartH);
  }

  try {
    // Generate and render Visual Chart 4: Exact Patrol Gauge
    const patrolImg = generatePatrolGaugeImage(coverageScore, coverageGap);
    doc.addImage(patrolImg, 'PNG', 14 + chartW + 5, 34, chartW, chartH);
  } catch {
    doc.rect(14 + chartW + 5, 34, chartW, chartH);
  }

  // Hotspots Detail Table (Exact fetched hotspots)
  let page2Y = 84;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('IDENTIFIED GEOSPATIAL CONSERVATION HOTSPOTS', 14, page2Y);
  doc.line(14, page2Y + 2, pageWidth - 14, page2Y + 2);
  page2Y += 7;

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(14, page2Y, pageWidth - 28, 6, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('SECTOR LOCATION', 18, page2Y + 4.2);
  doc.text('SEVERITY', 95, page2Y + 4.2);
  doc.text('HEAT DENSITY', 130, page2Y + 4.2);
  doc.text('INCIDENTS', 165, page2Y + 4.2);
  page2Y += 7;

  const hotspots = report.hotspots || [];
  if (hotspots.length === 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('No high-density incident hotspot clusters identified for this period.', 18, page2Y + 4);
    page2Y += 10;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    hotspots.slice(0, 5).forEach((h, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, page2Y - 1, pageWidth - 28, 6, 'F');
      }
      doc.setTextColor(30, 41, 59);
      doc.text(String(h.location), 18, page2Y + 3.5);
      doc.setFont('helvetica', 'bold');
      doc.text(String(h.severity), 95, page2Y + 3.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`${Math.round((h.density || 0) * 100)}%`, 130, page2Y + 3.5);
      doc.text(String(h.count), 165, page2Y + 3.5);
      page2Y += 6;
    });
  }

  // Master Recent Incidents Table (Exact fetched incidents)
  page2Y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('MASTER RECORDED INCIDENTS LOG', 14, page2Y);
  doc.line(14, page2Y + 2, pageWidth - 14, page2Y + 2);
  page2Y += 7;

  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(14, page2Y, pageWidth - 28, 6, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('INCIDENT ID', 18, page2Y + 4.2);
  doc.text('DATE', 52, page2Y + 4.2);
  doc.text('CATEGORY', 80, page2Y + 4.2);
  doc.text('LOCATION', 120, page2Y + 4.2);
  doc.text('SEVERITY', 160, page2Y + 4.2);
  page2Y += 7;

  const incidents = report.recentIncidents || [];
  if (incidents.length === 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('No matching incident events recorded for this query selection.', 18, page2Y + 4);
    page2Y += 10;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    incidents.slice(0, 10).forEach((inc, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, page2Y - 1, pageWidth - 28, 5.5, 'F');
      }
      doc.setTextColor(6, 95, 70);
      doc.setFont('helvetica', 'bold');
      doc.text(String(inc.id), 18, page2Y + 3.2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(String(inc.date || '').slice(0, 10), 52, page2Y + 3.2);

      doc.setTextColor(30, 41, 59);
      doc.text(String(inc.type || '').slice(0, 20), 80, page2Y + 3.2);
      doc.text(String(inc.location || '').slice(0, 22), 120, page2Y + 3.2);

      doc.setFont('helvetica', 'bold');
      doc.text(String(inc.severity || 'LOW'), 160, page2Y + 3.2);

      page2Y += 5.5;
    });
  }

  // Official Certification & Signoff Box — SIGNED BY LOGGED IN PARK MANAGER
  page2Y = Math.max(page2Y + 5, 236);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, page2Y, pageWidth - 28, 22, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, page2Y, pageWidth - 28, 22, 2, 2, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('REGULATORY VERIFICATION & PARKS AUTHORITY SIGNOFF', 18, page2Y + 6.5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Document Certified & Signed By: ${activeManagerName} (Park Manager)`, 18, page2Y + 12);
  doc.text('Digital Stamp: SWCS-UC04-VERIFIED-INTELLIGENCE', 18, page2Y + 17);
  doc.text(`Official Verification Date: ${generatedDate}`, 115, page2Y + 17);

  // Page 2 Footer
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 282, pageWidth - 14, 282);
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Confidential Conservation Intelligence • WildGuard Automated Operations Hub', 14, 287);
  doc.text('Page 2 of 2', pageWidth - 28, 287);

  return doc;
}
