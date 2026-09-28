// Shared helpers: pay-cycle math, overtime aggregation, CSV, JSON body/multipart parsing.

function toDate(s) {
  // Parse an ISO date-only string as a UTC date to avoid TZ drift.
  return new Date(`${s}T00:00:00Z`);
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

// Returns { start, end } (ISO date strings, inclusive) of the pay cycle containing `dateStr`.
function currentPayCycle(dateStr, referenceDateStr, lengthDays) {
  const ref = toDate(referenceDateStr);
  const target = toDate(dateStr);
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((target - ref) / msPerDay);
  const cycleIndex = Math.floor(diffDays / lengthDays);
  const startMs = ref.getTime() + cycleIndex * lengthDays * msPerDay;
  const start = new Date(startMs);
  const end = new Date(startMs + (lengthDays - 1) * msPerDay);
  return { start: fmtDate(start), end: fmtDate(end) };
}

// ISO week key (Mon-Sun) for grouping weekly hours, e.g. "2026-W35".
function isoWeekKey(dateStr) {
  const d = toDate(dateStr);
  const day = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// Given a list of entries [{date, hours, countsAsWorked}], split into regular/overtime
// per ISO week using the weekly threshold, only counting hours from task types that count as worked.
function splitRegularOvertime(entries, weeklyThreshold) {
  const byWeek = new Map();
  for (const e of entries) {
    if (!e.countsAsWorked) continue;
    const key = isoWeekKey(e.date);
    byWeek.set(key, (byWeek.get(key) || 0) + e.hours);
  }
  let regular = 0;
  let overtime = 0;
  for (const total of byWeek.values()) {
    if (total > weeklyThreshold) {
      regular += weeklyThreshold;
      overtime += total - weeklyThreshold;
    } else {
      regular += total;
    }
  }
  return { regular, overtime, weeks: byWeek };
}

// Hours worked for a shift given "HH:MM" start and end and an unpaid break in
// minutes. Returns null when the input isn't usable, so the caller can reject it
// rather than silently storing a wrong number of hours.
function shiftHours(startTime, endTime, breakMinutes) {
  const toMinutes = (value) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(value == null ? '' : value).trim());
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) return null;
    return h * 60 + min;
  };

  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (start === null || end === null) return null;

  // An end at or before the start is read as a shift running past midnight.
  let span = end - start;
  if (span <= 0) span += 24 * 60;

  const brk = Number(breakMinutes);
  if (Number.isNaN(brk) || brk < 0) return null;
  const worked = span - brk;
  // A break that swallows the whole shift is a typo, not a zero-hour day.
  if (worked <= 0) return null;

  return Math.round((worked / 60) * 100) / 100;
}

function toCsvValue(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows, headers) {
  const lines = [headers.map(toCsvValue).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => toCsvValue(row[h])).join(','));
  }
  return lines.join('\r\n');
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 10 * 1024 * 1024) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

// Minimal multipart/form-data parser for file uploads. Returns { fields, files }
// where files is [{ fieldName, filename, mimeType, data(Buffer) }].
function readMultipart(req, contentType) {
  return new Promise((resolve, reject) => {
    const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
    const boundary = match ? match[1] || match[2] : null;
    if (!boundary) return reject(new Error('Missing multipart boundary'));
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 25 * 1024 * 1024) {
        reject(new Error('Upload too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        const buf = Buffer.concat(chunks);
        const boundaryBuf = Buffer.from(`--${boundary}`);
        const parts = [];
        let start = buf.indexOf(boundaryBuf);
        while (start !== -1) {
          const next = buf.indexOf(boundaryBuf, start + boundaryBuf.length);
          if (next === -1) break;
          const partBuf = buf.slice(start + boundaryBuf.length, next);
          parts.push(partBuf);
          start = next;
        }
        const fields = {};
        const files = [];
        for (let part of parts) {
          if (part.slice(0, 2).toString() === '--') continue;
          if (part.slice(0, 2).toString('utf8') === '\r\n') part = part.slice(2);
          const headerEnd = part.indexOf('\r\n\r\n');
          if (headerEnd === -1) continue;
          const headerText = part.slice(0, headerEnd).toString('utf8');
          let body = part.slice(headerEnd + 4);
          if (body.slice(-2).toString() === '\r\n') body = body.slice(0, -2);
          const nameMatch = /name="([^"]+)"/i.exec(headerText);
          const filenameMatch = /filename="([^"]*)"/i.exec(headerText);
          const typeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(headerText);
          const fieldName = nameMatch ? nameMatch[1] : null;
          if (!fieldName) continue;
          if (filenameMatch && filenameMatch[1]) {
            files.push({
              fieldName,
              filename: filenameMatch[1],
              mimeType: typeMatch ? typeMatch[1].trim() : 'application/octet-stream',
              data: body,
            });
          } else {
            fields[fieldName] = body.toString('utf8');
          }
        }
        resolve({ fields, files });
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

module.exports = {
  currentPayCycle,
  isoWeekKey,
  shiftHours,
  splitRegularOvertime,
  toCsv,
  readJsonBody,
  readMultipart,
  fmtDate,
  toDate,
};
