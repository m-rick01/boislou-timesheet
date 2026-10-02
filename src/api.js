const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const db = require('./db');
const auth = require('./auth');
const { sendMail } = require('./mail');
const { sendJson, sendError, setCookie, clearCookie } = require('./http');
const {
  currentPayCycle,
  shiftHours,
  splitRegularOvertime,
  toCsv,
  readJsonBody,
  readMultipart,
} = require('./utils');
const { renderReportPdf } = require('./report-pdf');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function publicUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}

function getSettings() {
  return db.prepare('SELECT * FROM settings WHERE id = 1').get();
}

function requireAuth(ctx, res) {
  if (!ctx.user) {
    sendError(res, 401, 'Non connecté');
    return false;
  }
  return true;
}

function requireAdmin(ctx, res) {
  if (!requireAuth(ctx, res)) return false;
  if (ctx.user.role !== 'admin') {
    sendError(res, 403, 'Accès administrateur requis');
    return false;
  }
  return true;
}

function taskTypeMap() {
  const rows = db.prepare('SELECT * FROM task_types').all();
  const map = new Map();
  rows.forEach((r) => map.set(r.id, r));
  return map;
}

// ---- Route table ----
// Each route: { method, regex, params: [names], handler(req,res,ctx,params,body) }
const routes = [];
function route(method, pattern, handler) {
  const paramNames = [];
  const regexStr =
    '^' +
    pattern.replace(/:([A-Za-z]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    }) +
    '$';
  routes.push({ method, regex: new RegExp(regexStr), paramNames, handler });
}

// ---------- AUTH ----------
route('POST', '/api/login', async (req, res, ctx, params, body) => {
  const { email, password } = body;
  if (!email || !password) return sendError(res, 400, 'Le courriel et le mot de passe sont obligatoires');
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(String(email).toLowerCase());
  if (!user || !auth.verifyPassword(password, user.passwordHash)) {
    return sendError(res, 401, 'Courriel ou mot de passe invalide');
  }
  const session = auth.createSession(user.id);
  setCookie(res, 'session', session.token, { maxAgeSeconds: auth.SESSION_DAYS * 24 * 60 * 60 });
  sendJson(res, 200, { user: publicUser(user) });
});

route('POST', '/api/logout', async (req, res, ctx) => {
  if (ctx.sessionToken) auth.destroySession(ctx.sessionToken);
  clearCookie(res, 'session');
  sendJson(res, 200, { ok: true });
});

route('GET', '/api/me', async (req, res, ctx) => {
  if (!requireAuth(ctx, res)) return;
  sendJson(res, 200, { user: publicUser(ctx.user) });
});

route('POST', '/api/change-password', async (req, res, ctx, params, body) => {
  if (!requireAuth(ctx, res)) return;
  const { currentPassword, newPassword } = body;
  if (!newPassword || newPassword.length < 8) {
    return sendError(res, 400, 'Le nouveau mot de passe doit contenir au moins 8 caractères');
  }
  if (!ctx.user.mustChangePassword) {
    if (!currentPassword || !auth.verifyPassword(currentPassword, ctx.user.passwordHash)) {
      return sendError(res, 401, 'Le mot de passe actuel est incorrect');
    }
  }
  const hash = auth.hashPassword(newPassword);
  db.prepare('UPDATE users SET passwordHash = ?, mustChangePassword = 0 WHERE id = ?').run(hash, ctx.user.id);
  sendJson(res, 200, { ok: true });
});

// ---------- FORGOT / RESET PASSWORD (no session required) ----------

// Throttles reset emails per address, so the endpoint can't be used to flood
// someone's inbox. In memory on purpose: it resets when the app restarts, which
// is fine for a rate limit and keeps the database free of request logs.
const resetRequests = new Map(); // email -> timestamps
const RESET_MAX_PER_HOUR = 5;
const RESET_MIN_GAP_MS = 2 * 60 * 1000;

function allowResetRequest(email) {
  const now = Date.now();
  const recent = (resetRequests.get(email) || []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= RESET_MAX_PER_HOUR) return false;
  if (recent.length && now - recent[recent.length - 1] < RESET_MIN_GAP_MS) return false;
  recent.push(now);
  resetRequests.set(email, recent);
  return true;
}

