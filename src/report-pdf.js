// Renders the Reports screen as a PDF, using the dependency-free writer in pdf.js.
// Takes the same payload the /api/reports endpoint returns, so the PDF and the
// on-screen report can never drift apart.
const { PdfDoc, measure, ellipsize } = require('./pdf');

// Matches public/css/styles.css so the PDF looks like the app.
const COLOR = {
  primary: '#0a2a36',
  accent: '#3db6de',
  overtime: '#9c5f38',
  text: '#0a2a36',
  muted: '#5b6b70',
  border: '#e4ddd0',
  tile: '#f7f4ef',
  white: '#ffffff',
  headerSub: '#9fc3cf',
};

const LABELS = {
  en: {
    report: 'Timesheet Report',
    generated: 'Generated',
    payCycle: 'Pay cycle',
    year: 'Year',
    employee: 'Employee',
    allEmployees: 'All employees',
    totalHours: 'Total Hours',
    overtime: 'Overtime',
    employees: 'Employees',
    entries: 'Entries',
    weeklyDist: 'Weekly Distribution',
    regularHours: 'Regular',
    hoursByTask: 'Hours by Task',
    task: 'Task',
    hours: 'Hours',
    percentOfTotal: '% of Total',
    employeeSummary: 'Employee Summary',
    daysWorked: 'Days',
    regularCol: 'Regular',
    totalCol: 'Total',
    noData: 'No approved entries in this period.',
    tooManyTasks: 'Too many task types to break down here — see the Reports screen or the CSV export.',
    page: 'Page {n} of {total}',
    approvedOnly: 'Approved entries only',
  },
  fr: {
    report: 'Rapport de feuilles de temps',
    generated: 'Généré le',
    payCycle: 'Période de paie',
    year: 'Année',
    employee: 'Employé',
    allEmployees: 'Tous les employés',
    totalHours: 'Heures totales',
    overtime: 'Heures supp.',
    employees: 'Employés',
    entries: 'Entrées',
    weeklyDist: 'Répartition hebdomadaire',
    regularHours: 'Régulières',
    hoursByTask: 'Heures par tâche',
    task: 'Tâche',
    hours: 'Heures',
    percentOfTotal: '% du total',
    employeeSummary: 'Sommaire par employé',
    daysWorked: 'Jours',
    regularCol: 'Régulières',
    totalCol: 'Total',
    noData: 'Aucune entrée approuvée pour cette période.',
    tooManyTasks: "Trop de types de tâches pour le détail ici — voir l'écran Rapports ou l'export CSV.",
    page: 'Page {n} sur {total}',
    approvedOnly: 'Entrées approuvées seulement',
  },
};

const FOOTER_SPACE = 46;

function renderReportPdf({ report, companyName, lang = 'en', rangeLabel, employeeName }) {
  const L = LABELS[lang === 'fr' ? 'fr' : 'en'];
  const doc = new PdfDoc({ margin: 48 });
  const left = doc.margin;
  const width = doc.contentWidth;

  drawHeader(doc, L, { companyName, rangeLabel, employeeName, lang });
  doc.y = 128;

  drawStatTiles(doc, L, report.totals, left, width);
  doc.y += 26;

  sectionTitle(doc, L.weeklyDist, left, width);
  drawWeeklyChart(doc, L, report.weeklyDistribution, left, width);
  doc.y += 22;

  const taskTotal = report.taskBreakdown.reduce((sum, t) => sum + t.hours, 0);
  drawTable(doc, L, {
    title: L.hoursByTask,
    columns: [
      { key: 'name', label: L.task, width: 256 },
      { key: 'hours', label: L.hours, width: 130, align: 'right' },
      { key: 'pct', label: L.percentOfTotal, width: 130, align: 'right' },
    ],
    rows: report.taskBreakdown.map((t) => ({
      name: t.name || '—',
      hours: `${t.hours}h`,
      pct: taskTotal ? `${Math.round((t.hours / taskTotal) * 100)}%` : '0%',
    })),
  });
  doc.y += 22;

  // One column per task type that counts toward worked hours. The page is a fixed
  // 516pt wide, so the name column gives up space first, then the task columns
  // shrink and the type size drops; past that they can't be printed legibly.
  const taskCols = report.workedTaskColumns || [];
  const fixedWidth = 44 + 68 + 68 + 68; // days, regular, overtime, total
  const nameMin = 92;
  let nameWidth = width - fixedWidth;
  let taskWidth = 0;
  let showTaskCols = taskCols.length > 0;
  if (showTaskCols) {
    taskWidth = 64;
    nameWidth = width - fixedWidth - taskWidth * taskCols.length;
    if (nameWidth < nameMin) {
      nameWidth = nameMin;
      taskWidth = (width - fixedWidth - nameMin) / taskCols.length;
    }
    if (taskWidth < 30) showTaskCols = false;
  }
  if (!showTaskCols) nameWidth = width - fixedWidth;

  drawTable(doc, L, {
    title: L.employeeSummary,
    size: showTaskCols && taskCols.length > 3 ? 8 : 9.5,
    note: taskCols.length && !showTaskCols ? L.tooManyTasks : '',
    columns: [
      { key: 'name', label: L.employee, width: nameWidth },
      { key: 'days', label: L.daysWorked, width: 44, align: 'right' },
      ...(showTaskCols
        ? taskCols.map((c) => ({ key: `task_${c.taskTypeId}`, label: c.name, width: taskWidth, align: 'right' }))
        : []),
      { key: 'regular', label: L.regularCol, width: 68, align: 'right' },
      { key: 'ot', label: L.overtime, width: 68, align: 'right' },
      { key: 'total', label: L.totalCol, width: 68, align: 'right' },
    ],
    rows: report.employeeSummary.map((e) => {
      const row = {
        name: e.name,
        days: String(e.daysWorked),
        regular: `${e.regularHours}h`,
        ot: `${e.overtimeHours}h`,
        total: `${e.totalHours}h`,
      };
      if (showTaskCols) {
        for (const c of taskCols) row[`task_${c.taskTypeId}`] = `${(e.taskHours || {})[c.taskTypeId] || 0}h`;
      }
      return row;
    }),
  });

  drawFooters(doc, L, companyName);
  return doc.toBuffer();
}

