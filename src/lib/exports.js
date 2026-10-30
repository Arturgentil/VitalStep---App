import { jsPDF } from 'jspdf';
import { fmtDateTime } from '@/lib/format';

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

export function exportCSV(rows, filename = `stepvolt-metricas-${stamp()}.csv`) {
  if (!rows.length) return false;
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(';'), ...rows.map((r) => headers.map((h) => escape(r[h])).join(';'))].join('\n');
  download(filename, `\ufeff${csv}`, 'text/csv;charset=utf-8;');
  return true;
}

export function exportJSON(data, filename = `stepvolt-backup-${stamp()}.json`) {
  download(filename, JSON.stringify(data, null, 2), 'application/json');
  return true;
}

export function exportGPX(activity) {
  const route = Array.isArray(activity.route) ? activity.route : [];
  if (route.length < 2) return false;
  const points = route
    .map(
      (p) =>
        `      <trkpt lat="${p.lat}" lon="${p.lng}"><time>${new Date(
          p.t || Date.now(),
        ).toISOString()}</time></trkpt>`,
    )
    .join('\n');
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="StepVolt" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${activity.title || 'Atividade StepVolt'}</name><time>${new Date(
    activity.started_at,
  ).toISOString()}</time></metadata>
  <trk>
    <name>${activity.title || 'Atividade StepVolt'}</name>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>`;
  download(`stepvolt-rota-${stamp()}.gpx`, gpx, 'application/gpx+xml');
  return true;
}

export function exportPDF({ title, subtitle, sections }, filename = `stepvolt-relatorio-${stamp()}.pdf`) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  let y = margin + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(12, 18, 28);
  doc.text('StepVolt', margin, y);
  y += 22;
  doc.setFontSize(13);
  doc.text(title, margin, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110, 118, 130);
  doc.text(subtitle || `Gerado em ${fmtDateTime(new Date())}`, margin, y);
  y += 20;
  doc.setDrawColor(210, 218, 226);
  doc.line(margin, y, 595 - margin, y);
  y += 22;

  sections.forEach((section) => {
    if (y > 760) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(10, 120, 150);
    doc.text(section.heading.toUpperCase(), margin, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 36, 46);
    section.lines.forEach((line) => {
      if (y > 780) {
        doc.addPage();
        y = margin;
      }
      const wrapped = doc.splitTextToSize(line, 595 - margin * 2);
      doc.text(wrapped, margin, y);
      y += 14 * wrapped.length;
    });
    y += 12;
  });

  doc.setFontSize(8);
  doc.setTextColor(140, 148, 158);
  doc.text(
    'Documento gerado pelo StepVolt. Valores marcados como estimativa são calculados, não medidos.',
    margin,
    812,
  );
  doc.save(filename);
  return true;
}