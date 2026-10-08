
import { useState } from 'react';
import { Download, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { exportReport } from '../../services/analyticsService';

function downloadFile(content, filename, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildPdfDocument(report) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Header emerald banner
  doc.setFillColor(6, 95, 70); // #065f46 - emerald 800
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Title in header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SMART WILDLIFE CONSERVATION SYSTEM', 14, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Conservation Analytics & Park Operations Intelligence Report', 14, 19);

  // 2. Metadata block
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

  // 3. Summary Metrics
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

  // 4. Incidents By Category
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
  // 5. Critical Hotspots
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
    // Hotspot table header
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

  // 6. Footer & Certification
  doc.setDrawColor(220, 220, 220);
  doc.line(14, 270, pageWidth - 14, 270);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Confidential Conservation Intelligence • WildGuard Automated Operations Hub', 14, 275);
  doc.text('Verified by: J.R.I.C.S. Jayakody (Park Manager)', 110, 275);

  return doc;
}

export default function ExportBar({ report }) {
  const [exporting, setExporting] = useState(null);
  const [pdfError, setPdfError] = useState(null);
  const [successNotice, setSuccessNotice] = useState(null);

  const handleExport = async (format) => {
    if (!report) return;
    setExporting(format);
    setPdfError(null);
    setSuccessNotice(null);

    try {
      if (format === 'PDF') {
        const doc = buildPdfDocument(report);
        const filename = `report_${report.reportId || 'analytics'}_${Date.now()}.pdf`;
        doc.save(filename);

        // Notify backend audit trail service
        exportReport(report, 'PDF').catch(() => { });

        setSuccessNotice(`Downloaded ${filename}`);
        setTimeout(() => setSuccessNotice(null), 4000);
      } else {
        // CSV export
        const result = await exportReport(report, 'CSV');
        downloadFile(result.fileContent, result.filename, result.mimeType || 'text/csv');
        setSuccessNotice(`Downloaded ${result.filename}`);
        setTimeout(() => setSuccessNotice(null), 4000);
      }
    } catch (err) {
      setPdfError({
        message: 'PDF generation failed: ' + (err.message || 'Rendering error'),
        offerCSV: true,
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* PDF Export Button */}
        <button
          id="btn-export-pdf"
          type="button"
          onClick={() => handleExport('PDF')}
          disabled={!report || exporting === 'PDF'}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-rose-700" />
          {exporting === 'PDF' ? 'Generating PDF…' : 'Export PDF'}
        </button>

        {/* CSV Export Button */}
        <button
          id="btn-export-csv"
          type="button"
          onClick={() => handleExport('CSV')}
          disabled={!report || exporting === 'CSV'}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-emerald-800" />
          {exporting === 'CSV' ? 'Compiling CSV…' : 'Export CSV'}
        </button>
      </div>

      {/* [PDF fails] -> offer CSV fallback */}
      {pdfError && (
        <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span className="font-medium">{pdfError.message}</span>
          </div>
          {pdfError.offerCSV && (
            <button
              onClick={() => handleExport('CSV')}
              className="px-3 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-[11px] transition shadow-xs cursor-pointer whitespace-nowrap"
            >
              Use CSV Fallback
            </button>
          )}
        </div>
      )}

      {/* Success Notification */}
      {successNotice && (
        <div className="flex items-center gap-2 text-xs text-emerald-800 font-medium">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
          <span>{successNotice}</span>
        </div>
      )}
    </div>
  );
}
