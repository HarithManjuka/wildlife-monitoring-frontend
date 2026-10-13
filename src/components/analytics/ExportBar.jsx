import { useState, useContext } from 'react';
import { Download, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { buildPdfReport } from '../../utils/exporters/pdfReportBuilder';
import { buildCsvReport } from '../../utils/exporters/csvReportBuilder';
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

export default function ExportBar({ report }) {
  const { user } = useContext(AuthContext);
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
        const doc = buildPdfReport(report, user);
        const filename = `report_${report.reportId || 'analytics'}_${Date.now()}.pdf`;
        doc.save(filename);

        // Notify backend audit trail service
        exportReport(report, 'PDF').catch(() => { });

        setSuccessNotice(`Downloaded ${filename}`);
        setTimeout(() => setSuccessNotice(null), 4000);
      } else {
        // CSV export via dedicated CSV builder
        const csvContent = buildCsvReport(report, user);
        const filename = `report_${report.reportId || 'analytics'}_${Date.now()}.csv`;
        downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');

        // Notify backend audit trail service
        exportReport(report, 'CSV').catch(() => { });

        setSuccessNotice(`Downloaded ${filename}`);
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