route('POST', '/api/forgot-password', async (req, res, ctx, params, body) => {
  const email = String(body.email || '').toLowerCase().trim();

  // The answer is always the same, so this can't be used to find out who has an
  // account here. Every early return below is deliberately indistinguishable.
  const generic = { ok: true };
  if (!email) return sendJson(res, 200, generic);
  if (!allowResetRequest(email)) return sendJson(res, 200, generic);

  const user = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(email);
  if (!user) return sendJson(res, 200, generic);

  // Any older link stops working as soon as a new one is issued.
  db.prepare('DELETE FROM password_resets WHERE userId = ? AND usedAt IS NULL').run(user.id);
  const { token } = auth.createPasswordReset(user.id);

  const settings = getSettings();
  const appUrl = process.env.APP_URL || '/';
  const link = `${appUrl}#/reset?token=${token}`;
  sendMail({
    to: user.email,
    subject: `Réinitialisation de votre mot de passe ${settings.companyName}`,
    html: `
        <p>Bonjour ${user.name},</p>
        <p>Une réinitialisation de mot de passe a été demandée pour votre compte WorkTrack.</p>
        <p><a href="${link}">Choisir un nouveau mot de passe</a></p>
        <p>Ce lien expire dans ${auth.RESET_MINUTES} minutes et ne peut servir qu'une seule fois.</p>
        <p>Si vous n'avez pas fait cette demande, ignorez ce message : votre mot de passe reste inchangé.</p>
      `,
  }).catch((err) => console.error('[mail] failed to send password-reset email:', err.message));

  sendJson(res, 200, generic);
});

route('POST', '/api/reset-password', async (req, res, ctx, params, body) => {
  const token = String(body.token || '');
  const password = String(body.password || '');
  if (password.length < 8) return sendError(res, 400, 'Le nouveau mot de passe doit contenir au moins 8 caractères');

  const reset = auth.findPasswordReset(token);
  const user = reset ? db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(reset.userId) : null;
  if (!user) return sendError(res, 400, 'Ce lien de réinitialisation est invalide ou a expiré.');

  db.prepare('UPDATE users SET passwordHash = ?, mustChangePassword = 0 WHERE id = ?').run(
    auth.hashPassword(password),
    user.id
  );
  db.prepare("UPDATE password_resets SET usedAt = datetime('now') WHERE id = ?").run(reset.id);
  db.prepare('DELETE FROM password_resets WHERE userId = ? AND usedAt IS NULL').run(user.id);
  // Whoever prompted the reset may have been signed in somewhere; drop it all.
  db.prepare('DELETE FROM sessions WHERE userId = ?').run(user.id);

  sendJson(res, 200, { ok: true });
});

// ---------- PROFILE (self-service) ----------
route('PATCH', '/api/profile', async (req, res, ctx, params, body) => {
  if (!requireAuth(ctx, res)) return;
  const fields = ['phone', 'street', 'city', 'postalCode', 'dateOfBirth', 'language'];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(String(body[f]));
    }
  }
  if (body.name !== undefined && String(body.name).trim()) {
    updates.push('name = ?');
    values.push(String(body.name).trim());
  }
  if (!updates.length) return sendError(res, 400, 'Aucun champ à mettre à jour');
  values.push(ctx.user.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(ctx.user.id);
  sendJson(res, 200, { user: publicUser(updated) });
});

// ---------- USERS / TEAM (admin) ----------
route('GET', '/api/users', async (req, res, ctx) => {
  if (!requireAdmin(ctx, res)) return;
  const rows = db.prepare('SELECT * FROM users ORDER BY name').all();
  sendJson(res, 200, { users: rows.map(publicUser) });
});

route('POST', '/api/users', async (req, res, ctx, params, body) => {
  if (!requireAdmin(ctx, res)) return;
  const { name, email, role, jobTitle, department } = body;
  if (!name || !email || !role) return sendError(res, 400, 'Le nom, le courriel et le rôle sont obligatoires');
  if (!['admin', 'employee'].includes(role)) return sendError(res, 400, 'Rôle invalide');
  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) return sendError(res, 409, 'Un utilisateur avec ce courriel existe déjà');

  const tempPassword = auth.generateTempPassword();
  const hash = auth.hashPassword(tempPassword);
  const info = db
    .prepare(
      `INSERT INTO users (name, email, passwordHash, role, jobTitle, department, mustChangePassword)
       VALUES (?, ?, ?, ?, ?, ?, 1)`
    )
    .run(name.trim(), normalizedEmail, hash, role, jobTitle || '', department || '');

  const settings = getSettings();
  if (settings.notifyNewAccount) {
    const appUrl = process.env.APP_URL || '/';
    sendMail({
      to: normalizedEmail,
      subject: `Votre compte WorkTrack ${settings.companyName}`,
      html: `
        <p>Bonjour ${name},</p>
        <p>Un compte a été créé pour vous sur WorkTrack Pro de ${settings.companyName}.</p>
        <p><strong>Identifiant :</strong> ${normalizedEmail}<br/>
        <strong>Mot de passe temporaire :</strong> ${tempPassword}</p>
        <p><a href="${appUrl}">Connectez-vous ici</a>. Vous devrez choisir un nouveau mot de passe à la première connexion.</p>
      `,
    }).catch((err) => console.error('[mail] failed to send new-account email:', err.message));
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  sendJson(res, 201, { user: publicUser(user) });
});

