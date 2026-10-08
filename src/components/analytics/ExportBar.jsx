import { Download, FileText } from 'lucide-react';
import { useState } from 'react';

function buildCsvContent(report) {
  if (!report) return 'No report data available.';
  const rows = [['Report Type', report.reportType || '']];
  if (report.totalIncidents !== undefined) rows.push(['Total Incidents', report.totalIncidents]);
  if (report.byType) {
    Object.entries(report.byType).forEach(([type, count]) => rows.push([type, count]));
  }
  if (report.patrolCoverage) {
    rows.push(['Coverage Score (%)', report.patrolCoverage.coverageScore]);
    rows.push(['Coverage Gap (%)', report.patrolCoverage.coverageGap]);
  }
  return rows.map((r) => r.join(',')).join('\n');
}

function buildPdfContent(report) {
  if (!report) return 'No report data.';
  const lines = [
    '===== CONSERVATION ANALYTICS REPORT =====',
    `Report Type : ${report.reportType || 'N/A'}`,
    `Generated At: ${new Date().toLocaleString()}`,
    '',
    `Total Incidents: ${report.totalIncidents ?? 'N/A'}`,
  ];
  if (report.byType) {
    lines.push('', '--- Incidents by Type ---');
    Object.entries(report.byType).forEach(([t, c]) => lines.push(`  ${t}: ${c}`));
  }
  if (report.patrolCoverage) {
    lines.push('', '--- Patrol Coverage ---');
    lines.push(`  Coverage Score: ${report.patrolCoverage.coverageScore}%`);
    lines.push(`  Coverage Gap  : ${report.patrolCoverage.coverageGap}%`);
  }
  return lines.join('\n');
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportBar({ report }) {
  const [exporting, setExporting] = useState(null);

  async function handleExport(format) {
    if (!report) return;
    setExporting(format);
    await new Promise((r) => setTimeout(r, 600)); // simulate processing
    const ts = new Date().toISOString().slice(0, 10);
    if (format === 'CSV') {
      downloadFile(buildCsvContent(report), `analytics_report_${ts}.csv`, 'text/csv');
    } else {
      downloadFile(buildPdfContent(report), `analytics_report_${ts}.txt`, 'text/plain');
    }
    setExporting(null);
  }

  return (
    <div className="flex gap-3 flex-wrap">
      <button
        id="btn-export-pdf"
        onClick={() => handleExport('PDF')}
        disabled={!report || exporting === 'PDF'}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700/50 text-stone-200 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <FileText className="w-3.5 h-3.5 text-rose-400" />
        {exporting === 'PDF' ? 'Generating…' : 'Export PDF'}
      </button>
      <button
        id="btn-export-csv"
        onClick={() => handleExport('CSV')}
        disabled={!report || exporting === 'CSV'}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700/50 text-stone-200 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Download className="w-3.5 h-3.5 text-emerald-400" />
        {exporting === 'CSV' ? 'Generating…' : 'Export CSV'}
      </button>
    </div>
  );
}