function drawHeader(doc, L, { companyName, rangeLabel, employeeName, lang }) {
  doc.rect(0, 0, doc.width, 96, COLOR.primary);
  doc.text(companyName, doc.margin, 26, { size: 19, bold: true, color: COLOR.white });
  doc.text(L.report, doc.margin, 52, { size: 11, color: COLOR.headerSub });

  const right = doc.margin;
  const colWidth = doc.contentWidth;
  doc.text(rangeLabel, right, 28, { size: 11, bold: true, color: COLOR.white, align: 'right', width: colWidth });
  doc.text(employeeName || L.allEmployees, right, 46, {
    size: 9.5,
    color: COLOR.headerSub,
    align: 'right',
    width: colWidth,
  });
  const stamp = new Date().toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA');
  doc.text(`${L.generated} ${stamp} · ${L.approvedOnly}`, right, 62, {
    size: 9.5,
    color: COLOR.headerSub,
    align: 'right',
    width: colWidth,
  });
}

function drawStatTiles(doc, L, totals, left, width) {
  const tiles = [
    { label: L.totalHours, value: `${totals.totalHours}h` },
    { label: L.overtime, value: `${totals.overtimeHours}h` },
    { label: L.employees, value: String(totals.employees) },
    { label: L.entries, value: String(totals.entries) },
  ];
  const gap = 8;
  const tileWidth = (width - gap * (tiles.length - 1)) / tiles.length;
  const height = 58;
  tiles.forEach((tile, i) => {
    const x = left + i * (tileWidth + gap);
    doc.rect(x, doc.y, tileWidth, height, COLOR.tile);
    doc.text(tile.label.toUpperCase(), x + 12, doc.y + 12, { size: 7.5, color: COLOR.muted });
    doc.text(tile.value, x + 12, doc.y + 26, { size: 19, bold: true, color: COLOR.text });
  });
  doc.y += height;
}

function sectionTitle(doc, title, left, width) {
  doc.text(title, left, doc.y, { size: 12, bold: true, color: COLOR.text });
  doc.y += 18;
  doc.line(left, doc.y, left + width, doc.y, { color: COLOR.border });
  doc.y += 12;
}

