/**
 * Creates and configures an off-screen retina canvas
 * @param {number} width 
 * @param {number} height 
 * @returns {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D }}
 */
function createRetinaCanvas(width, height) {
  const canvas = document.createElement('canvas');
  const dpr = 2; // 2x retina density for sharp PDF rendering
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { canvas, ctx };
}

/**
 * Generates an area/line trend chart image for PDF
 * @param {Array<{ week: string, incidents: number, alerts: number }>} trendData 
 * @returns {string} Base64 PNG data URL
 */
export function generateTrendChartImage(trendData = []) {
  const width = 360;
  const height = 155;
  const { canvas, ctx } = createRetinaCanvas(width, height);

  // Background card
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Card border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);

  // Chart Title & Subtitle
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('WEEKLY INCIDENT & TELEMETRY ALERT TREND', 14, 18);

  ctx.fillStyle = '#64748b';
  ctx.font = '9px sans-serif';
  ctx.fillText('Temporal distribution across active conservation reporting cycles', 14, 30);

  // Legend
  ctx.fillStyle = '#047857'; // Emerald
  ctx.fillRect(width - 150, 10, 10, 10);
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 8.5px sans-serif';
  ctx.fillText('Incidents', width - 136, 18);

  ctx.fillStyle = '#d97706'; // Amber
  ctx.fillRect(width - 75, 10, 10, 10);
  ctx.fillStyle = '#334155';
  ctx.fillText('Collar Alerts', width - 61, 18);

  // If no trend data available from fetched analysis, render clean empty state notice
  if (!trendData || trendData.length === 0) {
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(14, 46, width - 28, height - 60, 6);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No temporal trend records recorded for selected query window.', width / 2, height / 2 + 10);
    ctx.textAlign = 'left';
    return canvas.toDataURL('image/png');
  }

  // Plot Area for actual fetched trend records
  const plotX = 35;
  const plotY = 42;
  const plotW = width - 50;
  const plotH = height - 68;

  const data = trendData;
  const maxVal = Math.max(...data.map((d) => Math.max(d.incidents || 0, d.alerts || 0)), 1);

  // Horizontal Grid Lines
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const y = plotY + (plotH / gridSteps) * i;
    ctx.beginPath();
    ctx.moveTo(plotX, y);
    ctx.lineTo(plotX + plotW, y);
    ctx.stroke();

    const val = Math.round(maxVal - (maxVal / gridSteps) * i);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(val), plotX - 5, y + 3);
  }
  ctx.textAlign = 'left';

  // Calculate points strictly from fetched trend series
  const stepX = data.length > 1 ? plotW / (data.length - 1) : plotW / 2;
  const incidentPoints = data.map((d, i) => ({
    x: data.length > 1 ? plotX + i * stepX : plotX + plotW / 2,
    y: plotY + plotH - ((d.incidents || 0) / maxVal) * plotH,
    val: d.incidents || 0,
    label: d.week || `W${i + 1}`,
  }));

  const alertPoints = data.map((d, i) => ({
    x: data.length > 1 ? plotX + i * stepX : plotX + plotW / 2,
    y: plotY + plotH - ((d.alerts || 0) / maxVal) * plotH,
    val: d.alerts || 0,
  }));

  // Gradient Area Fill for Incidents
  const grad = ctx.createLinearGradient(0, plotY, 0, plotY + plotH);
  grad.addColorStop(0, 'rgba(4, 120, 87, 0.28)');
  grad.addColorStop(1, 'rgba(4, 120, 87, 0.02)');
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.moveTo(incidentPoints[0].x, plotY + plotH);
  incidentPoints.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(incidentPoints[incidentPoints.length - 1].x, plotY + plotH);
  ctx.closePath();
  ctx.fill();

  // Incidents Stroke Line
  ctx.strokeStyle = '#047857';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  incidentPoints.forEach((p, idx) => {
    if (idx === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  // Collar Alerts Stroke Line
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  alertPoints.forEach((p, idx) => {
    if (idx === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  ctx.setLineDash([]); // Reset dash

  // Incident Points & Labels
  incidentPoints.forEach((p) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#047857';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Value pill
    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(p.val), p.x, p.y - 7);

    // X Axis Week Label
    ctx.fillStyle = '#64748b';
    ctx.font = '8px sans-serif';
    ctx.fillText(p.label, p.x, plotY + plotH + 14);
  });

  // Alert Points
  alertPoints.forEach((p) => {
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.textAlign = 'left';

  return canvas.toDataURL('image/png');
}

/**
 * Generates horizontal bar chart for incident categories breakdown
 * @param {Record<string, number>} byType 
 * @returns {string} Base64 PNG data URL
 */
export function generateCategoryChartImage(byType = {}) {
  const width = 360;
  const height = 155;
  const { canvas, ctx } = createRetinaCanvas(width, height);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('INCIDENT BREAKDOWN BY CATEGORY & THREAT', 14, 18);

  ctx.fillStyle = '#64748b';
  ctx.font = '9px sans-serif';
  ctx.fillText('Classification distribution across reported field event types', 14, 30);

  const entries = Object.entries(byType || {});
  if (entries.length === 0) {
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(14, 46, width - 28, height - 60, 6);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No incident classification records recorded for selected query window.', width / 2, height / 2 + 10);
    ctx.textAlign = 'left';
    return canvas.toDataURL('image/png');
  }

  const displayItems = entries.slice(0, 5);
  const total = displayItems.reduce((sum, [, count]) => sum + (count || 0), 0) || 1;
  const maxCount = Math.max(...displayItems.map(([, count]) => count || 0), 1);

  const startY = 44;
  const barHeight = 12;
  const gap = 20;
  const barMaxW = 160;
  const labelX = 14;
  const barX = 135;

  const colors = [
    { fill: '#047857', bg: '#d1fae5' }, // Emerald
    { fill: '#0284c7', bg: '#e0f2fe' }, // Sky
    { fill: '#d97706', bg: '#fef3c7' }, // Amber
    { fill: '#e11d48', bg: '#ffe4e6' }, // Rose
    { fill: '#64748b', bg: '#f1f5f9' }, // Slate
  ];

  displayItems.forEach(([label, count], idx) => {
    const y = startY + idx * gap;
    const c = colors[idx % colors.length];
    const barW = Math.max(((count || 0) / maxCount) * barMaxW, 6);
    const pct = Math.round(((count || 0) / total) * 100);

    // Label
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(label.length > 18 ? label.slice(0, 16) + '…' : label, labelX, y + 9);

    // Background track
    ctx.fillStyle = c.bg;
    ctx.beginPath();
    ctx.roundRect(barX, y, barMaxW, barHeight, 4);
    ctx.fill();

    // Progress bar
    ctx.fillStyle = c.fill;
    ctx.beginPath();
    ctx.roundRect(barX, y, barW, barHeight, 4);
    ctx.fill();

    // Value & Percentage
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 8.5px sans-serif';
    ctx.fillText(`${count} (${pct}%)`, barX + barMaxW + 8, y + 9);
  });

  return canvas.toDataURL('image/png');
}

/**
 * Generates hotspot sector density meter chart
 * @param {Array<{ location: string, count: number, severity: string, density: number }>} hotspots 
 * @returns {string} Base64 PNG data URL
 */
export function generateHotspotChartImage(hotspots = []) {
  const width = 360;
  const height = 150;
  const { canvas, ctx } = createRetinaCanvas(width, height);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('GEOSPATIAL SECTOR RISK & DENSITY MATRIX', 14, 18);

  ctx.fillStyle = '#64748b';
  ctx.font = '9px sans-serif';
  ctx.fillText('Identified conservation sectors prioritized by incident cluster density', 14, 30);

  if (!hotspots || hotspots.length === 0) {
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(14, 46, width - 28, height - 60, 6);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No high-density incident hotspot clusters identified for this period.', width / 2, height / 2 + 10);
    ctx.textAlign = 'left';
    return canvas.toDataURL('image/png');
  }

  const items = hotspots.slice(0, 4);

  const startY = 44;
  const gap = 24;
  const barMaxW = 140;
  const barX = 145;

  const severityTheme = {
    CRITICAL: { text: '#be123c', bar: '#e11d48', bg: '#ffe4e6' },
    HIGH: { text: '#c2410c', bar: '#ea580c', bg: '#ffedd5' },
    MEDIUM: { text: '#b45309', bar: '#d97706', bg: '#fef3c7' },
    LOW: { text: '#047857', bar: '#059669', bg: '#d1fae5' },
  };

  items.forEach((item, idx) => {
    const y = startY + idx * gap;
    const theme = severityTheme[item.severity] || severityTheme.LOW;
    const pct = Math.round((item.density || 0) * 100);
    const barW = Math.max((pct / 100) * barMaxW, 6);

    // Location
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(item.location.length > 20 ? item.location.slice(0, 18) + '…' : item.location, 14, y + 8);

    // Severity Pill
    ctx.fillStyle = theme.bg;
    ctx.beginPath();
    ctx.roundRect(14, y + 11, 48, 10, 3);
    ctx.fill();
    ctx.fillStyle = theme.text;
    ctx.font = 'bold 7px sans-serif';
    ctx.fillText(item.severity, 18, y + 18);

    // Track
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.roundRect(barX, y + 4, barMaxW, 10, 3);
    ctx.fill();

    // Bar
    ctx.fillStyle = theme.bar;
    ctx.beginPath();
    ctx.roundRect(barX, y + 4, barW, 10, 3);
    ctx.fill();

    // Value
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 8.5px sans-serif';
    ctx.fillText(`${item.count} inc (${pct}%)`, barX + barMaxW + 8, y + 12);
  });

  return canvas.toDataURL('image/png');
}

/**
 * Generates patrol surveillance coverage radial gauge image
 * @param {number} coverageScore 
 * @param {number} coverageGap 
 * @returns {string} Base64 PNG data URL
 */
export function generatePatrolGaugeImage(coverageScore = 0, coverageGap = null) {
  const width = 360;
  const height = 150;
  const { canvas, ctx } = createRetinaCanvas(width, height);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('RANGER PATROL SURVEILLANCE COVERAGE', 14, 18);

  ctx.fillStyle = '#64748b';
  ctx.font = '9px sans-serif';
  ctx.fillText('Area surveillance distribution vs unpatrolled territory gaps', 14, 30);

  // Radial Donut Gauge
  const cx = 85;
  const cy = 92;
  const radius = 38;
  const lineW = 12;

  const scorePct = Math.min(Math.max(coverageScore || 0, 0), 100);
  const startAngle = -Math.PI / 2;
  const scoreAngle = startAngle + (Math.PI * 2 * (scorePct / 100));

  // Background Ring
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = lineW;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Score Arc (Emerald)
  ctx.strokeStyle = '#047857';
  ctx.lineWidth = lineW;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, scoreAngle);
  ctx.stroke();

  // Gap Arc (Amber)
  if (scorePct < 100) {
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = lineW;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, scoreAngle, startAngle + Math.PI * 2);
    ctx.stroke();
  }

  // Center Score Text
  ctx.fillStyle = '#065f46';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${scorePct}%`, cx, cy + 5);

  ctx.fillStyle = '#64748b';
  ctx.font = '7.5px sans-serif';
  ctx.fillText('COVERAGE', cx, cy + 15);
  ctx.textAlign = 'left';

  // Metrics on right side
  const statsX = 160;
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 9.5px sans-serif';
  ctx.fillText('Surveillance Score Status', statsX, 58);

  // Score Metric Card
  ctx.fillStyle = '#f0fdf4';
  ctx.beginPath();
  ctx.roundRect(statsX, 66, 175, 26, 4);
  ctx.fill();
  ctx.strokeStyle = '#bbf7d0';
  ctx.stroke();

  ctx.fillStyle = '#166534';
  ctx.font = 'bold 8px sans-serif';
  ctx.fillText('ACTIVE PATROLLED SECTORS', statsX + 8, 77);
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(`${scorePct}% of Designated Reserve`, statsX + 8, 88);

  // Gap Metric Card
  ctx.fillStyle = '#fffbeb';
  ctx.beginPath();
  ctx.roundRect(statsX, 98, 175, 26, 4);
  ctx.fill();
  ctx.strokeStyle = '#fde68a';
  ctx.stroke();

  ctx.fillStyle = '#92400e';
  ctx.font = 'bold 8px sans-serif';
  ctx.fillText('UNPATROLLED SURVEILLANCE GAP', statsX + 8, 109);
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(`${coverageGap ?? (100 - scorePct)}% Territory at Risk`, statsX + 8, 120);

  return canvas.toDataURL('image/png');
}