route('PATCH', '/api/users/:id', async (req, res, ctx, params, body) => {
  if (!requireAdmin(ctx, res)) return;
  const id = Number(params.id);
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!target) return sendError(res, 404, 'Utilisateur introuvable');
  // Everything an employee can set on their own Profile, plus the admin-managed
  // fields, so an admin can correct anything a member entered.
  const fields = [
    'name', 'jobTitle', 'department', 'role', 'active',
    'phone', 'street', 'city', 'postalCode', 'country', 'dateOfBirth', 'language',
  ];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(f === 'active' ? (body[f] ? 1 : 0) : String(body[f]));
    }
  }
  if (!updates.length) return sendError(res, 400, 'Aucun champ à mettre à jour');
  values.push(id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  sendJson(res, 200, { user: publicUser(updated) });
});

// ---------- TASK TYPES (admin manages, all authed users can read active ones) ----------
route('GET', '/api/tasktypes', async (req, res, ctx) => {
  if (!requireAuth(ctx, res)) return;
  const all = ctx.user.role === 'admin';
  const rows = all
    ? db.prepare('SELECT * FROM task_types ORDER BY sortOrder, name').all()
    : db.prepare('SELECT * FROM task_types WHERE active = 1 ORDER BY sortOrder, name').all();
  sendJson(res, 200, { taskTypes: rows });
});

route('POST', '/api/tasktypes', async (req, res, ctx, params, body) => {
  if (!requireAdmin(ctx, res)) return;
  const { name, countsAsWorked = true } = body;
  if (!name || !String(name).trim()) return sendError(res, 400, 'Le nom est obligatoire');
  const info = db
    .prepare('INSERT INTO task_types (name, countsAsWorked, active, sortOrder) VALUES (?, ?, 1, ?)')
    .run(name.trim(), countsAsWorked ? 1 : 0, Date.now() % 1000000);
  const row = db.prepare('SELECT * FROM task_types WHERE id = ?').get(info.lastInsertRowid);
  sendJson(res, 201, { taskType: row });
});