// Stacked bars, regular below overtime. Amber sits under 3:1 contrast on white,
// so the values are carried by a labelled axis and direct labels, not fill alone.
function drawWeeklyChart(doc, L, weeks, left, width) {
  if (!weeks.length) {
    doc.text(L.noData, left, doc.y, { size: 10, color: COLOR.muted });
    doc.y += 20;
    return;
  }

  const chartHeight = 132;
  const axisWidth = 34;
  const plotLeft = left + axisWidth;
  const plotWidth = width - axisWidth;
  const top = doc.y;
  const baseline = top + chartHeight;

  const max = Math.max(1, ...weeks.map((w) => w.regular + w.overtime));
  const niceMax = Math.ceil(max / 5) * 5 || 5;

  // Recessive gridlines with value labels — these carry the magnitude.
  for (let i = 0; i <= 2; i++) {
    const value = (niceMax / 2) * i;
    const y = baseline - (value / niceMax) * chartHeight;
    doc.line(plotLeft, y, plotLeft + plotWidth, y, { color: COLOR.border, width: 0.5 });
    doc.text(`${value}h`, left, y - 4, { size: 7.5, color: COLOR.muted, align: 'right', width: axisWidth - 8 });
  }

  const slot = plotWidth / weeks.length;
  const barWidth = Math.min(26, Math.max(4, slot - 8));
  const labelEvery = Math.ceil(weeks.length / 18); // keep week labels from colliding
  const labelTotals = weeks.length <= 14;

  weeks.forEach((w, i) => {
    const x = plotLeft + i * slot + (slot - barWidth) / 2;
    const total = w.regular + w.overtime;
    const regularH = (w.regular / niceMax) * chartHeight;
    const overtimeH = (w.overtime / niceMax) * chartHeight;

    if (regularH > 0) doc.rect(x, baseline - regularH, barWidth, regularH, COLOR.accent);
    if (overtimeH > 0) {
      // 2px surface gap keeps the two segments legible where they meet.
      const gap = regularH > 0 ? 2 : 0;
      doc.rect(x, baseline - regularH - overtimeH - gap, barWidth, overtimeH, COLOR.overtime);
    }

    if (labelTotals && total > 0) {
      const y = baseline - regularH - overtimeH - (overtimeH > 0 ? 2 : 0) - 11;
      doc.text(`${Math.round(total * 10) / 10}`, x - 6, y, {
        size: 7.5,
        color: COLOR.muted,
        align: 'center',
        width: barWidth + 12,
      });
    }

    if (i % labelEvery === 0) {
      const label = String(w.week).replace(/^\d+-/, '');
      doc.text(label, x - 6, baseline + 6, { size: 7.5, color: COLOR.muted, align: 'center', width: barWidth + 12 });
    }
  });

  doc.line(plotLeft, baseline, plotLeft + plotWidth, baseline, { color: COLOR.border });
  doc.y = baseline + 20;

  // Legend — two series always get one.
  let lx = plotLeft;
  for (const item of [
    { label: L.regularHours, color: COLOR.accent },
    { label: L.overtime, color: COLOR.overtime },
  ]) {
    doc.rect(lx, doc.y + 2, 8, 8, item.color);
    doc.text(item.label, lx + 12, doc.y, { size: 8.5, color: COLOR.muted });
    lx += 12 + measure(item.label, 8.5) + 18;
  }
  doc.y += 16;
}

function drawTable(doc, L, { title, columns, rows, size = 9.5, note = '' }) {
  const left = doc.margin;
  const width = doc.contentWidth;
  const rowHeight = size <= 8 ? 17 : 20;

  const header = () => {
    sectionTitle(doc, title, left, width);
    if (note) {
      doc.text(note, left, doc.y, { size: 8, color: COLOR.muted });
      doc.y += 13;
    }
    let x = left;
    for (const col of columns) {
      // Task-type names are user-supplied and can be long; keep them inside the column.
      doc.text(ellipsize(col.label, col.width - 4, 8, true), x, doc.y, {
        size: 8,
        bold: true,
        color: COLOR.muted,
        align: col.align || 'left',
        width: col.width,
      });
      x += col.width;
    }
    doc.y += 14;
    doc.line(left, doc.y, left + width, doc.y, { color: COLOR.border });
    doc.y += 6;
  };

  header();

  if (!rows.length) {
    doc.text(L.noData, left, doc.y, { size: 10, color: COLOR.muted });
    doc.y += 20;
    return;
  }

  for (const row of rows) {
    if (doc.remaining < rowHeight) {
      doc.addPage();
      doc.y = doc.margin;
      header();
    }
    let x = left;
    for (const col of columns) {
      const value = ellipsize(row[col.key], col.width - 6, size);
      doc.text(value, x, doc.y, { size, color: COLOR.text, align: col.align || 'left', width: col.width });
      x += col.width;
    }
    doc.y += rowHeight - 6;
    doc.line(left, doc.y, left + width, doc.y, { color: COLOR.border, width: 0.4 });
    doc.y += 6;
  }
}

function drawFooters(doc, L, companyName) {
  const total = doc.pages.length;
  doc.pages.forEach((ops, i) => {
    doc.ops = ops; // draw into this page rather than the current one
    const y = doc.height - FOOTER_SPACE;
    doc.line(doc.margin, y, doc.width - doc.margin, y, { color: COLOR.border });
    doc.text(companyName, doc.margin, y + 8, { size: 8, color: COLOR.muted });
    doc.text(L.page.replace('{n}', String(i + 1)).replace('{total}', String(total)), doc.margin, y + 8, {
      size: 8,
      color: COLOR.muted,
      align: 'right',
      width: doc.contentWidth,
    });
  });
}

module.exports = { renderReportPdf };
