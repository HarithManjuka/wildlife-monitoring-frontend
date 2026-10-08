/**
 * Escapes CSV field values
 * @param {string|number} value
 * @returns {string}
 */
function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const stringVal = String(value);
  if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
    return `"${stringVal.replace(/"/g, '""')}"`;
  }
  return stringVal;
}

/**
 * Builds structured CSV content string from report payload
 * @param {Object} report
 * @returns {string}
 */
export function buildCsvReport(report) {
  const sections = [];

  // Report Header Section
  sections.push(['WILDGUARD CONSERVATION REPORT - OPERATIONS INTELLIGENCE']);
  sections.push(['Report ID', escapeCsv(report.reportId || 'REP-GEN')]);
  sections.push(['Report Type', escapeCsv(report.reportType || 'INCIDENT_ANALYSIS')]);
  sections.push(['Status', escapeCsv(report.status || 'VERIFIED')]);
  sections.push(['Generated At', escapeCsv(new Date().toISOString())]);
  sections.push([]);

  // Executive Telemetry Summary Section
  sections.push(['EXECUTIVE METRICS SUMMARY']);
  sections.push(['Metric', 'Value']);
  sections.push(['Total Incidents', report.totalIncidents ?? 0]);
  sections.push(['Patrol Coverage (%)', report.patrolCoverage?.coverageScore ?? 0]);
  sections.push(['Coverage Gap (%)', report.patrolCoverage?.coverageGap ?? 0]);
  sections.push(['Active Hotspot Count', (report.hotspots || []).length]);
  sections.push([]);

  // Incidents by Category Section
  sections.push(['INCIDENT BREAKDOWN BY CATEGORY']);
  sections.push(['Threat Category', 'Count']);
  const byType = report.byType || {};
  Object.entries(byType).forEach(([type, count]) => {
    sections.push([escapeCsv(type), count]);
  });
  sections.push([]);

  // Hotspot Sectors Matrix Section
  sections.push(['CONSERVATION HOTSPOTS']);
  sections.push(['Location / Sector', 'Incident Count', 'Threat Severity', 'Density (%)']);
  (report.hotspots || []).forEach((h) => {
    sections.push([
      escapeCsv(h.location),
      h.count ?? 0,
      escapeCsv(h.severity || 'LOW'),
      Math.round((h.density || 0) * 100),
    ]);
  });
  sections.push([]);

  //  Ranger Patrol Distribution Section
  sections.push(['RANGER PATROL DISTRIBUTION']);
  sections.push(['Zone / Sector', 'Patrol Count']);
  (report.patrolCoverage?.zones || []).forEach((z) => {
    sections.push([escapeCsv(z.name), z.patrols ?? 0]);
  });
  sections.push([]);

  //  Recent Logged Incidents Table
  if (report.recentIncidents && report.recentIncidents.length > 0) {
    sections.push(['RECENT INCIDENTS LOG']);
    sections.push(['Incident ID', 'Date', 'Type', 'Location', 'Severity', 'Field Ranger']);
    report.recentIncidents.forEach((inc) => {
      sections.push([
        escapeCsv(inc.id),
        escapeCsv(inc.date),
        escapeCsv(inc.type),
        escapeCsv(inc.location),
        escapeCsv(inc.severity),
        escapeCsv(inc.ranger),
      ]);
    });
  }

  return sections.map((row) => row.join(',')).join('\n');
}
