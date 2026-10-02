// WorkTrack Pro — vanilla JS single-page app (no build step, no dependencies).
(function () {
  'use strict';

  const app = document.getElementById('app');
  let state = { user: null, taskTypes: [], settings: null };
  const BASE = window.APP_BASE || '';

  // ---------- i18n ----------
  const I18N = {
    en: {
      nav_myTime: 'My Time', nav_history: 'History', nav_profile: 'Profile',
      nav_approvals: 'Approvals', nav_reports: 'Reports', nav_team: 'Team', nav_tasks: 'Tasks', nav_settings: 'Settings',
      section_employee: 'Employee', section_admin: 'Admin', signOut: 'Sign Out',

      login_email: 'Email', login_password: 'Password', login_signIn: 'Sign In',
      login_forgot: 'Forgot your password?',
      forgot_title: 'Reset your password',
      forgot_sub: 'Enter your email address and we will send you a link to choose a new password.',
      forgot_send: 'Send reset link',
      forgot_sent: 'If that address has an account, a reset link is on its way. It expires in 60 minutes.',
      forgot_back: 'Back to sign in',
      reset_title: 'Choose a new password',
      reset_sub: 'Set a new password for your account.',
      reset_label: 'New password (min 8 characters)',
      reset_confirm: 'Confirm new password',
      reset_mismatch: 'The two passwords do not match.',
      reset_submit: 'Save new password',
      reset_done: 'Your password has been updated. You can sign in now.',

      forcePw_title: 'Set a new password',
      forcePw_sub: 'This is your first login — please choose a new password.',
      forcePw_label: 'New password (min 8 characters)', continue: 'Continue',

      greeting_morning: 'Good morning', greeting_afternoon: 'Good afternoon', greeting_evening: 'Good evening',
      myTime_sub: 'Track your work hours',
      myTime_approvedHours: 'Approved Hours (this month)',
      myTime_newEntries: 'New Hours Entries',
      myTime_submitAll: 'Submit All for Approval',
      submit: 'Submit',
      myTime_noNewEntries: 'No new entries. Click a day on the calendar to log hours.',
      totalToSubmit: 'Total: {hours}h',
      col_date: 'Date', col_hours: 'Hours', col_task: 'Task', col_notes: 'Notes', col_status: 'Status',
      status_draft: 'Draft', status_pending: 'Pending', status_approved: 'Approved', status_rejected: 'Rejected',
      dow: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],

      entry_edit: 'Edit Entry', entry_new: 'New Entry',
      day_title: 'Entries for this day', day_addAnother: '+ Add another task',
      day_total: 'Total: {hours}h', delete_entry: 'Delete',
      confirmDeleteEntry: 'Delete this entry? This cannot be undone.',
      entry_locked: 'This entry is {status} and can no longer be edited.',
      hours: 'Hours', task: 'Task', selectTask: 'Select task', notes: 'Notes', attachments: 'Attachments',
      shiftStart: 'Start', shiftEnd: 'End', breakMinutes: 'Break (min)',
      hoursFromShift: 'Calculated from your start and end times.',
      hoursManual: 'Fill in a start and end time to calculate this automatically.',
      cancel: 'Cancel', saveEntry: 'Save Entry', submitForApproval: 'Submit for Approval',

      history_title: 'History', history_sub: 'View your past timesheet entries',
      allStatus: 'All Status', filter: 'Filter', total: 'Total',
      noEntriesFound: 'No entries found for this filter.',

      profile_title: 'Profile', profile_sub: 'Manage your personal information',
      personalInfo: 'Personal Information', fullName: 'Full Name', email: 'Email',
      emailCannotChange: 'Email cannot be changed', phoneNumber: 'Phone Number',
      address: 'Address', streetAddress: 'Street Address', city: 'City', postalCode: 'Postal Code',
      dateOfBirth: 'Date of Birth',
      preferences: 'Preferences', language: 'Language',
      changePassword: 'Change Password', currentPassword: 'Current Password', newPassword: 'New Password',
      updatePassword: 'Update Password', saveChanges: 'Save Changes', saved: 'Saved.', passwordUpdated: 'Password updated.',

      approvals_title: 'Approvals', approvals_sub: 'Review and approve team timesheets',
      employee: 'Employee', actions: 'Actions', approve: 'Approve', reject: 'Reject',
      noApprovals: 'No {status} approvals',
      rejectPrompt: 'Reason for rejection (optional):',

      reports_title: 'Reports', reports_sub: 'Team timesheet analytics',
      exportCsv: 'Export CSV', exportPdf: 'Export PDF', allEmployees: 'All Employees',
      payCyclePrefix: 'Pay cycle:', totalHours: 'Total Hours', overtime: 'Overtime',
      viewByCycle: 'By Pay Cycle', viewByYear: 'By Year', year: 'Year',
      employees: 'Employees', entries: 'Entries',
      entriesCountHours: '{count} entries · {hours}h', clickToExpand: 'Click to view and edit hours',
      saveHours: 'Save Hours', hoursUpdated: 'Hours updated.', approveAllCycle: 'Approve All for This Pay Cycle',
      addEntry: '+ Add Entry', selectEmployee: 'Select employee',
      weeklyDist: 'Weekly Hours Distribution', employeeSummary: 'Employee Summary',
      hoursByTask: 'Hours by Task', percentOfTotal: '% of Total',
      daysWorked: 'Days Worked', regularHours: 'Regular Hours', totalHoursCol: 'Total Hours',
      noApprovedEntries: 'No approved entries in this pay cycle yet.',
      noApprovedEntriesYear: 'No approved entries in this year yet.',
      noDataPeriod: 'No data for this period.',

      team_title: 'Team', team_sub: 'Manage your team members',
      inviteMember: '+ Invite Member', inactive: 'Inactive', edit: 'Edit',
      inviteModal_title: 'Invite Member', inviteModal_sub: "They'll receive an email with login credentials.",
      role: 'Role', roleEmployee: 'Employee', roleAdmin: 'Admin',
      jobTitle: 'Job Title', department: 'Department', sendInvite: 'Send Invite',
      country: 'Country', employment: 'Employment',
      active: 'Active', save: 'Save',

      tasks_title: 'Tasks', tasks_sub: 'Manage available tasks for timesheets',
      addTask: '+ Add Task', countsTowardWorked: 'Counts toward worked hours',
      doesNotCount: 'Does not count toward worked hours', deactivate: 'Deactivate', activate: 'Activate',
      delete: 'Delete', noTaskTypes: 'No task types yet.', confirmDeleteTask: 'Delete this task type?',
      addTaskModal_title: 'Add Task', editTaskModal_title: 'Edit Task', name: 'Name',

      settings_title: 'Settings', settings_sub: 'Configure pay cycle and app settings',
      payCycle: 'Pay Cycle', payCycleLength: 'Pay Cycle Length (days)',
      weekly7: 'Weekly (7 days)', biweekly14: 'Biweekly (14 days)',
      semimonthly15: 'Semi-monthly (15 days)', fourWeeks28: '4 Weeks (28 days)',
      referenceStartDate: 'Reference Start Date',
      referenceHint: 'The start date of any known pay cycle — used to calculate all future cycles.',
      cyclePreviewPrefix: 'Current pay cycle preview:',
      overtimeWeeklyThreshold: 'Weekly overtime threshold (hours)',
      overtimeHint: 'Hours beyond this in a calendar week count as overtime.',
      notifications: 'Notifications',
      notifyNewAccount: 'Email new employees their account credentials',
      notifyApproval: 'Email employees when an entry is approved',
      notifyRejection: 'Email employees when an entry is rejected',
      company: 'Company', companyName: 'Company Name', saveSettings: 'Save Settings',
    },
    fr: {
      nav_myTime: 'Mes Heures', nav_history: 'Historique', nav_profile: 'Profil',
      nav_approvals: 'Approbations', nav_reports: 'Rapports', nav_team: 'Équipe', nav_tasks: 'Tâches', nav_settings: 'Paramètres',
      section_employee: 'Employé', section_admin: 'Admin', signOut: 'Déconnexion',

      login_email: 'Courriel', login_password: 'Mot de passe', login_signIn: 'Se connecter',
      login_forgot: 'Mot de passe oublié ?',
      forgot_title: 'Réinitialiser votre mot de passe',
      forgot_sub: 'Entrez votre courriel et nous vous enverrons un lien pour choisir un nouveau mot de passe.',
      forgot_send: 'Envoyer le lien',
      forgot_sent: "Si un compte existe pour cette adresse, un lien vient d'être envoyé. Il expire dans 60 minutes.",
      forgot_back: 'Retour à la connexion',
      reset_title: 'Choisir un nouveau mot de passe',
      reset_sub: 'Définissez un nouveau mot de passe pour votre compte.',
      reset_label: 'Nouveau mot de passe (min. 8 caractères)',
      reset_confirm: 'Confirmer le nouveau mot de passe',
      reset_mismatch: 'Les deux mots de passe ne correspondent pas.',
      reset_submit: 'Enregistrer le mot de passe',
      reset_done: 'Votre mot de passe a été mis à jour. Vous pouvez maintenant vous connecter.',

      forcePw_title: 'Définir un nouveau mot de passe',
      forcePw_sub: 'Ceci est votre première connexion — veuillez choisir un nouveau mot de passe.',
      forcePw_label: 'Nouveau mot de passe (8 caractères min.)', continue: 'Continuer',

      greeting_morning: 'Bonjour', greeting_afternoon: 'Bon après-midi', greeting_evening: 'Bonsoir',
      myTime_sub: 'Suivez vos heures de travail',
      myTime_approvedHours: 'Heures approuvées (ce mois-ci)',
      myTime_newEntries: "Nouvelles entrées d'heures",
      myTime_submitAll: 'Tout soumettre pour approbation',
      submit: 'Soumettre',
      myTime_noNewEntries: "Aucune nouvelle entrée. Cliquez sur un jour du calendrier pour enregistrer des heures.",
      totalToSubmit: 'Total : {hours}h',
      col_date: 'Date', col_hours: 'Heures', col_task: 'Tâche', col_notes: 'Notes', col_status: 'Statut',
      status_draft: 'Brouillon', status_pending: 'En attente', status_approved: 'Approuvé', status_rejected: 'Refusé',
      dow: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],

      entry_edit: "Modifier l'entrée", entry_new: 'Nouvelle entrée',
      day_title: 'Entrées de la journée', day_addAnother: '+ Ajouter une autre tâche',
      day_total: 'Total : {hours}h', delete_entry: 'Supprimer',
      confirmDeleteEntry: 'Supprimer cette entrée ? Cette action est irréversible.',
      entry_locked: 'Cette entrée est {status} et ne peut plus être modifiée.',
      hours: 'Heures', task: 'Tâche', selectTask: 'Choisir une tâche', notes: 'Notes', attachments: 'Pièces jointes',
      shiftStart: 'Début', shiftEnd: 'Fin', breakMinutes: 'Pause (min)',
      hoursFromShift: 'Calculé à partir de vos heures de début et de fin.',
      hoursManual: 'Entrez une heure de début et de fin pour le calcul automatique.',
      cancel: 'Annuler', saveEntry: "Enregistrer l'entrée", submitForApproval: 'Soumettre pour approbation',

      history_title: 'Historique', history_sub: 'Consultez vos entrées de temps passées',
      allStatus: 'Tous les statuts', filter: 'Filtrer', total: 'Total',
      noEntriesFound: 'Aucune entrée trouvée pour ce filtre.',

      profile_title: 'Profil', profile_sub: 'Gérez vos informations personnelles',
      personalInfo: 'Informations personnelles', fullName: 'Nom complet', email: 'Courriel',
      emailCannotChange: 'Le courriel ne peut pas être modifié', phoneNumber: 'Numéro de téléphone',
      address: 'Adresse', streetAddress: 'Adresse municipale', city: 'Ville', postalCode: 'Code postal',
      dateOfBirth: 'Date de naissance',
      preferences: 'Préférences', language: 'Langue',
      changePassword: 'Changer le mot de passe', currentPassword: 'Mot de passe actuel', newPassword: 'Nouveau mot de passe',
      updatePassword: 'Mettre à jour le mot de passe', saveChanges: 'Enregistrer les modifications',
      saved: 'Enregistré.', passwordUpdated: 'Mot de passe mis à jour.',

      approvals_title: 'Approbations', approvals_sub: "Vérifiez et approuvez les feuilles de temps de l'équipe",
      employee: 'Employé', actions: 'Actions', approve: 'Approuver', reject: 'Refuser',
      noApprovals: 'Aucune approbation {status}',
      rejectPrompt: 'Motif du refus (facultatif) :',

      reports_title: 'Rapports', reports_sub: "Analyses des feuilles de temps de l'équipe",
      exportCsv: 'Exporter en CSV', exportPdf: 'Exporter en PDF', allEmployees: 'Tous les employés',
      payCyclePrefix: 'Cycle de paie :', totalHours: 'Total des heures', overtime: 'Heures supplémentaires',
      viewByCycle: 'Par cycle de paie', viewByYear: 'Par année', year: 'Année',
      employees: 'Employés', entries: 'Entrées',
      entriesCountHours: '{count} entrées · {hours}h', clickToExpand: 'Cliquez pour voir et modifier les heures',
      saveHours: 'Enregistrer les heures', hoursUpdated: 'Heures mises à jour.', approveAllCycle: 'Tout approuver pour ce cycle de paie',
      addEntry: '+ Ajouter une entrée', selectEmployee: 'Choisir un employé',
      weeklyDist: 'Répartition hebdomadaire des heures', employeeSummary: 'Résumé par employé',
      hoursByTask: 'Heures par tâche', percentOfTotal: '% du total',
      daysWorked: 'Jours travaillés', regularHours: 'Heures régulières', totalHoursCol: 'Total des heures',
      noApprovedEntries: 'Aucune entrée approuvée dans ce cycle de paie pour l’instant.',
      noApprovedEntriesYear: 'Aucune entrée approuvée pour cette année.',
      noDataPeriod: 'Aucune donnée pour cette période.',

      team_title: 'Équipe', team_sub: 'Gérez les membres de votre équipe',
      inviteMember: '+ Inviter un membre', inactive: 'Inactif', edit: 'Modifier',
      inviteModal_title: 'Inviter un membre', inviteModal_sub: 'Ils recevront un courriel avec leurs identifiants de connexion.',
      role: 'Rôle', roleEmployee: 'Employé', roleAdmin: 'Admin',
      jobTitle: 'Titre du poste', department: 'Département', sendInvite: "Envoyer l'invitation",
      country: 'Pays', employment: 'Emploi',
      active: 'Actif', save: 'Enregistrer',

      tasks_title: 'Tâches', tasks_sub: 'Gérez les tâches disponibles pour les feuilles de temps',
      addTask: '+ Ajouter une tâche', countsTowardWorked: 'Compte dans les heures travaillées',
      doesNotCount: 'Ne compte pas dans les heures travaillées', deactivate: 'Désactiver', activate: 'Activer',
      delete: 'Supprimer', noTaskTypes: 'Aucun type de tâche pour l’instant.', confirmDeleteTask: 'Supprimer ce type de tâche ?',
      addTaskModal_title: 'Ajouter une tâche', editTaskModal_title: 'Modifier la tâche', name: 'Nom',

      settings_title: 'Paramètres', settings_sub: 'Configurez le cycle de paie et les paramètres de l’application',
      payCycle: 'Cycle de paie', payCycleLength: 'Durée du cycle de paie (jours)',
      weekly7: 'Hebdomadaire (7 jours)', biweekly14: 'Aux deux semaines (14 jours)',
      semimonthly15: 'Bimensuel (15 jours)', fourWeeks28: '4 semaines (28 jours)',
      referenceStartDate: 'Date de référence',
      referenceHint: 'La date de début d’un cycle de paie connu — utilisée pour calculer tous les cycles futurs.',
      cyclePreviewPrefix: 'Aperçu du cycle de paie actuel :',
      overtimeWeeklyThreshold: 'Seuil hebdomadaire des heures supplémentaires (heures)',
      overtimeHint: 'Les heures au-delà de ce seuil dans une semaine civile comptent comme heures supplémentaires.',
      notifications: 'Notifications',
      notifyNewAccount: 'Envoyer par courriel leurs identifiants aux nouveaux employés',
      notifyApproval: 'Envoyer un courriel aux employés lorsqu’une entrée est approuvée',
      notifyRejection: 'Envoyer un courriel aux employés lorsqu’une entrée est refusée',
      company: 'Entreprise', companyName: 'Nom de l’entreprise', saveSettings: 'Enregistrer les paramètres',
    },
  };
  function curLang() { return state.user && state.user.language === 'Français' ? 'fr' : 'en'; }
  function curLocale() { return curLang() === 'fr' ? 'fr-FR' : 'en-US'; }
  function t(key, vars) {
    let s = (I18N[curLang()] && I18N[curLang()][key]) || I18N.en[key] || key;
    if (vars) for (const k in vars) s = s.replace(`{${k}}`, vars[k]);
    return s;
  }

  // ---------- API helper ----------
  async function api(path, { method = 'GET', body, isForm } = {}) {
    const opts = { method, headers: {}, credentials: 'same-origin' };
    if (body && !isForm) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    } else if (isForm) {
      opts.body = body; // FormData
    }
    const res = await fetch(BASE + path, opts);
    let data = null;
    try { data = await res.json(); } catch (e) { /* no body */ }
    if (!res.ok) {
      throw new Error((data && data.error) || `Request failed (${res.status})`);
    }
    return data;
  }

  function h(strings, ...vals) {
    return strings.reduce((acc, s, i) => acc + s + (vals[i] !== undefined ? esc(vals[i]) : ''), '');
  }
  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function fmtDate(d) { return d.toISOString().slice(0, 10); }
  function todayStr() { return fmtDate(new Date()); }
  function statusBadge(status) {
    return `<span class="badge badge-${status}">${t('status_' + status)}</span>`;
  }

  // ---------- Router ----------
  const routes = {
    '': viewMyTime,
    '#/my-time': viewMyTime,
    '#/history': viewHistory,
    '#/profile': viewProfile,
    '#/approvals': viewApprovals,
    '#/reports': viewReports,
    '#/team': viewTeam,
    '#/tasks': viewTasks,
    '#/settings': viewSettings,
  };

  // "#/reset?token=..." — the token rides in the fragment, which browsers never
  // send to the server, so it stays out of access logs and Referer headers.
  function hashRoute() {
    const raw = location.hash.replace(/^#/, '');
    const q = raw.indexOf('?');
    if (q === -1) return { path: raw, params: new URLSearchParams() };
    return { path: raw.slice(0, q), params: new URLSearchParams(raw.slice(q + 1)) };
  }

  async function boot() {
    const { path, params } = hashRoute();
    if (path === '/reset' && params.get('token')) {
      return renderResetPassword(params.get('token'));
    }
    try {
      const { user } = await api('/api/me');
      state.user = user;
    } catch (e) {
      state.user = null;
    }
    if (!state.user) return renderLogin();
    if (state.user.mustChangePassword) return renderForcePasswordChange();
    try {
      const [tt, st] = await Promise.all([api('/api/tasktypes'), api('/api/settings')]);
      state.taskTypes = tt.taskTypes;
      state.settings = st.settings;
    } catch (e) { /* non-fatal */ }
    route();
  }

  // Registered once for the app's lifetime. Inside boot() it would be added again
  // on every sign-in, and it would leave the emailed reset link dead in a tab that
  // is already open and signed out, where following the link only changes the
  // fragment and never reloads the page.
  window.addEventListener('hashchange', () => {
    const { path, params } = hashRoute();
    if (path === '/reset' && params.get('token')) return renderResetPassword(params.get('token'));
    if (state.user && !state.user.mustChangePassword) route();
  });

  // Each role is sent to its own home when it follows a link belonging to the
  // other: an admin at My Time goes to Approvals, an employee at Reports goes to
  // My Time. This is presentation only — it keeps a bookmark or a stale link from
  // rendering a screen full of failed requests. The actual enforcement is
  // requireAdmin on the server, which answers 403 whatever the client does.
  const EMPLOYEE_ONLY = ['', '#/my-time', '#/history'];
  const ADMIN_ONLY = ['#/approvals', '#/reports', '#/team', '#/tasks', '#/settings'];

  function route() {
    const isAdmin = state.user && state.user.role === 'admin';
    if (isAdmin && EMPLOYEE_ONLY.includes(location.hash)) return navigate('#/approvals');
    if (!isAdmin && ADMIN_ONLY.includes(location.hash)) return navigate('#/my-time');
    const view = routes[location.hash] || (isAdmin ? viewApprovals : viewMyTime);
    view();
  }

  function navigate(hash) { location.hash = hash; }

  // ---------- Shell / Layout ----------
  function layout(activeHash, title, sub, contentHtml) {
    const u = state.user;
    const isAdmin = u.role === 'admin';
    // Admins don't log their own hours, so the timesheet views aren't theirs.
    // Profile stays — they still need it for contact details and their password.
    const employeeLinks = isAdmin
      ? [['#/profile', t('nav_profile')]]
      : [
          ['#/my-time', t('nav_myTime')],
          ['#/history', t('nav_history')],
          ['#/profile', t('nav_profile')],
        ];
    const adminLinks = [
      ['#/approvals', t('nav_approvals')],
      ['#/reports', t('nav_reports')],
      ['#/team', t('nav_team')],
      ['#/tasks', t('nav_tasks')],
      ['#/settings', t('nav_settings')],
    ];
    function navHtml(links) {
      return links
        .map(([hash, label]) => `<a href="${hash}" class="${activeHash === hash ? 'active' : ''}">${label}</a>`)
        .join('');
    }
    // On a phone the admin links collapse behind this button, so it names the
    // admin page you're on — otherwise the collapsed menu hides where you are.
    const activeAdmin = adminLinks.find(([hash]) => hash === activeHash);
    const adminMenuLabel = activeAdmin ? activeAdmin[1] : t('section_admin');
    app.innerHTML = `
      <div class="layout">
        <div class="sidebar">
          <div class="brand"><img src="${BASE}/img/logo.png" alt="Construction BoisLou" /></div>
          ${isAdmin ? '' : `<div class="section-label">${t('section_employee')}</div>`}
          <nav>${navHtml(employeeLinks)}</nav>
          ${isAdmin ? `
            <div class="section-label">${t('section_admin')}</div>
            <button class="admin-toggle" id="adminMenuBtn" aria-expanded="false" aria-controls="adminNav">
              <span class="hamburger" aria-hidden="true"></span>${esc(adminMenuLabel)}
            </button>
            <nav id="adminNav" class="admin-nav">${navHtml(adminLinks)}</nav>
          ` : ''}
          <div class="footer">
            <div class="user-name">${esc(u.name)}</div>
            <div class="user-email">${esc(u.email)}</div>
            <button class="signout" id="signOutBtn">${t('signOut')}</button>
          </div>
        </div>
        <div class="main">
          <h1 class="page-title">${esc(title)}</h1>
          <p class="page-sub">${esc(sub)}</p>
          <div id="viewContent">${contentHtml}</div>
        </div>
      </div>
    `;
    document.getElementById('signOutBtn').onclick = async () => {
      await api('/api/logout', { method: 'POST' });
      state.user = null;
      renderLogin();
    };
    const adminMenuBtn = document.getElementById('adminMenuBtn');
    if (adminMenuBtn) {
      adminMenuBtn.onclick = () => {
        // Picking a link re-renders the shell, which closes the menu on its own.
        const open = document.getElementById('adminNav').classList.toggle('open');
        adminMenuBtn.setAttribute('aria-expanded', String(open));
        adminMenuBtn.classList.toggle('open', open);
      };
    }
  }

  // ---------- Login ----------
  function renderLogin() {
    app.innerHTML = `
      <div class="login-wrap">
        <div class="login-card">
          <img class="login-logo" src="${BASE}/img/logo.png" alt="Construction BoisLou" />
          <form id="loginForm">
            <div class="field">
              <label>${t('login_email')}</label>
              <input type="email" id="loginEmail" required autofocus />
            </div>
            <div class="field">
              <label>${t('login_password')}</label>
              <input type="password" id="loginPassword" required />
            </div>
            <button class="btn btn-primary" style="width:100%" type="submit">${t('login_signIn')}</button>
            <div class="error-text" id="loginError"></div>
          </form>
          <button class="link-btn" id="forgotLink">${t('login_forgot')}</button>
        </div>
      </div>
    `;
    document.getElementById('forgotLink').onclick = renderForgotPassword;
    document.getElementById('loginForm').onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      try {
        const { user } = await api('/api/login', { method: 'POST', body: { email, password } });
        state.user = user;
        boot();
      } catch (err) {
        document.getElementById('loginError').textContent = err.message;
      }
    };
  }

  function renderForgotPassword() {
    app.innerHTML = `
      <div class="login-wrap">
        <div class="login-card">
          <h1>${t('forgot_title')}</h1>
          <p class="page-sub" style="margin-bottom:16px">${t('forgot_sub')}</p>
          <form id="forgotForm">
            <div class="field">
              <label>${t('login_email')}</label>
              <input type="email" id="forgotEmail" required autofocus />
            </div>
            <button class="btn btn-primary" style="width:100%" type="submit">${t('forgot_send')}</button>
            <div class="success-text" id="forgotMsg"></div>
          </form>
          <button class="link-btn" id="backToLogin">${t('forgot_back')}</button>
        </div>
      </div>
    `;
    document.getElementById('backToLogin').onclick = renderLogin;
    document.getElementById('forgotForm').onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('forgotEmail').value.trim();
      try {
        await api('/api/forgot-password', { method: 'POST', body: { email } });
      } catch (err) { /* the endpoint answers the same either way; so does the UI */ }
      // Always the same confirmation, so this screen can't reveal who has an account.
      document.getElementById('forgotForm').reset();
      document.getElementById('forgotMsg').textContent = t('forgot_sent');
    };
  }

  function renderResetPassword(token) {
    app.innerHTML = `
      <div class="login-wrap">
        <div class="login-card">
          <h1>${t('reset_title')}</h1>
          <p class="page-sub" style="margin-bottom:16px">${t('reset_sub')}</p>
          <form id="resetForm">
            <div class="field">
              <label>${t('reset_label')}</label>
              <input type="password" id="resetPw" minlength="8" required autofocus />
            </div>
            <div class="field">
              <label>${t('reset_confirm')}</label>
              <input type="password" id="resetPw2" minlength="8" required />
            </div>
            <button class="btn btn-primary" style="width:100%" type="submit">${t('reset_submit')}</button>
            <div class="error-text" id="resetError"></div>
          </form>
        </div>
      </div>
    `;
    document.getElementById('resetForm').onsubmit = async (e) => {
      e.preventDefault();
      const password = document.getElementById('resetPw').value;
      const confirm = document.getElementById('resetPw2').value;
      const error = document.getElementById('resetError');
      error.textContent = '';
      if (password !== confirm) {
        error.textContent = t('reset_mismatch');
        return;
      }
      try {
        await api('/api/reset-password', { method: 'POST', body: { token, password } });
      } catch (err) {
        error.textContent = err.message;
        return;
      }
      // Drop the spent token out of the URL so a refresh doesn't reopen this form.
      history.replaceState(null, '', location.pathname + location.search);
      renderLogin();
      document.getElementById('loginError').className = 'success-text';
      document.getElementById('loginError').textContent = t('reset_done');
    };
  }

  function renderForcePasswordChange() {
    app.innerHTML = `
      <div class="login-wrap">
        <div class="login-card">
          <h1>${t('forcePw_title')}</h1>
          <p class="page-sub" style="margin-bottom:16px">${t('forcePw_sub')}</p>
          <form id="pwForm">
            <div class="field">
              <label>${t('forcePw_label')}</label>
              <input type="password" id="newPw" minlength="8" required />
            </div>
            <div class="field">
              <label>${t('reset_confirm')}</label>
              <input type="password" id="newPw2" minlength="8" required />
            </div>
            <button class="btn btn-primary" style="width:100%" type="submit">${t('continue')}</button>
            <div class="error-text" id="pwError"></div>
          </form>
        </div>
      </div>
    `;
    document.getElementById('pwForm').onsubmit = async (e) => {
      e.preventDefault();
      const newPassword = document.getElementById('newPw').value;
      // Without this, a single typo in a field you can't read sets a password
      // nobody knows, and the account is locked out on the spot.
      if (newPassword !== document.getElementById('newPw2').value) {
        document.getElementById('pwError').textContent = t('reset_mismatch');
        return;
      }
      try {
        await api('/api/change-password', { method: 'POST', body: { newPassword } });
        state.user.mustChangePassword = false;
        boot();
      } catch (err) {
        document.getElementById('pwError').textContent = err.message;
      }
    };
  }

  // ---------- My Time ----------
  let myTimeMonth = new Date(); // first-of-month anchor
  let reportAnchorDate = todayStr(); // any date within the pay cycle currently shown in Reports
  let reportYear = new Date().getFullYear(); // year shown when Reports is in "year" view mode
  async function viewMyTime() {
    myTimeMonth.setDate(1);
    const year = myTimeMonth.getFullYear();
    const month = myTimeMonth.getMonth();
    const from = fmtDate(new Date(year, month, 1));
    const to = fmtDate(new Date(year, month + 1, 0));
    let entries = [];
    try {
      const r = await api(`/api/entries?from=${from}&to=${to}`);
      entries = r.entries;
    } catch (e) { /* ignore */ }
    // A date can hold several entries, one per task worked that day.
    const entriesByDate = {};
    for (const e of entries) (entriesByDate[e.date] = entriesByDate[e.date] || []).push(e);
    const totalHours = entries.filter((e) => e.status === 'approved').reduce((a, e) => a + e.hours, 0);
    const draftEntries = entries.filter((e) => e.status === 'draft').sort((a, b) => a.date.localeCompare(b.date));

    layout('#/my-time', `${t(greetingKey())}, ${state.user.name.split(' ')[0]}`, t('myTime_sub'), `
      <div class="stat-row">
        <div class="stat-tile"><div class="label">${t('myTime_approvedHours')}</div><div class="value">${totalHours.toFixed(1)}h</div></div>
      </div>
      <div class="calendar">
        <div class="calendar-header">
          <button class="btn btn-secondary btn-sm" id="prevMonth">&larr;</button>
          <strong>${myTimeMonth.toLocaleString(curLocale(), { month: 'long', year: 'numeric' })}</strong>
          <button class="btn btn-secondary btn-sm" id="nextMonth">&rarr;</button>
        </div>
        <div class="calendar-grid">
          ${t('dow').map((d) => `<div class="dow">${d}</div>`).join('')}
          ${renderCalendarCells(year, month, entriesByDate)}
        </div>
      </div>
      <div class="legend">
        <span><span class="swatch" style="background:var(--draft-bg)"></span>${t('status_draft')}</span>
        <span><span class="swatch" style="background:#fef3c7"></span>${t('status_pending')}</span>
        <span><span class="swatch" style="background:#dcfce7"></span>${t('status_approved')}</span>
        <span><span class="swatch" style="background:#fee2e2"></span>${t('status_rejected')}</span>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="toolbar" style="margin-bottom:${draftEntries.length ? '12px' : '0'}">
          <h3 style="margin:0">${t('myTime_newEntries')}</h3>
          ${draftEntries.length ? `<span class="hint" style="margin:0">${t('totalToSubmit', { hours: draftEntries.reduce((a, e) => a + e.hours, 0).toFixed(1) })}</span>` : ''}
          ${draftEntries.length ? `<button class="btn btn-success btn-sm" style="margin-left:auto" id="submitAllEntries">${t('myTime_submitAll')}</button>` : ''}
        </div>
        ${draftEntries.length
          ? `<table><thead><tr><th>${t('col_date')}</th><th>${t('col_hours')}</th><th>${t('col_task')}</th><th>${t('col_notes')}</th><th></th></tr></thead>
             <tbody>${draftEntries.map((e) => `<tr>
               <td>${e.date}</td><td>${e.hours}h</td><td>${esc(e.taskTypeName || '—')}</td><td>${esc(e.notes || '')}</td>
               <td><button class="btn btn-success btn-sm" data-submit-entry="${e.id}">${t('submit')}</button></td>
             </tr>`).join('')}</tbody></table>`
          : `<div class="empty-state">${t('myTime_noNewEntries')}</div>`}
      </div>
    `);

    document.getElementById('prevMonth').onclick = () => { myTimeMonth.setMonth(myTimeMonth.getMonth() - 1); viewMyTime(); };
    document.getElementById('nextMonth').onclick = () => { myTimeMonth.setMonth(myTimeMonth.getMonth() + 1); viewMyTime(); };
    document.querySelectorAll('.calendar-cell[data-date]').forEach((cell) => {
      cell.onclick = () => {
        const date = cell.getAttribute('data-date');
        const dayEntries = entriesByDate[date] || [];
        // Straight to a blank entry on an empty day; otherwise the day sheet,
        // so an existing entry is never silently replaced by a new one.
        if (dayEntries.length === 0) openEntryModal(date);
        else openDayModal(date, dayEntries);
      };
    });
    document.querySelectorAll('[data-submit-entry]').forEach((btn) => {
      btn.onclick = async () => {
        await api(`/api/entries/${btn.getAttribute('data-submit-entry')}/submit`, { method: 'POST' });
        viewMyTime();
      };
    });
    const submitAllBtn = document.getElementById('submitAllEntries');
    if (submitAllBtn) {
      submitAllBtn.onclick = async () => {
        for (const e of draftEntries) {
          await api(`/api/entries/${e.id}/submit`, { method: 'POST' });
        }
        viewMyTime();
      };
    }
  }

  function greetingKey() {
    const h = new Date().getHours();
    return h < 12 ? 'greeting_morning' : h < 18 ? 'greeting_afternoon' : 'greeting_evening';
  }

  function renderCalendarCells(year, month, entriesByDate) {
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = todayStr();
    let cells = '';
    for (let i = 0; i < firstDow; i++) cells += `<div class="calendar-cell muted"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = fmtDate(new Date(year, month, d));
      const dayEntries = entriesByDate[dateStr] || [];
      const isToday = dateStr === today ? ' today' : '';
      // Cap the pills so a busy day cannot stretch the grid out of shape.
      const shown = dayEntries.slice(0, 2);
      const hidden = dayEntries.length - shown.length;
      cells += `<div class="calendar-cell${isToday}" data-date="${dateStr}">
        <div class="date-num">${d}</div>
        ${shown.map((e) => `<div class="entry-pill badge-${e.status}" title="${esc(e.taskTypeName || '')}">${e.hours}h</div>`).join('')}
        ${hidden > 0 ? `<div class="entry-more">+${hidden}</div>` : ''}
      </div>`;
    }
    return cells;
  }

  function taskTypeOptions(selectedId) {
    return state.taskTypes
      .filter((t) => t.active || t.id === selectedId)
      .map((tt) => `<option value="${tt.id}" ${tt.id === selectedId ? 'selected' : ''}>${esc(tt.name)}</option>`)
      .join('');
  }

  // The day sheet: everything logged on one date, so a second task is added
  // alongside the first rather than on top of it.
  function openDayModal(dateStr, dayEntries) {
    const modalRoot = document.createElement('div');
    modalRoot.className = 'modal-backdrop';
    const total = dayEntries.reduce((sum, e) => sum + e.hours, 0);
    modalRoot.innerHTML = `
      <div class="modal">
        <h3>${t('day_title')}</h3>
        <div class="sub">${new Date(dateStr + 'T00:00:00').toLocaleDateString(curLocale(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        <div class="day-entries">
          ${dayEntries.map((e) => {
            const editable = ['draft', 'pending'].includes(e.status) || state.user.role === 'admin';
            return `
            <div class="day-entry">
              <div class="day-entry-main">
                <strong>${e.hours}h</strong> ${esc(e.taskTypeName || '—')} ${statusBadge(e.status)}
                <div class="hint">
                  ${e.startTime && e.endTime ? `${esc(e.startTime)}–${esc(e.endTime)}${e.breakMinutes ? ` · ${e.breakMinutes} min` : ''}` : ''}
                  ${e.notes ? esc(e.notes) : ''}
                </div>
              </div>
              <div class="day-entry-actions">
                <button class="btn btn-secondary btn-sm" data-edit-entry="${e.id}">${t('edit')}</button>
                ${editable ? `<button class="btn btn-danger btn-sm" data-delete-entry="${e.id}">${t('delete_entry')}</button>` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>
        <div class="toolbar" style="margin:14px 0 0">
          <strong>${t('day_total', { hours: total.toFixed(1) })}</strong>
          <button class="btn btn-primary btn-sm" style="margin-left:auto" id="dayAddAnother">${t('day_addAnother')}</button>
        </div>
        <div class="error-text" id="dayError"></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="dayClose">${t('cancel')}</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalRoot);
    modalRoot.addEventListener('click', (e) => { if (e.target === modalRoot) modalRoot.remove(); });
    document.getElementById('dayClose').onclick = () => modalRoot.remove();
    document.getElementById('dayAddAnother').onclick = () => {
      modalRoot.remove();
      openEntryModal(dateStr);
    };
    modalRoot.querySelectorAll('[data-edit-entry]').forEach((btn) => {
      btn.onclick = () => {
        const entry = dayEntries.find((e) => e.id === Number(btn.getAttribute('data-edit-entry')));
        modalRoot.remove();
        openEntryModal(dateStr, entry);
      };
    });
    modalRoot.querySelectorAll('[data-delete-entry]').forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm(t('confirmDeleteEntry'))) return;
        try {
          await api(`/api/entries/${btn.getAttribute('data-delete-entry')}`, { method: 'DELETE' });
          modalRoot.remove();
          viewMyTime();
        } catch (err) {
          document.getElementById('dayError').textContent = err.message;
        }
      };
    });
  }

  function openEntryModal(dateStr, entry) {
    const locked = entry && !['draft', 'pending'].includes(entry.status);
    const defaultTaskId = entry ? entry.taskTypeId : (state.taskTypes.find((tt) => tt.active) || {}).id;
    const modalRoot = document.createElement('div');
    modalRoot.className = 'modal-backdrop';
    modalRoot.innerHTML = `
      <div class="modal">
        <h3>${entry ? t('entry_edit') : t('entry_new')}</h3>
        <div class="sub">${new Date(dateStr + 'T00:00:00').toLocaleDateString(curLocale(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        ${locked ? `<p class="hint">${t('entry_locked', { status: t('status_' + entry.status).toLowerCase() })}</p>` : ''}
        <form id="entryForm">
          <div class="row row-compact">
            <div class="col field">
              <label>${t('shiftStart')}</label>
              <input type="time" id="entryStart" value="${entry ? esc(entry.startTime || '') : ''}" ${locked ? 'disabled' : ''} />
            </div>
            <div class="col field">
              <label>${t('shiftEnd')}</label>
              <input type="time" id="entryEnd" value="${entry ? esc(entry.endTime || '') : ''}" ${locked ? 'disabled' : ''} />
            </div>
            <div class="col field">
              <label>${t('breakMinutes')}</label>
              <input type="number" min="0" max="720" step="5" id="entryBreak" value="${entry && entry.breakMinutes ? entry.breakMinutes : 0}" ${locked ? 'disabled' : ''} />
            </div>
          </div>
          <div class="row">
            <div class="col field">
              <label>${t('hours')}</label>
              <input type="number" step="0.25" min="0" max="24" id="entryHours" value="${entry ? entry.hours : 8}" ${locked ? 'disabled' : ''} required />
              <div class="hint" id="entryHoursHint"></div>
            </div>
            <div class="col field">
              <label>${t('task')}</label>
              <select id="entryTask" ${locked ? 'disabled' : ''}>
                ${!defaultTaskId ? `<option value="">${t('selectTask')}</option>` : ''}
                ${taskTypeOptions(defaultTaskId)}
              </select>
            </div>
          </div>
          <div class="field">
            <label>${t('notes')}</label>
            <textarea id="entryNotes" ${locked ? 'disabled' : ''}>${entry ? esc(entry.notes) : ''}</textarea>
          </div>
          <div class="field">
            <label>${t('attachments')}</label>
            <input type="file" id="entryFile" ${locked ? 'disabled' : ''} />
          </div>
          <div class="error-text" id="entryError"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="cancelEntry">${t('cancel')}</button>
            ${!locked ? `<button type="submit" class="btn btn-primary">${t('saveEntry')}</button>` : ''}
            ${entry && entry.status === 'draft' ? `<button type="button" class="btn btn-success" id="submitEntry">${t('submitForApproval')}</button>` : ''}
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modalRoot);
    modalRoot.addEventListener('click', (e) => { if (e.target === modalRoot) modalRoot.remove(); });
    document.getElementById('cancelEntry').onclick = () => modalRoot.remove();

    const startEl = document.getElementById('entryStart');
    const endEl = document.getElementById('entryEnd');
    const breakEl = document.getElementById('entryBreak');
    const hoursEl = document.getElementById('entryHours');
    const hintEl = document.getElementById('entryHoursHint');

    // Preview only. shiftHours() on the server decides what is actually stored,
    // so this never becomes the authority on how long anyone worked.
    function previewShiftHours(start, end, brk) {
      const mins = (v) => {
        const m = /^(\d{1,2}):(\d{2})$/.exec(String(v || '').trim());
        if (!m) return null;
        const h = Number(m[1]);
        const mi = Number(m[2]);
        return h > 23 || mi > 59 ? null : h * 60 + mi;
      };
      const a = mins(start);
      const b = mins(end);
      if (a === null || b === null) return null;
      let span = b - a;
      if (span <= 0) span += 24 * 60;
      const worked = span - Math.max(0, Number(brk) || 0);
      return worked > 0 ? Math.round((worked / 60) * 100) / 100 : null;
    }

    function syncHoursFromShift() {
      const calculated = previewShiftHours(startEl.value, endEl.value, breakEl.value);
      if (calculated === null) {
        // No usable shift: the hours field goes back to being typed by hand,
        // which is how a holiday or a sick day gets logged.
        hoursEl.readOnly = false;
        hintEl.textContent = startEl.value || endEl.value ? '' : t('hoursManual');
      } else {
        hoursEl.value = calculated;
        hoursEl.readOnly = true;
        hintEl.textContent = t('hoursFromShift');
      }
    }

    if (!locked) {
      for (const el of [startEl, endEl, breakEl]) el.oninput = syncHoursFromShift;
      syncHoursFromShift();
    }

    document.getElementById('entryForm').onsubmit = async (e) => {
      e.preventDefault();
      const hours = hoursEl.value;
      const startTime = startEl.value;
      const endTime = endEl.value;
      const breakMinutes = Number(breakEl.value) || 0;
      const taskTypeId = document.getElementById('entryTask').value || null;
      const notes = document.getElementById('entryNotes').value;
      const payload = { date: dateStr, hours, startTime, endTime, breakMinutes, taskTypeId, notes };
      try {
        // Posting always creates now that a day can hold several entries, so an
        // edit has to go to that entry by id or it would add a duplicate.
        const result = entry
          ? await api(`/api/entries/${entry.id}`, { method: 'PATCH', body: payload })
          : await api('/api/entries', { method: 'POST', body: payload });
        const file = document.getElementById('entryFile').files[0];
        if (file) {
          const fd = new FormData();
          fd.append('file', file);
          await api(`/api/entries/${result.entry.id}/attachments`, { method: 'POST', body: fd, isForm: true });
        }
        modalRoot.remove();
        viewMyTime();
      } catch (err) {
        document.getElementById('entryError').textContent = err.message;
      }
    };
    const submitBtn = document.getElementById('submitEntry');
    if (submitBtn) {
      submitBtn.onclick = async () => {
        try {
          await api(`/api/entries/${entry.id}/submit`, { method: 'POST' });
          modalRoot.remove();
          viewMyTime();
        } catch (err) {
          document.getElementById('entryError').textContent = err.message;
        }
      };
    }
  }

  // ---------- History ----------
  async function viewHistory() {
    const expandedCycles = new Set();
    layout('#/history', t('history_title'), t('history_sub'), `
      <div class="toolbar">
        <div class="field" style="margin:0">
          <select id="histStatus">
            <option value="">${t('allStatus')}</option>
            <option value="draft">${t('status_draft')}</option>
            <option value="pending">${t('status_pending')}</option>
            <option value="approved">${t('status_approved')}</option>
            <option value="rejected">${t('status_rejected')}</option>
          </select>
        </div>
        <div style="margin-left:auto" id="histSummary"></div>
      </div>
      <div class="card" id="histTableWrap"></div>
    `);

    function renderCycleTable(entries) {
      return `<table><thead><tr><th>${t('col_date')}</th><th>${t('col_hours')}</th><th>${t('col_task')}</th><th>${t('col_notes')}</th><th>${t('col_status')}</th></tr></thead>
        <tbody>${entries.map((e) => `<tr>
          <td>${e.date}</td><td>${e.hours}h</td><td>${esc(e.taskTypeName || '—')}</td><td>${esc(e.notes || '')}</td><td>${statusBadge(e.status)}</td>
        </tr>`).join('')}</tbody></table>`;
    }

    async function load() {
      const status = document.getElementById('histStatus').value;
      const qs = new URLSearchParams();
      if (status) qs.set('status', status);
      const { entries } = await api(`/api/entries?${qs.toString()}`);
      const total = entries.reduce((a, e) => a + e.hours, 0);
      const approved = entries.filter((e) => e.status === 'approved').reduce((a, e) => a + e.hours, 0);
      document.getElementById('histSummary').innerHTML = `${t('total')}: <strong>${total.toFixed(1)}h</strong> &nbsp; ${t('status_approved')}: <strong>${approved.toFixed(1)}h</strong>`;

      const byCycle = new Map();
      for (const e of entries) {
        const cycle = payCycleFor(e.date);
        const key = `${cycle.start}_${cycle.end}`;
        if (!byCycle.has(key)) byCycle.set(key, { key, cycle, entries: [] });
        byCycle.get(key).entries.push(e);
      }
      const cycles = [...byCycle.values()].sort((a, b) => b.cycle.start.localeCompare(a.cycle.start));

      document.getElementById('histTableWrap').innerHTML = cycles.length
        ? cycles.map(({ key, cycle, entries: cycleEntries }) => {
            const cycleHours = cycleEntries.reduce((a, e) => a + e.hours, 0);
            const expanded = expandedCycles.has(key);
            return `
              <div class="history-cycle">
                <div data-toggle-cycle="${key}" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--border)">
                  <div>
                    <strong>${t('payCyclePrefix')} ${cycle.start} — ${cycle.end}</strong>
                    <div class="hint">${t('entriesCountHours', { count: cycleEntries.length, hours: cycleHours.toFixed(1) })}</div>
                  </div>
                  <div>${expanded ? '&#9662;' : '&#9656;'}</div>
                </div>
                ${expanded ? `<div style="padding:12px 0">${renderCycleTable(cycleEntries.slice().sort((a, b) => a.date.localeCompare(b.date)))}</div>` : ''}
              </div>
            `;
          }).join('')
        : `<div class="empty-state">${t('noEntriesFound')}</div>`;

      document.querySelectorAll('[data-toggle-cycle]').forEach((row) => {
        row.onclick = () => {
          const key = row.getAttribute('data-toggle-cycle');
          if (expandedCycles.has(key)) expandedCycles.delete(key); else expandedCycles.add(key);
          load();
        };
      });
    }
    document.getElementById('histStatus').onchange = load;
    load();
  }

  // ---------- Profile ----------
  async function viewProfile() {
    const u = state.user;
    layout('#/profile', t('profile_title'), t('profile_sub'), `
      <div class="card">
        <h3 style="margin-top:0">${t('personalInfo')}</h3>
        <div class="field"><label>${t('fullName')}</label><input type="text" id="pName" value="${esc(u.name)}" /></div>
        <div class="field"><label>${t('email')}</label><input type="email" value="${esc(u.email)}" disabled />
          <div class="hint">${t('emailCannotChange')}</div></div>
        <div class="field"><label>${t('phoneNumber')}</label><input type="text" id="pPhone" value="${esc(u.phone || '')}" placeholder="+1 (555) 123-4567" /></div>
        <div class="field"><label>${t('dateOfBirth')}</label><input type="date" id="pDob" value="${esc(u.dateOfBirth || '')}" /></div>
      </div>
      <div class="card">
        <h3 style="margin-top:0">${t('address')}</h3>
        <div class="field"><label>${t('streetAddress')}</label><input type="text" id="pStreet" value="${esc(u.street || '')}" /></div>
        <div class="row">
          <div class="col field"><label>${t('city')}</label><input type="text" id="pCity" value="${esc(u.city || '')}" /></div>
          <div class="col field"><label>${t('postalCode')}</label><input type="text" id="pPostal" value="${esc(u.postalCode || '')}" /></div>
        </div>
      </div>
      <div class="card">
        <h3 style="margin-top:0">${t('preferences')}</h3>
        <div class="field"><label>${t('language')}</label>
          <select id="pLang">
            <option value="English" ${u.language === 'English' ? 'selected' : ''}>English</option>
            <option value="Français" ${u.language === 'Français' ? 'selected' : ''}>Français</option>
          </select>
        </div>
      </div>
      <div class="card">
        <h3 style="margin-top:0">${t('changePassword')}</h3>
        <div class="field"><label>${t('currentPassword')}</label><input type="password" id="pCurPw" /></div>
        <div class="field"><label>${t('newPassword')}</label><input type="password" id="pNewPw" /></div>
        <div class="field"><label>${t('reset_confirm')}</label><input type="password" id="pNewPw2" /></div>
        <button class="btn btn-secondary" id="pwChangeBtn">${t('updatePassword')}</button>
        <div class="error-text" id="pwChangeMsg"></div>
      </div>
      <button class="btn btn-primary" id="saveProfile">${t('saveChanges')}</button>
      <div class="error-text" id="profileMsg"></div>
    `);
    document.getElementById('saveProfile').onclick = async () => {
      try {
        const { user } = await api('/api/profile', { method: 'PATCH', body: {
          name: document.getElementById('pName').value,
          phone: document.getElementById('pPhone').value,
          dateOfBirth: document.getElementById('pDob').value,
          street: document.getElementById('pStreet').value,
          city: document.getElementById('pCity').value,
          postalCode: document.getElementById('pPostal').value,
          language: document.getElementById('pLang').value,
        } });
        const languageChanged = state.user.language !== user.language;
        state.user = user;
        if (languageChanged) {
          viewProfile();
          return;
        }
        document.getElementById('profileMsg').style.color = 'var(--success)';
        document.getElementById('profileMsg').textContent = t('saved');
      } catch (err) {
        document.getElementById('profileMsg').style.color = 'var(--danger)';
        document.getElementById('profileMsg').textContent = err.message;
      }
    };
    document.getElementById('pwChangeBtn').onclick = async () => {
      // Same trap as the forced change: mistype this and the old password is
      // already gone, so there is nothing left to get back in with.
      if (document.getElementById('pNewPw').value !== document.getElementById('pNewPw2').value) {
        document.getElementById('pwChangeMsg').style.color = 'var(--danger)';
        document.getElementById('pwChangeMsg').textContent = t('reset_mismatch');
        return;
      }
      try {
        await api('/api/change-password', { method: 'POST', body: {
          currentPassword: document.getElementById('pCurPw').value,
          newPassword: document.getElementById('pNewPw').value,
        } });
        document.getElementById('pwChangeMsg').style.color = 'var(--success)';
        document.getElementById('pwChangeMsg').textContent = t('passwordUpdated');
      } catch (err) {
        document.getElementById('pwChangeMsg').style.color = 'var(--danger)';
        document.getElementById('pwChangeMsg').textContent = err.message;
      }
    };
  }

  // ---------- Approvals (admin) ----------
  function openRejectModal(onConfirm) {
    const modalRoot = document.createElement('div');
    modalRoot.className = 'modal-backdrop';
    modalRoot.innerHTML = `
      <div class="modal">
        <h3>${t('reject')}</h3>
        <div class="field">
          <label>${t('rejectPrompt')}</label>
          <textarea id="rejectReasonInput"></textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="rejectCancel">${t('cancel')}</button>
          <button type="button" class="btn btn-danger" id="rejectConfirm">${t('reject')}</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalRoot);
    modalRoot.addEventListener('click', (e) => { if (e.target === modalRoot) modalRoot.remove(); });
    document.getElementById('rejectCancel').onclick = () => modalRoot.remove();
    document.getElementById('rejectConfirm').onclick = () => {
      const reason = document.getElementById('rejectReasonInput').value;
      modalRoot.remove();
      onConfirm(reason);
    };
  }

  function openAdminAddEntryModal(employees, onDone) {
    const modalRoot = document.createElement('div');
    modalRoot.className = 'modal-backdrop';
    modalRoot.innerHTML = `
      <div class="modal">
        <h3>${t('addEntry')}</h3>
        <form id="adminEntryForm">
          <div class="field">
            <label>${t('employee')}</label>
            <select id="adminEntryUser" required>
              <option value="">${t('selectEmployee')}</option>
              ${employees.map((u) => `<option value="${u.id}">${esc(u.name)}</option>`).join('')}
            </select>
          </div>
          <div class="row">
            <div class="col field">
              <label>${t('col_date')}</label>
              <input type="date" id="adminEntryDate" value="${todayStr()}" required />
            </div>
            <div class="col field">
              <label>${t('hours')}</label>
              <input type="number" step="0.25" min="0" max="24" id="adminEntryHours" value="8" required />
            </div>
          </div>
          <div class="field">
            <label>${t('task')}</label>
            <select id="adminEntryTask">
              ${taskTypeOptions((state.taskTypes.find((tt) => tt.active) || {}).id)}
            </select>
          </div>
          <div class="field">
            <label>${t('notes')}</label>
            <textarea id="adminEntryNotes"></textarea>
          </div>
          <div class="error-text" id="adminEntryError"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="adminEntryCancel">${t('cancel')}</button>
            <button type="submit" class="btn btn-primary">${t('save')}</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modalRoot);
    modalRoot.addEventListener('click', (e) => { if (e.target === modalRoot) modalRoot.remove(); });
    document.getElementById('adminEntryCancel').onclick = () => modalRoot.remove();
    document.getElementById('adminEntryForm').onsubmit = async (e) => {
      e.preventDefault();
      const userId = Number(document.getElementById('adminEntryUser').value);
      if (!userId) {
        document.getElementById('adminEntryError').textContent = t('selectEmployee');
        return;
      }
      const date = document.getElementById('adminEntryDate').value;
      const hours = document.getElementById('adminEntryHours').value;
      const taskTypeId = document.getElementById('adminEntryTask').value || null;
      const notes = document.getElementById('adminEntryNotes').value;
      try {
        await api('/api/entries', { method: 'POST', body: { userId, date, hours, taskTypeId, notes } });
        modalRoot.remove();
        onDone(userId);
      } catch (err) {
        document.getElementById('adminEntryError').textContent = err.message;
      }
    };
  }

  function payCycleFor(dateStr) {
    const settings = state.settings;
    const ref = new Date(`${settings.payCycleReferenceDate}T00:00:00Z`);
    const target = new Date(`${dateStr}T00:00:00Z`);
    const msPerDay = 24 * 60 * 60 * 1000;
    const lengthDays = settings.payCycleLengthDays;
    const cycleIndex = Math.floor((target - ref) / msPerDay / lengthDays);
    const startMs = ref.getTime() + cycleIndex * lengthDays * msPerDay;
    const start = new Date(startMs);
    const end = new Date(startMs + (lengthDays - 1) * msPerDay);
    return { start: fmtDate(start), end: fmtDate(end) };
  }

  async function viewApprovals() {
    const expandedUsers = new Set();
    const { users } = await api('/api/users');
    const employees = users.filter((u) => u.role === 'employee');
    layout('#/approvals', t('approvals_title'), t('approvals_sub'), `
      <div class="toolbar">
        <select id="apStatus">
          <option value="pending">${t('status_pending')}</option>
          <option value="approved">${t('status_approved')}</option>
          <option value="rejected">${t('status_rejected')}</option>
        </select>
        <button class="btn btn-primary btn-sm" style="margin-left:auto" id="apAddEntry">${t('addEntry')}</button>
      </div>
      <div class="card" id="apList"></div>
    `);

    document.getElementById('apAddEntry').onclick = () => {
      openAdminAddEntryModal(employees, (userId) => {
        expandedUsers.add(userId);
        document.getElementById('apStatus').value = 'pending';
        load();
      });
    };

    function renderEntryRow(e, status) {
      return `<tr data-entry-row="${e.id}">
        <td>${e.date}</td>
        <td><input type="number" step="0.25" min="0" max="24" class="entry-hours-input" data-hours="${e.id}" value="${e.hours}" style="width:70px" /></td>
        <td><select class="entry-task-select" data-task="${e.id}">${taskTypeOptions(e.taskTypeId)}</select></td>
        <td><input type="text" class="entry-notes-input" data-notes="${e.id}" value="${esc(e.notes || '')}" /></td>
        <td>${statusBadge(e.status)}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-secondary btn-sm" data-save-entry="${e.id}">${t('save')}</button>
          ${status === 'pending' ? `<button class="btn btn-success btn-sm" data-approve="${e.id}">${t('approve')}</button> <button class="btn btn-danger btn-sm" data-reject="${e.id}">${t('reject')}</button>` : ''}
        </td>
      </tr>`;
    }

    function renderUserGroup(group, status) {
      const byCycle = new Map();
      for (const e of group.entries) {
        const cycle = payCycleFor(e.date);
        const key = `${cycle.start}_${cycle.end}`;
        if (!byCycle.has(key)) byCycle.set(key, { cycle, entries: [] });
        byCycle.get(key).entries.push(e);
      }
      const cycles = [...byCycle.values()].sort((a, b) => b.cycle.start.localeCompare(a.cycle.start));
      return cycles.map(({ cycle, entries: cycleEntries }) => {
        const entries = cycleEntries.slice().sort((a, b) => a.date.localeCompare(b.date));
        return `
        <div style="display:flex; justify-content:space-between; align-items:center; margin:12px 0 6px">
          <div class="hint" style="margin:0">${t('payCyclePrefix')} ${cycle.start} — ${cycle.end}</div>
          ${status === 'pending' ? `<button class="btn btn-success btn-sm" data-approve-cycle="${entries.map((e) => e.id).join(',')}">${t('approveAllCycle')}</button>` : ''}
        </div>
        <table><thead><tr><th>${t('col_date')}</th><th>${t('col_hours')}</th><th>${t('col_task')}</th><th>${t('col_notes')}</th><th>${t('col_status')}</th><th></th></tr></thead>
          <tbody>${entries.map((e) => renderEntryRow(e, status)).join('')}</tbody></table>
      `;
      }).join('');
    }

    async function load() {
      const status = document.getElementById('apStatus').value;
      const { entries } = await api(`/api/approvals?status=${status}`);
      const byUser = new Map();
      for (const e of entries) {
        if (!byUser.has(e.userId)) byUser.set(e.userId, { userId: e.userId, userName: e.userName, entries: [] });
        byUser.get(e.userId).entries.push(e);
      }
      const groups = [...byUser.values()].sort((a, b) => a.userName.localeCompare(b.userName));

      document.getElementById('apList').innerHTML = groups.length
        ? groups.map((g) => {
            const totalHours = g.entries.reduce((a, e) => a + e.hours, 0);
            const expanded = expandedUsers.has(g.userId);
            return `
              <div class="approval-group">
                <div data-toggle-user="${g.userId}" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--border)">
                  <div>
                    <strong>${esc(g.userName)}</strong>
                    <div class="hint">${t('entriesCountHours', { count: g.entries.length, hours: totalHours.toFixed(1) })}</div>
                  </div>
                  <div>${expanded ? '&#9662;' : '&#9656;'}</div>
                </div>
                ${expanded ? `<div style="padding:4px 0 12px">${renderUserGroup(g, status)}</div>` : ''}
              </div>
            `;
          }).join('')
        : `<div class="empty-state">${t('noApprovals', { status: t('status_' + status).toLowerCase() })}</div>`;

      document.querySelectorAll('[data-toggle-user]').forEach((row) => {
        row.onclick = () => {
          const id = Number(row.getAttribute('data-toggle-user'));
          if (expandedUsers.has(id)) expandedUsers.delete(id); else expandedUsers.add(id);
          load();
        };
      });
      document.querySelectorAll('[data-save-entry]').forEach((btn) => {
        btn.onclick = async (ev) => {
          ev.stopPropagation();
          const id = btn.getAttribute('data-save-entry');
          const hours = document.querySelector(`[data-hours="${id}"]`).value;
          const taskTypeId = document.querySelector(`[data-task="${id}"]`).value || null;
          const notes = document.querySelector(`[data-notes="${id}"]`).value;
          await api(`/api/entries/${id}`, { method: 'PATCH', body: { hours, taskTypeId, notes } });
          load();
        };
      });
      document.querySelectorAll('[data-approve]').forEach((btn) => {
        btn.onclick = async (ev) => { ev.stopPropagation(); await api(`/api/entries/${btn.getAttribute('data-approve')}/approve`, { method: 'POST' }); load(); };
      });
      document.querySelectorAll('[data-approve-cycle]').forEach((btn) => {
        btn.onclick = async (ev) => {
          ev.stopPropagation();
          const ids = btn.getAttribute('data-approve-cycle').split(',');
          for (const id of ids) {
            await api(`/api/entries/${id}/approve`, { method: 'POST' });
          }
          load();
        };
      });
      document.querySelectorAll('[data-reject]').forEach((btn) => {
        btn.onclick = (ev) => {
          ev.stopPropagation();
          openRejectModal(async (reason) => {
            await api(`/api/entries/${btn.getAttribute('data-reject')}/reject`, { method: 'POST', body: { reason } });
            load();
          });
        };
      });
    }
    document.getElementById('apStatus').onchange = load;
    load();
  }

  // ---------- Reports (admin) ----------
  async function viewReports() {
    const { users } = await api('/api/users');
    layout('#/reports', t('reports_title'), t('reports_sub'), `
      <div class="toolbar">
        <button class="btn btn-secondary btn-sm" id="rpExport">${t('exportCsv')}</button>
        <button class="btn btn-secondary btn-sm" id="rpExportPdf">${t('exportPdf')}</button>
        <select id="rpEmployee">
          <option value="">${t('allEmployees')}</option>
          ${users.map((u) => `<option value="${u.id}">${esc(u.name)}</option>`).join('')}
        </select>
        <select id="rpViewMode">
          <option value="cycle">${t('viewByCycle')}</option>
          <option value="year">${t('viewByYear')}</option>
        </select>
      </div>
      <div id="rpBody"></div>
    `);
    function reportQuery(userId) {
      const mode = document.getElementById('rpViewMode').value;
      const qs = new URLSearchParams();
      if (mode === 'year') qs.set('year', reportYear);
      else qs.set('date', reportAnchorDate);
      if (userId) qs.set('userId', userId);
      return qs;
    }

    async function load() {
      const userId = document.getElementById('rpEmployee').value;
      const mode = document.getElementById('rpViewMode').value;
      const r = await api(`/api/reports?${reportQuery(userId).toString()}`);
      if (mode === 'cycle') reportAnchorDate = r.cycle.start;
      const rangeLabel = mode === 'year' ? `${t('year')} ${reportYear}` : `${t('payCyclePrefix')} ${r.cycle.start} — ${r.cycle.end}`;
      document.getElementById('rpBody').innerHTML = `
        <div class="toolbar" style="margin-bottom:12px">
          <button class="btn btn-secondary btn-sm" id="rpPrev">&larr;</button>
          <strong>${rangeLabel}</strong>
          <button class="btn btn-secondary btn-sm" id="rpNext">&rarr;</button>
        </div>
        <div class="stat-row">
          <div class="stat-tile"><div class="label">${t('totalHours')}</div><div class="value">${r.totals.totalHours}h</div></div>
          <div class="stat-tile"><div class="label">${t('overtime')}</div><div class="value">${r.totals.overtimeHours}h</div></div>
          <div class="stat-tile"><div class="label">${t('employees')}</div><div class="value">${r.totals.employees}</div></div>
          <div class="stat-tile"><div class="label">${t('entries')}</div><div class="value">${r.totals.entries}</div></div>
        </div>
        <div class="card">
          <h3 style="margin-top:0">${t('weeklyDist')}</h3>
          ${renderBarChart(r.weeklyDistribution.map((w) => ({ label: w.week.replace(/^\d+-/, ''), regular: w.regular, overtime: w.overtime })))}
        </div>
        <div class="card">
          <h3 style="margin-top:0">${t('hoursByTask')}</h3>
          ${(() => {
            const grandTotal = r.taskBreakdown.reduce((a, tk) => a + tk.hours, 0);
            return r.taskBreakdown.length
              ? `<table><thead><tr><th>${t('col_task')}</th><th>${t('col_hours')}</th><th>${t('percentOfTotal')}</th></tr></thead>
                <tbody>${r.taskBreakdown.map((tk) => `<tr><td>${esc(tk.name)}</td><td>${tk.hours}h</td><td>${grandTotal ? Math.round((tk.hours / grandTotal) * 100) : 0}%</td></tr>`).join('')}</tbody></table>`
              : `<div class="empty-state">${t(mode === 'year' ? 'noApprovedEntriesYear' : 'noApprovedEntries')}</div>`;
          })()}
        </div>
        <div class="card">
          <h3 style="margin-top:0">${t('employeeSummary')}</h3>
          ${r.employeeSummary.length ? `<table><thead><tr><th>${t('employee')}</th><th>${t('daysWorked')}</th>${(r.workedTaskColumns || []).map((c) => `<th>${esc(c.name)}</th>`).join('')}<th>${t('regularHours')}</th><th>${t('overtime')}</th><th>${t('totalHoursCol')}</th></tr></thead>
            <tbody>${r.employeeSummary.map((e) => `<tr><td>${esc(e.name)}</td><td>${e.daysWorked}</td>${(r.workedTaskColumns || []).map((c) => `<td>${(e.taskHours || {})[c.taskTypeId] || 0}h</td>`).join('')}<td>${e.regularHours}h</td><td>${e.overtimeHours}h</td><td>${e.totalHours}h</td></tr>`).join('')}</tbody></table>`
            : `<div class="empty-state">${t(mode === 'year' ? 'noApprovedEntriesYear' : 'noApprovedEntries')}</div>`}
        </div>
      `;
      document.getElementById('rpPrev').onclick = () => {
        if (mode === 'year') {
          reportYear -= 1;
        } else {
          const d = new Date(`${r.cycle.start}T00:00:00Z`);
          d.setUTCDate(d.getUTCDate() - 1);
          reportAnchorDate = fmtDate(d);
        }
        load();
      };
      document.getElementById('rpNext').onclick = () => {
        if (mode === 'year') {
          reportYear += 1;
        } else {
          const d = new Date(`${r.cycle.end}T00:00:00Z`);
          d.setUTCDate(d.getUTCDate() + 1);
          reportAnchorDate = fmtDate(d);
        }
        load();
      };
    }
    document.getElementById('rpEmployee').onchange = load;
    document.getElementById('rpViewMode').onchange = load;
    document.getElementById('rpExport').onclick = () => {
      const userId = document.getElementById('rpEmployee').value;
      window.location.href = `${BASE}/api/reports/csv?${reportQuery(userId).toString()}`;
    };
    document.getElementById('rpExportPdf').onclick = () => {
      const userId = document.getElementById('rpEmployee').value;
      window.location.href = `${BASE}/api/reports/pdf?${reportQuery(userId).toString()}`;
    };
    load();
  }

  function renderBarChart(rows) {
    if (!rows.length) return `<div class="empty-state">${t('noDataPeriod')}</div>`;
    const max = Math.max(1, ...rows.map((r) => r.regular + r.overtime));
    return `
      <div class="bar-chart">
        ${rows.map((r) => `
          <div class="bar-group">
            <div class="bars">
              <div class="bar regular" style="height:${(r.regular / max) * 130}px" title="${t('regularHours')} ${r.regular}h"></div>
              <div class="bar overtime" style="height:${(r.overtime / max) * 130}px" title="${t('overtime')} ${r.overtime}h"></div>
            </div>
            <div class="bar-label">${esc(r.label)}</div>
          </div>
        `).join('')}
      </div>
      <div class="legend"><span><span class="swatch" style="background:var(--accent-bright)"></span>${t('regularHours')}</span><span><span class="swatch" style="background:var(--copper)"></span>${t('overtime')}</span></div>
    `;
  }

  // ---------- Team (admin) ----------
  async function viewTeam() {
    const { users } = await api('/api/users');
    layout('#/team', t('team_title'), t('team_sub'), `
      <div class="toolbar" style="justify-content:flex-end">
        <button class="btn btn-primary" id="inviteBtn">${t('inviteMember')}</button>
      </div>
      <div class="card">
        ${users.map((u) => `
          <button class="member-row" data-member="${u.id}">
            <span class="member-main">
              <strong>${esc(u.name)}</strong> <span class="badge badge-${u.role}">${u.role === 'admin' ? t('roleAdmin') : t('roleEmployee')}</span>
              ${!u.active ? `<span class="badge badge-rejected">${t('inactive')}</span>` : ''}
              <span class="hint">${esc(u.email)}${u.jobTitle ? ' · ' + esc(u.jobTitle) : ''}</span>
            </span>
            <span class="member-chevron" aria-hidden="true">›</span>
          </button>
        `).join('')}
      </div>
    `);
    document.getElementById('inviteBtn').onclick = () => openInviteModal();
    // The whole row opens the member: a button rather than a clickable div, so it
    // is reachable by tab and responds to Enter and Space without extra handling.
    document.querySelectorAll('[data-member]').forEach((row) => {
      row.onclick = () => openEditMemberModal(users.find((u) => u.id === Number(row.getAttribute('data-member'))));
    });
  }

  function openInviteModal() {
    const modalRoot = document.createElement('div');
    modalRoot.className = 'modal-backdrop';
    modalRoot.innerHTML = `
      <div class="modal">
        <h3>${t('inviteModal_title')}</h3>
        <div class="sub">${t('inviteModal_sub')}</div>
        <form id="inviteForm">
          <div class="field"><label>${t('fullName')}</label><input type="text" id="ivName" required /></div>
          <div class="field"><label>${t('email')}</label><input type="email" id="ivEmail" required /></div>
          <div class="field"><label>${t('role')}</label>
            <select id="ivRole"><option value="employee">${t('roleEmployee')}</option><option value="admin">${t('roleAdmin')}</option></select>
          </div>
          <div class="field"><label>${t('jobTitle')}</label><input type="text" id="ivJobTitle" /></div>
          <div class="field"><label>${t('department')}</label><input type="text" id="ivDept" /></div>
          <div class="error-text" id="ivError"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="ivCancel">${t('cancel')}</button>
            <button type="submit" class="btn btn-primary">${t('sendInvite')}</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modalRoot);
    document.getElementById('ivCancel').onclick = () => modalRoot.remove();
    document.getElementById('inviteForm').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await api('/api/users', { method: 'POST', body: {
          name: document.getElementById('ivName').value,
          email: document.getElementById('ivEmail').value,
          role: document.getElementById('ivRole').value,
          jobTitle: document.getElementById('ivJobTitle').value,
          department: document.getElementById('ivDept').value,
        } });
        modalRoot.remove();
        viewTeam();
      } catch (err) {
        document.getElementById('ivError').textContent = err.message;
      }
    };
  }

  function openEditMemberModal(u) {
    const modalRoot = document.createElement('div');
    modalRoot.className = 'modal-backdrop';
    modalRoot.innerHTML = `
      <div class="modal">
        <h3>${esc(u.name)}</h3>
        <div class="sub">${esc(u.email)}</div>
        <form id="editForm">
          <div class="form-section">${t('personalInfo')}</div>
          <div class="field"><label>${t('fullName')}</label><input type="text" id="emName" value="${esc(u.name || '')}" required /></div>
          <div class="field"><label>${t('email')}</label><input type="email" value="${esc(u.email)}" disabled />
            <div class="hint">${t('emailCannotChange')}</div></div>
          <div class="field"><label>${t('phoneNumber')}</label><input type="text" id="emPhone" value="${esc(u.phone || '')}" placeholder="+1 (555) 123-4567" /></div>
          <div class="field"><label>${t('dateOfBirth')}</label><input type="date" id="emDob" value="${esc(u.dateOfBirth || '')}" /></div>

          <div class="form-section">${t('address')}</div>
          <div class="field"><label>${t('streetAddress')}</label><input type="text" id="emStreet" value="${esc(u.street || '')}" /></div>
          <div class="row">
            <div class="col field"><label>${t('city')}</label><input type="text" id="emCity" value="${esc(u.city || '')}" /></div>
            <div class="col field"><label>${t('postalCode')}</label><input type="text" id="emPostal" value="${esc(u.postalCode || '')}" /></div>
          </div>
          <div class="field"><label>${t('country')}</label><input type="text" id="emCountry" value="${esc(u.country || '')}" /></div>

          <div class="form-section">${t('employment')}</div>
          <div class="field"><label>${t('jobTitle')}</label><input type="text" id="emJobTitle" value="${esc(u.jobTitle || '')}" /></div>
          <div class="field"><label>${t('department')}</label><input type="text" id="emDept" value="${esc(u.department || '')}" /></div>
          <div class="field"><label>${t('role')}</label>
            <select id="emRole"><option value="employee" ${u.role === 'employee' ? 'selected' : ''}>${t('roleEmployee')}</option><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>${t('roleAdmin')}</option></select>
          </div>
          <div class="checkbox-row"><input type="checkbox" id="emActive" ${u.active ? 'checked' : ''}/> <label for="emActive" style="margin:0">${t('active')}</label></div>

          <div class="form-section">${t('preferences')}</div>
          <div class="field"><label>${t('language')}</label>
            <select id="emLang">
              <option value="English" ${u.language === 'English' ? 'selected' : ''}>English</option>
              <option value="Français" ${u.language === 'Français' ? 'selected' : ''}>Français</option>
            </select>
          </div>

          <div class="error-text" id="emError"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="emCancel">${t('cancel')}</button>
            <button type="submit" class="btn btn-primary">${t('save')}</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modalRoot);
    document.getElementById('emCancel').onclick = () => modalRoot.remove();
    document.getElementById('editForm').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await api(`/api/users/${u.id}`, { method: 'PATCH', body: {
          name: document.getElementById('emName').value,
          phone: document.getElementById('emPhone').value,
          dateOfBirth: document.getElementById('emDob').value,
          street: document.getElementById('emStreet').value,
          city: document.getElementById('emCity').value,
          postalCode: document.getElementById('emPostal').value,
          country: document.getElementById('emCountry').value,
          jobTitle: document.getElementById('emJobTitle').value,
          department: document.getElementById('emDept').value,
          role: document.getElementById('emRole').value,
          active: document.getElementById('emActive').checked,
          language: document.getElementById('emLang').value,
        } });
        modalRoot.remove();
        viewTeam();
      } catch (err) {
        document.getElementById('emError').textContent = err.message;
      }
    };
  }

  // ---------- Tasks (admin) ----------
  async function viewTasks() {
    const { taskTypes } = await api('/api/tasktypes');
    layout('#/tasks', t('tasks_title'), t('tasks_sub'), `
      <div class="toolbar" style="justify-content:flex-end">
        <button class="btn btn-primary" id="addTaskBtn">${t('addTask')}</button>
      </div>
      <div class="card">
        ${taskTypes.length ? taskTypes.map((tk) => `
          <div class="row" style="align-items:center; padding:10px 0; border-bottom:1px solid var(--border)">
            <div style="flex:2"><strong>${esc(tk.name)}</strong> ${!tk.active ? `<span class="badge badge-rejected">${t('inactive')}</span>` : ''}
              <div class="hint">${tk.countsAsWorked ? t('countsTowardWorked') : t('doesNotCount')}</div>
            </div>
            <div>
              <button class="btn btn-secondary btn-sm" data-edit="${tk.id}">${t('edit')}</button>
              <button class="btn btn-secondary btn-sm" data-toggle="${tk.id}" data-active="${tk.active}">${tk.active ? t('deactivate') : t('activate')}</button>
              <button class="btn btn-danger btn-sm" data-del="${tk.id}">${t('delete')}</button>
            </div>
          </div>
        `).join('') : `<div class="empty-state">${t('noTaskTypes')}</div>`}
      </div>
    `);
    document.getElementById('addTaskBtn').onclick = () => openTaskModal();
    document.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.onclick = () => openTaskModal(taskTypes.find((tk) => tk.id === Number(btn.getAttribute('data-edit'))));
    });
    document.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.onclick = async () => {
        const active = btn.getAttribute('data-active') === '1' || btn.getAttribute('data-active') === 'true';
        await api(`/api/tasktypes/${btn.getAttribute('data-toggle')}`, { method: 'PATCH', body: { active: !active } });
        viewTasks();
      };
    });
    document.querySelectorAll('[data-del]').forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm(t('confirmDeleteTask'))) return;
        await api(`/api/tasktypes/${btn.getAttribute('data-del')}`, { method: 'DELETE' });
        viewTasks();
      };
    });
  }

  // Adds a task type, or edits `task` when one is passed in.
  function openTaskModal(task) {
    const modalRoot = document.createElement('div');
    modalRoot.className = 'modal-backdrop';
    modalRoot.innerHTML = `
      <div class="modal">
        <h3>${task ? t('editTaskModal_title') : t('addTaskModal_title')}</h3>
        <form id="taskForm">
          <div class="field"><label>${t('name')}</label><input type="text" id="tName" required value="${task ? esc(task.name) : ''}" /></div>
          <div class="checkbox-row"><input type="checkbox" id="tCounts" ${!task || task.countsAsWorked ? 'checked' : ''}/> <label for="tCounts" style="margin:0">${t('countsTowardWorked')}</label></div>
          <div class="error-text" id="tError"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="tCancel">${t('cancel')}</button>
            <button type="submit" class="btn btn-primary">${t('save')}</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modalRoot);
    document.getElementById('tCancel').onclick = () => modalRoot.remove();
    document.getElementById('taskForm').onsubmit = async (e) => {
      e.preventDefault();
      const body = {
        name: document.getElementById('tName').value,
        countsAsWorked: document.getElementById('tCounts').checked,
      };
      try {
        if (task) await api(`/api/tasktypes/${task.id}`, { method: 'PATCH', body });
        else await api('/api/tasktypes', { method: 'POST', body });
        modalRoot.remove();
        viewTasks();
      } catch (err) {
        document.getElementById('tError').textContent = err.message;
      }
    };
  }

  // ---------- Settings (admin) ----------
  async function viewSettings() {
    const { settings } = await api('/api/settings');
    layout('#/settings', t('settings_title'), t('settings_sub'), `
      <div class="card">
        <h3 style="margin-top:0">${t('payCycle')}</h3>
        <div class="row">
          <div class="col field"><label>${t('payCycleLength')}</label>
            <select id="stCycleLen">
              <option value="7" ${settings.payCycleLengthDays === 7 ? 'selected' : ''}>${t('weekly7')}</option>
              <option value="14" ${settings.payCycleLengthDays === 14 ? 'selected' : ''}>${t('biweekly14')}</option>
              <option value="15" ${settings.payCycleLengthDays === 15 ? 'selected' : ''}>${t('semimonthly15')}</option>
              <option value="28" ${settings.payCycleLengthDays === 28 ? 'selected' : ''}>${t('fourWeeks28')}</option>
            </select>
          </div>
          <div class="col field"><label>${t('referenceStartDate')}</label>
            <input type="date" id="stRefDate" value="${settings.payCycleReferenceDate}" />
            <div class="hint">${t('referenceHint')}</div>
          </div>
        </div>
        <p class="hint" id="cyclePreview"></p>
      </div>
      <div class="card">
        <h3 style="margin-top:0">${t('overtime')}</h3>
        <div class="field"><label>${t('overtimeWeeklyThreshold')}</label>
          <input type="number" id="stOtThreshold" value="${settings.overtimeWeeklyThreshold}" min="1" max="80" />
          <div class="hint">${t('overtimeHint')}</div>
        </div>
      </div>
      <div class="card">
        <h3 style="margin-top:0">${t('notifications')}</h3>
        <div class="checkbox-row"><input type="checkbox" id="stNotifyNew" ${settings.notifyNewAccount ? 'checked' : ''}/><label for="stNotifyNew" style="margin:0">${t('notifyNewAccount')}</label></div>
        <div class="checkbox-row"><input type="checkbox" id="stNotifyApprove" ${settings.notifyApproval ? 'checked' : ''}/><label for="stNotifyApprove" style="margin:0">${t('notifyApproval')}</label></div>
        <div class="checkbox-row"><input type="checkbox" id="stNotifyReject" ${settings.notifyRejection ? 'checked' : ''}/><label for="stNotifyReject" style="margin:0">${t('notifyRejection')}</label></div>
      </div>
      <div class="card">
        <h3 style="margin-top:0">${t('company')}</h3>
        <div class="field"><label>${t('companyName')}</label><input type="text" id="stCompanyName" value="${esc(settings.companyName)}" /></div>
      </div>
      <button class="btn btn-primary" id="saveSettings">${t('saveSettings')}</button>
      <div class="error-text" id="settingsMsg"></div>
    `);

    async function updatePreview() {
      const referenceDate = document.getElementById('stRefDate').value;
      const lengthDays = document.getElementById('stCycleLen').value;
      const { cycle } = await api(`/api/pay-cycle-preview?referenceDate=${referenceDate}&lengthDays=${lengthDays}`);
      document.getElementById('cyclePreview').textContent = `${t('cyclePreviewPrefix')} ${cycle.start} — ${cycle.end}`;
    }
    document.getElementById('stRefDate').onchange = updatePreview;
    document.getElementById('stCycleLen').onchange = updatePreview;
    updatePreview();

    document.getElementById('saveSettings').onclick = async () => {
      try {
        const { settings: updated } = await api('/api/settings', { method: 'PATCH', body: {
          payCycleLengthDays: Number(document.getElementById('stCycleLen').value),
          payCycleReferenceDate: document.getElementById('stRefDate').value,
          overtimeWeeklyThreshold: Number(document.getElementById('stOtThreshold').value),
          notifyNewAccount: document.getElementById('stNotifyNew').checked,
          notifyApproval: document.getElementById('stNotifyApprove').checked,
          notifyRejection: document.getElementById('stNotifyReject').checked,
          companyName: document.getElementById('stCompanyName').value,
        } });
        state.settings = updated;
        document.getElementById('settingsMsg').style.color = 'var(--success)';
        document.getElementById('settingsMsg').textContent = t('saved');
      } catch (err) {
        document.getElementById('settingsMsg').style.color = 'var(--danger)';
        document.getElementById('settingsMsg').textContent = err.message;
      }
    };
  }

  boot();
})();
