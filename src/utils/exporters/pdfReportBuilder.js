import { jsPDF } from 'jspdf';

/**
 * Builds and returns a formatted jsPDF document instance from report payload
 * @param {Object} report
 * @returns {jsPDF}
 */
export function buildPdfReport(report) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header brand banner
  doc.setFillColor(6, 95, 70); // #065f46 — Forest Emerald
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SMART WILDLIFE CONSERVATION SYSTEM', 14, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Conservation Analytics & Park Operations Intelligence Report', 14, 19);

  // Metadata block
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORT METADATA', 14, 38);
  doc.setDrawColor(220, 220, 220);
  doc.line(14, 40, pageWidth - 14, 40);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Report ID: ${report.reportId || 'REP-GEN'}`, 14, 47);
  doc.text(`Report Type: ${report.reportType?.replace(/_/g, ' ') || 'INCIDENT ANALYSIS'}`, 14, 53);
  doc.text(`Generated At: ${new Date().toLocaleString()}`, 110, 47);
  doc.text(`Evaluation Status: ${report.status || 'VERIFIED'}`, 110, 53);

  // Summary Metrics
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text('EXECUTIVE TELEMETRY SUMMARY', 14, 65);
  doc.line(14, 67, pageWidth - 14, 67);

  const boxWidth = (pageWidth - 28 - 9) / 4;
  const metrics = [
    { label: 'Total Incidents', val: String(report.totalIncidents ?? 0) },
    { label: 'Patrol Coverage', val: `${report.patrolCoverage?.coverageScore ?? 0}%` },
    { label: 'Coverage Gap', val: `${report.patrolCoverage?.coverageGap ?? 0}%` },
    { label: 'Active Hotspots', val: String(report.hotspots?.length ?? 0) },
  ];

  metrics.forEach((m, idx) => {
    const x = 14 + idx * (boxWidth + 3);
    doc.setFillColor(245, 245, 244);
    doc.roundedRect(x, 72, boxWidth, 18, 2, 2, 'F');
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(m.label.toUpperCase(), x + 3, 78);
    doc.setTextColor(6, 95, 70);
    doc.setFontSize(12);
    doc.text(m.val, x + 3, 86);
  });

  // Incidents By Category
  let currentY = 100;
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('INCIDENTS BY CATEGORY', 14, currentY);
  doc.line(14, currentY + 2, pageWidth - 14, currentY + 2);
  currentY += 8;

  const byTypeEntries = Object.entries(report.byType || {});
  if (byTypeEntries.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text('No incident category breakdown records available.', 14, currentY);
    currentY += 8;
  } else {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    byTypeEntries.forEach(([cat, count]) => {
      doc.setTextColor(60, 60, 60);
      doc.text(`• ${cat}:`, 18, currentY);
      doc.setFont('helvetica', 'bold');
      doc.text(`${count}`, 75, currentY);
      doc.setFont('helvetica', 'normal');
      currentY += 5.5;
    });
  }

  currentY += 4;
  // Critical Hotspots
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text('IDENTIFIED CONSERVATION HOTSPOTS', 14, currentY);
  doc.line(14, currentY + 2, pageWidth - 14, currentY + 2);
  currentY += 8;

  const hotspots = report.hotspots || [];
  if (hotspots.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text('No critical geographic hotspots detected for this period.', 14, currentY);
    currentY += 8;
  } else {
    doc.setFillColor(240, 240, 240);
    doc.rect(14, currentY - 4, pageWidth - 28, 6, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(70, 70, 70);
    doc.text('SECTOR LOCATION', 16, currentY);
    doc.text('SEVERITY', 95, currentY);
    doc.text('DENSITY', 130, currentY);
    doc.text('INCIDENTS', 165, currentY);
    currentY += 6;

    doc.setFont('helvetica', 'normal');
    hotspots.slice(0, 8).forEach((h) => {
      doc.setTextColor(60, 60, 60);
      doc.text(String(h.location), 16, currentY);
      doc.text(String(h.severity), 95, currentY);
      doc.text(`${Math.round((h.density || 0) * 100)}%`, 130, currentY);
      doc.text(String(h.count), 165, currentY);
      currentY += 5.5;
    });
  }

  // Footer & Certification
  doc.setDrawColor(220, 220, 220);
  doc.line(14, 270, pageWidth - 14, 270);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Confidential Conservation Intelligence • WildGuard Automated Operations Hub', 14, 275);
  doc.text('Verified by: J.R.I.C.S. Jayakody (Park Manager)', 110, 275);

  return doc;
}