route('PATCH', '/api/tasktypes/:id', async (req, res, ctx, params, body) => {
  if (!requireAdmin(ctx, res)) return;
  const id = Number(params.id);
  const existing = db.prepare('SELECT * FROM task_types WHERE id = ?').get(id);
  if (!existing) return sendError(res, 404, 'Type de tâche introuvable');
  const updates = [];
  const values = [];
  if (body.name !== undefined) {
    updates.push('name = ?');
    values.push(String(body.name));
  }
  if (body.countsAsWorked !== undefined) {
    updates.push('countsAsWorked = ?');
    values.push(body.countsAsWorked ? 1 : 0);
  }
  if (body.active !== undefined) {
    updates.push('active = ?');
    values.push(body.active ? 1 : 0);
  }
  if (!updates.length) return sendError(res, 400, 'Aucun champ à mettre à jour');
  values.push(id);
  db.prepare(`UPDATE task_types SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const row = db.prepare('SELECT * FROM task_types WHERE id = ?').get(id);
  sendJson(res, 200, { taskType: row });
});

route('DELETE', '/api/tasktypes/:id', async (req, res, ctx, params) => {
  if (!requireAdmin(ctx, res)) return;
  const id = Number(params.id);
  const inUse = db.prepare('SELECT COUNT(*) as c FROM time_entries WHERE taskTypeId = ?').get(id);
  if (inUse.c > 0) {
    // Soft-delete instead of breaking historical entries.
    db.prepare('UPDATE task_types SET active = 0 WHERE id = ?').run(id);
    return sendJson(res, 200, { ok: true, softDeleted: true });
  }
  db.prepare('DELETE FROM task_types WHERE id = ?').run(id);
  sendJson(res, 200, { ok: true });
});

// ---------- TIME ENTRIES ----------
function serializeEntry(e, ttMap) {
  const tt = ttMap.get(e.taskTypeId);
  return {
    ...e,
    taskTypeName: tt ? tt.name : null,
  };
}

route('GET', '/api/entries', async (req, res, ctx, params, body, query) => {
  if (!requireAuth(ctx, res)) return;
  const ttMap = taskTypeMap();
  const targetUserId = query.userId ? Number(query.userId) : ctx.user.id;
  if (targetUserId !== ctx.user.id && ctx.user.role !== 'admin') {
    return sendError(res, 403, 'Action non permise');
  }
  let sql = 'SELECT * FROM time_entries WHERE userId = ?';
  const args = [targetUserId];
  if (query.from) {
    sql += ' AND date >= ?';
    args.push(query.from);
  }
  if (query.to) {
    sql += ' AND date <= ?';
    args.push(query.to);
  }
  if (query.status) {
    sql += ' AND status = ?';
    args.push(query.status);
  }
  sql += ' ORDER BY date';
  const rows = db.prepare(sql).all(...args);
  sendJson(res, 200, { entries: rows.map((e) => serializeEntry(e, ttMap)) });
});

// An entry is logged either as a shift (start, end, optional unpaid break) or as
// a plain number of hours, which is what a holiday or a sick day looks like.
// When the times are given they decide the hours: computing here rather than
// trusting the client keeps the stored hours and the stored times consistent.
function resolveEntryHours(body, res) {
  const startTime = String(body.startTime || '').trim();
  const endTime = String(body.endTime || '').trim();
  const breakMinutes = Math.max(0, Math.round(Number(body.breakMinutes) || 0));

  if (startTime || endTime) {
    if (!startTime || !endTime) {
      sendError(res, 400, 'Un quart de travail doit avoir une heure de début et une heure de fin');
      return null;
    }
    const h = shiftHours(startTime, endTime, breakMinutes);
    if (h === null) {
      sendError(res, 400, 'Vérifiez les heures : utilisez le format HH:MM, et la pause ne peut pas être aussi longue que le quart');
      return null;
    }
    return { hours: h, startTime, endTime, breakMinutes };
  }

  if (body.hours === undefined) {
    sendError(res, 400, 'Entrez une heure de début et de fin, ou un nombre d’heures');
    return null;
  }
  const h = Number(body.hours);
  if (Number.isNaN(h) || h < 0 || h > 24) {
    sendError(res, 400, 'Les heures doivent être entre 0 et 24');
    return null;
  }
  return { hours: h, startTime: '', endTime: '', breakMinutes: 0 };
}

route('POST', '/api/entries', async (req, res, ctx, params, body) => {
  if (!requireAuth(ctx, res)) return;
  const { date, taskTypeId, notes = '' } = body;
  if (!date) return sendError(res, 400, 'La date est obligatoire');
  const resolved = resolveEntryHours(body, res);
  if (!resolved) return;
  const h = resolved.hours;

  let targetUserId = ctx.user.id;
  if (body.userId !== undefined && ctx.user.role === 'admin') {
    targetUserId = Number(body.userId);
    if (!db.prepare('SELECT id FROM users WHERE id = ?').get(targetUserId)) {
      return sendError(res, 404, 'Utilisateur introuvable');
    }
  }
  // Admin adding/correcting hours on someone else's behalf goes straight to pending for review.
  const status = targetUserId !== ctx.user.id ? 'pending' : 'draft';

  // A day can hold several entries — one per task worked — so posting always
  // creates. It used to update whatever entry already existed on that date,
  // which silently replaced the first task when someone logged a second.
  // Changing an existing entry is PATCH /api/entries/:id.
  const info = db
    .prepare(
      `INSERT INTO time_entries (userId, date, hours, startTime, endTime, breakMinutes, taskTypeId, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      targetUserId, date, h, resolved.startTime, resolved.endTime, resolved.breakMinutes,
      taskTypeId || null, notes, status
    );
  const row = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(info.lastInsertRowid);
  sendJson(res, 201, { entry: serializeEntry(row, taskTypeMap()) });
});

function assertEntryEditable(entry, user, res) {
  if (!entry) {
    sendError(res, 404, 'Entrée introuvable');
    return false;
  }
  if (entry.userId !== user.id && user.role !== 'admin') {
    sendError(res, 403, 'Action non permise');
    return false;
  }
  if (user.role !== 'admin' && !['draft', 'pending'].includes(entry.status)) {
    sendError(res, 409, 'Cette entrée a déjà été révisée et ne peut plus être modifiée');
    return false;
  }
  return true;
}

route('PATCH', '/api/entries/:id', async (req, res, ctx, params, body) => {
  if (!requireAuth(ctx, res)) return;
  const id = Number(params.id);
  const entry = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id);
  if (!assertEntryEditable(entry, ctx.user, res)) return;
  const updates = [];
  const values = [];
  // Times and hours travel together: changing one without the other would leave
  // an entry claiming a shift that doesn't add up to its own hours.
  if (body.startTime !== undefined || body.endTime !== undefined || body.hours !== undefined) {
    const resolved = resolveEntryHours(body, res);
    if (!resolved) return;
    updates.push('hours = ?', 'startTime = ?', 'endTime = ?', 'breakMinutes = ?');
    values.push(resolved.hours, resolved.startTime, resolved.endTime, resolved.breakMinutes);
  }
  if (body.taskTypeId !== undefined) {
    updates.push('taskTypeId = ?');
    values.push(body.taskTypeId);
  }
  if (body.notes !== undefined) {
    updates.push('notes = ?');
    values.push(String(body.notes));
  }
  if (!updates.length) return sendError(res, 400, 'Aucun champ à mettre à jour');
  updates.push("updatedAt = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE time_entries SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const row = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id);
  sendJson(res, 200, { entry: serializeEntry(row, taskTypeMap()) });
});

route('DELETE', '/api/entries/:id', async (req, res, ctx, params) => {
  if (!requireAuth(ctx, res)) return;
  const id = Number(params.id);
  const entry = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id);
  // Same rule as editing: your own entry, while it is still draft or pending.
  // Once reviewed it is part of an approved timesheet, and only an admin may
  // remove it.
  if (!assertEntryEditable(entry, ctx.user, res)) return;

  // Attachment rows cascade, but the uploaded files would otherwise be orphaned
  // on disk with nothing left pointing at them.
  const files = db.prepare('SELECT storedName FROM attachments WHERE timeEntryId = ?').all(id);
  for (const f of files) {
    try {
      fs.unlinkSync(path.join(UPLOADS_DIR, f.storedName));
    } catch (err) {
      if (err.code !== 'ENOENT') console.error('[entries] could not remove attachment:', err.message);
    }
  }

  db.prepare('DELETE FROM time_entries WHERE id = ?').run(id);
  sendJson(res, 200, { ok: true, deleted: id });
});

route('POST', '/api/entries/:id/submit', async (req, res, ctx, params) => {
  if (!requireAuth(ctx, res)) return;
  const id = Number(params.id);
  const entry = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id);
  if (!entry || entry.userId !== ctx.user.id) return sendError(res, 404, 'Entrée introuvable');
  if (entry.status !== 'draft') return sendError(res, 409, 'Seules les entrées en brouillon peuvent être soumises');
  db.prepare("UPDATE time_entries SET status = 'pending', updatedAt = datetime('now') WHERE id = ?").run(id);
  const row = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id);
  sendJson(res, 200, { entry: serializeEntry(row, taskTypeMap()) });
});

route('POST', '/api/entries/:id/attachments', async (req, res, ctx, params, body, query, multipart) => {
  if (!requireAuth(ctx, res)) return;
  const id = Number(params.id);
  const entry = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id);
  if (!assertEntryEditable(entry, ctx.user, res)) return;
  if (!multipart || !multipart.files.length) return sendError(res, 400, 'Aucun fichier téléversé');
  const saved = [];
  for (const file of multipart.files) {
    const storedName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${file.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, storedName), file.data);
    const info = db
      .prepare(
        `INSERT INTO attachments (timeEntryId, filename, storedName, mimeType, size) VALUES (?, ?, ?, ?, ?)`
      )
      .run(id, file.filename, storedName, file.mimeType, file.data.length);
    saved.push(db.prepare('SELECT * FROM attachments WHERE id = ?').get(info.lastInsertRowid));
  }
  sendJson(res, 201, { attachments: saved });
});

route('GET', '/api/entries/:id/attachments', async (req, res, ctx, params) => {
  if (!requireAuth(ctx, res)) return;
  const id = Number(params.id);
  const entry = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id);
  if (!entry) return sendError(res, 404, 'Entrée introuvable');
  if (entry.userId !== ctx.user.id && ctx.user.role !== 'admin') return sendError(res, 403, 'Action non permise');
  const rows = db.prepare('SELECT * FROM attachments WHERE timeEntryId = ?').all(id);
  sendJson(res, 200, { attachments: rows });
});

route('GET', '/api/attachments/:id/download', async (req, res, ctx, params) => {
  if (!requireAuth(ctx, res)) return;
  const id = Number(params.id);
  const att = db.prepare('SELECT * FROM attachments WHERE id = ?').get(id);
  if (!att) return sendError(res, 404, 'Introuvable');
  const entry = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(att.timeEntryId);
  if (!entry || (entry.userId !== ctx.user.id && ctx.user.role !== 'admin')) {
    return sendError(res, 403, 'Action non permise');
  }
  const filePath = path.join(UPLOADS_DIR, att.storedName);
  if (!fs.existsSync(filePath)) return sendError(res, 404, 'Fichier introuvable sur le serveur');
  res.writeHead(200, {
    'Content-Type': att.mimeType || 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${att.filename.replace(/"/g, '')}"`,
  });
  fs.createReadStream(filePath).pipe(res);
});

// ---------- APPROVALS (admin) ----------
route('GET', '/api/approvals', async (req, res, ctx, params, body, query) => {
  if (!requireAdmin(ctx, res)) return;
  const status = query.status || 'pending';
  const ttMap = taskTypeMap();
  const rows = db
    .prepare(
      `SELECT te.*, u.name as userName, u.email as userEmail
       FROM time_entries te JOIN users u ON u.id = te.userId
       WHERE te.status = ? ORDER BY te.date DESC`
    )
    .all(status);
  sendJson(res, 200, { entries: rows.map((e) => serializeEntry(e, ttMap)) });
});

async function reviewEntry(req, res, ctx, params, body, approve) {
  if (!requireAdmin(ctx, res)) return;
  const id = Number(params.id);
  const entry = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id);
  if (!entry) return sendError(res, 404, 'Entrée introuvable');
  if (entry.status !== 'pending') return sendError(res, 409, 'Seules les entrées en attente peuvent être révisées');
  const status = approve ? 'approved' : 'rejected';
  const reason = approve ? '' : String(body?.reason || '');
  db.prepare(
    `UPDATE time_entries SET status = ?, reviewedBy = ?, reviewedAt = datetime('now'), rejectionReason = ?, updatedAt = datetime('now')
     WHERE id = ?`
  ).run(status, ctx.user.id, reason, id);

  const employee = db.prepare('SELECT * FROM users WHERE id = ?').get(entry.userId);
  const settings = getSettings();
  const shouldNotify = approve ? settings.notifyApproval : settings.notifyRejection;
  if (shouldNotify && employee) {
    const statusFr = approve ? 'approuvée' : 'refusée';
    sendMail({
      to: employee.email,
      subject: `Entrée de temps ${statusFr} — ${entry.date}`,
      html: `
        <p>Bonjour ${employee.name},</p>
        <p>Votre entrée de temps du <strong>${entry.date}</strong> (${entry.hours} h) a été <strong>${statusFr}</strong>.</p>
        ${!approve && reason ? `<p>Raison : ${reason}</p>` : ''}
      `,
    }).catch((err) => console.error('[mail] failed to send review email:', err.message));
  }

  const row = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id);
  sendJson(res, 200, { entry: serializeEntry(row, taskTypeMap()) });
}

route('POST', '/api/entries/:id/approve', (req, res, ctx, params, body) => reviewEntry(req, res, ctx, params, body, true));
route('POST', '/api/entries/:id/reject', (req, res, ctx, params, body) => reviewEntry(req, res, ctx, params, body, false));

// ---------- REPORTS (admin) ----------
function resolveReportRange(query, settings) {
  if (query.year) {
    const y = Number(query.year);
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }
  const anchorDate = query.date || new Date().toISOString().slice(0, 10);
  return currentPayCycle(anchorDate, settings.payCycleReferenceDate, settings.payCycleLengthDays);
}

// Shared by the JSON and the PDF report routes, so the on-screen report and the
// exported PDF are always computed from exactly the same numbers.
function buildReport(query, settings) {
  const cycle = resolveReportRange(query, settings);
  const ttMap = taskTypeMap();

  let sql = `SELECT te.*, u.name as userName FROM time_entries te JOIN users u ON u.id = te.userId
             WHERE te.date >= ? AND te.date <= ? AND te.status = 'approved'`;
  const args = [cycle.start, cycle.end];
  if (query.userId) {
    sql += ' AND te.userId = ?';
    args.push(Number(query.userId));
  }
  const entries = db.prepare(sql).all(...args);

  const enriched = entries.map((e) => ({ ...e, countsAsWorked: ttMap.get(e.taskTypeId)?.countsAsWorked ?? 1 }));

  const byEmployee = new Map();
  for (const e of enriched) {
    if (!byEmployee.has(e.userId)) {
      byEmployee.set(e.userId, { userId: e.userId, name: e.userName, entries: [], days: new Set() });
    }
    const bucket = byEmployee.get(e.userId);
    bucket.entries.push(e);
    bucket.days.add(e.date);
  }
  // Per-employee hours for each task type that counts toward worked hours, so the
  // summary shows what the worked total is made of. These columns add up to each
  // employee's total, since a task type that doesn't count as worked contributes
  // to neither. An entry with no task type counts as worked (see `enriched`
  // above), so it gets its own column rather than going missing from the split.
  const hoursByUserTask = new Map(); // "userId:taskTypeId" -> hours
  const taskIdsWithHours = new Set();
  for (const e of enriched) {
    if (!e.countsAsWorked) continue;
    const taskId = e.taskTypeId ?? 'none';
    taskIdsWithHours.add(taskId);
    const key = `${e.userId}:${taskId}`;
    hoursByUserTask.set(key, (hoursByUserTask.get(key) || 0) + e.hours);
  }
  // Current worked task types, plus any retired one that still has hours here.
  const workedTaskColumns = [...ttMap.values()]
    .filter((tt) => tt.countsAsWorked && (tt.active || taskIdsWithHours.has(tt.id)))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((tt) => ({ taskTypeId: tt.id, name: tt.name }));
  if (taskIdsWithHours.has('none')) workedTaskColumns.push({ taskTypeId: 'none', name: '—' });

  // Overtime is per person per week: the weekly threshold applies to one
  // employee's hours, so the headline totals are the sum of each employee's own
  // split. Pooling everyone into one weekly bucket first would turn three people
  // working 40h each into a 120h week and invent 80h of overtime.
  let regular = 0;
  let overtime = 0;
  const employeeSummary = [...byEmployee.values()].map((b) => {
    const split = splitRegularOvertime(b.entries, settings.overtimeWeeklyThreshold);
    regular += split.regular;
    overtime += split.overtime;
    return {
      userId: b.userId,
      name: b.name,
      daysWorked: b.days.size,
      taskHours: Object.fromEntries(
        workedTaskColumns.map((c) => [c.taskTypeId, round1(hoursByUserTask.get(`${b.userId}:${c.taskTypeId}`) || 0)])
      ),
      regularHours: round1(split.regular),
      overtimeHours: round1(split.overtime),
      totalHours: round1(split.regular + split.overtime),
    };
  });

  const byWeek = new Map();
  for (const e of enriched) {
    const wk = require('./utils').isoWeekKey(e.date);
    if (!byWeek.has(wk)) byWeek.set(wk, { week: wk, regular: 0, overtime: 0 });
  }
  for (const emp of byEmployee.values()) {
    const split = splitRegularOvertime(emp.entries, settings.overtimeWeeklyThreshold);
    for (const [wk, total] of split.weeks) {
      const bucket = byWeek.get(wk) || { week: wk, regular: 0, overtime: 0 };
      const reg = Math.min(total, settings.overtimeWeeklyThreshold);
      const ot = Math.max(0, total - settings.overtimeWeeklyThreshold);
      bucket.regular += reg;
      bucket.overtime += ot;
      byWeek.set(wk, bucket);
    }
  }

  const byTask = new Map();
  for (const e of enriched) {
    const tt = ttMap.get(e.taskTypeId);
    const key = tt ? tt.id : 'none';
    if (!byTask.has(key)) byTask.set(key, { taskTypeId: tt ? tt.id : null, name: tt ? tt.name : '—', hours: 0 });
    byTask.get(key).hours += e.hours;
  }
  const taskBreakdown = [...byTask.values()]
    .map((t) => ({ ...t, hours: round1(t.hours) }))
    .sort((a, b) => b.hours - a.hours);

  return {
    cycle,
    totals: {
      totalHours: round1(regular + overtime),
      overtimeHours: round1(overtime),
      employees: byEmployee.size,
      entries: entries.length,
    },
    weeklyDistribution: [...byWeek.values()].sort((a, b) => a.week.localeCompare(b.week)),
    workedTaskColumns,
    employeeSummary,
    taskBreakdown,
  };
}

route('GET', '/api/reports', async (req, res, ctx, params, body, query) => {
  if (!requireAdmin(ctx, res)) return;
  sendJson(res, 200, buildReport(query, getSettings()));
});

function round1(n) {
  return Math.round(n * 10) / 10;
}

route('GET', '/api/reports/csv', async (req, res, ctx, params, body, query) => {
  if (!requireAdmin(ctx, res)) return;
  const settings = getSettings();
  const cycle = resolveReportRange(query, settings);
  const rows = db
    .prepare(
      `SELECT te.date, u.name as employee, te.hours, tt.name as task, te.status
       FROM time_entries te JOIN users u ON u.id = te.userId
       LEFT JOIN task_types tt ON tt.id = te.taskTypeId
       WHERE te.date >= ? AND te.date <= ? ORDER BY u.name, te.date`
    )
    .all(cycle.start, cycle.end);
  const STATUS_FR = { draft: 'Brouillon', pending: 'En attente', approved: 'Approuvée', rejected: 'Refusée' };
  const csv = toCsv(
    rows.map((r) => ({
      Date: r.date,
      Employé: r.employee,
      Heures: r.hours,
      Tâche: r.task,
      Statut: STATUS_FR[r.status] || r.status,
    })),
    ['Date', 'Employé', 'Heures', 'Tâche', 'Statut']
  );
  res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="worktrack-report-${cycle.start}_to_${cycle.end}.csv"`,
  });
  res.end(csv);
});

route('GET', '/api/reports/pdf', async (req, res, ctx, params, body, query) => {
  if (!requireAdmin(ctx, res)) return;
  const settings = getSettings();
  const report = buildReport(query, settings);
  const lang = 'fr';

  const employee = query.userId
    ? db.prepare('SELECT name FROM users WHERE id = ?').get(Number(query.userId))
    : null;
  const rangeLabel = query.year
    ? `${lang === 'fr' ? 'Année' : 'Year'} ${Number(query.year)}`
    : `${report.cycle.start} — ${report.cycle.end}`;

  const pdf = renderReportPdf({
    report,
    companyName: settings.companyName,
    lang,
    rangeLabel,
    employeeName: employee ? employee.name : null,
  });

  const suffix = query.year ? `${Number(query.year)}` : `${report.cycle.start}_to_${report.cycle.end}`;
  res.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Content-Length': pdf.length,
    'Content-Disposition': `attachment; filename="worktrack-report-${suffix}.pdf"`,
  });
  res.end(pdf);
});

// ---------- SETTINGS (admin) ----------
route('GET', '/api/settings', async (req, res, ctx) => {
  if (!requireAuth(ctx, res)) return; // employees need companyName/language display, so read-only for all
  sendJson(res, 200, { settings: getSettings() });
});

route('PATCH', '/api/settings', async (req, res, ctx, params, body) => {
  if (!requireAdmin(ctx, res)) return;
  const fields = [
    'payCycleLengthDays',
    'payCycleReferenceDate',
    'overtimeWeeklyThreshold',
    'notifyNewAccount',
    'notifyApproval',
    'notifyRejection',
    'companyName',
  ];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      updates.push(`${f} = ?`);
      const boolFields = ['notifyNewAccount', 'notifyApproval', 'notifyRejection'];
      values.push(boolFields.includes(f) ? (body[f] ? 1 : 0) : body[f]);
    }
  }
  if (!updates.length) return sendError(res, 400, 'Aucun champ à mettre à jour');
  db.prepare(`UPDATE settings SET ${updates.join(', ')} WHERE id = 1`).run(...values);
  sendJson(res, 200, { settings: getSettings() });
});

route('GET', '/api/pay-cycle-preview', async (req, res, ctx, params, body, query) => {
  if (!requireAuth(ctx, res)) return;
  const refDate = query.referenceDate || getSettings().payCycleReferenceDate;
  const length = Number(query.lengthDays || getSettings().payCycleLengthDays);
  const cycle = currentPayCycle(new Date().toISOString().slice(0, 10), refDate, length);
  sendJson(res, 200, { cycle });
});

// ---------- Dispatcher ----------
async function handleApi(req, res, ctx) {
  const url = new URL(req.url, 'http://internal');
  const pathname = url.pathname;
  const query = Object.fromEntries(url.searchParams.entries());

  for (const r of routes) {
    if (r.method !== req.method) continue;
    const m = r.regex.exec(pathname);
    if (!m) continue;
    const params = {};
    r.paramNames.forEach((name, i) => (params[name] = decodeURIComponent(m[i + 1])));
    try {
      let body = {};
      let multipart = null;
      if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
        const contentType = req.headers['content-type'] || '';
        if (contentType.startsWith('multipart/form-data')) {
          multipart = await readMultipart(req, contentType);
          body = multipart.fields;
        } else {
          body = await readJsonBody(req);
        }
      }
      await r.handler(req, res, ctx, params, body, query, multipart);
    } catch (err) {
      console.error('[api] error handling', req.method, pathname, err);
      if (!res.headersSent) sendError(res, 500, 'Erreur interne du serveur');
    }
    return true;
  }
  return false;
}

module.exports = { handleApi };
