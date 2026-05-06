// Shared utilities and UI components

// ===== XSS PROTECTION =====
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ===== TOAST =====
let toastContainer = null;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

function showToast(message, type = 'info', duration = 3500) {
  const container = getToastContainer();
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ===== FORMAT HELPERS =====
function formatDate(dateStr, opts = {}) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric', ...opts });
}

function formatTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`;
}

function calcAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const AVATAR_COLORS = [
  '#0D9488','#7C3AED','#F59E0B','#10B981','#EF4444',
  '#3B82F6','#EC4899','#8B5CF6','#14B8A6','#F97316'
];

function avatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function statusBadge(status) {
  const map = {
    confirmed: '<span class="badge badge-success">✓ אושר</span>',
    pending:   '<span class="badge badge-warning">⏳ ממתין</span>',
    cancelled: '<span class="badge badge-danger">✕ בוטל</span>',
    active:    '<span class="badge badge-success">פעיל</span>',
    archived:  '<span class="badge badge-gray">ארכיון</span>',
  };
  return map[status] || `<span class="badge badge-gray">${status}</span>`;
}

// ===== MODAL =====
function openModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) { overlay.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
}

function closeModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) { overlay.style.display = 'none'; document.body.style.overflow = ''; }
}

function initModals() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) closeModal(modal.id);
    });
  });
}

// ===== TABS =====
function initTabs(containerSelector) {
  const containers = document.querySelectorAll(containerSelector || '[data-tabs]');
  containers.forEach(container => {
    const btns = container.querySelectorAll('.tab-btn');
    const panels = container.querySelectorAll('.tab-panel');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.tab;
        const panel = container.querySelector(`[data-panel="${target}"]`);
        if (panel) panel.classList.add('active');
      });
    });
  });
}

// ===== SKELETON LOADER =====
function showSkeleton(containerId, rows = 3) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = Array(rows).fill(0).map(() => `
    <div style="display:flex;gap:12px;padding:14px 0;border-bottom:1px solid var(--border-light)">
      <div class="skeleton" style="width:36px;height:36px;border-radius:50%;flex-shrink:0"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:6px">
        <div class="skeleton" style="height:14px;width:60%"></div>
        <div class="skeleton" style="height:12px;width:40%"></div>
      </div>
    </div>
  `).join('');
}

// ===== WHATSAPP =====
function openWhatsApp(phone, message = '') {
  const clean = (phone || '').replace(/\D/g, '');
  const intl = clean.startsWith('0') ? '972' + clean.slice(1) : clean;
  const url = `https://wa.me/${intl}${message ? '?text=' + encodeURIComponent(message) : ''}`;
  window.open(url, '_blank');
}

// ===== API CALL (sends Supabase JWT for server-side auth) =====
async function apiPost(endpoint, body) {
  const { data: { session } } = await sb.auth.getSession();
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || ''}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'שגיאת שרת' }));
    throw new Error(err.error || 'שגיאת שרת');
  }
  return res.json();
}

// ===== MINI CALENDAR =====
function renderMiniCal(container, selectedDate, onSelect) {
  const DAYS_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
  const MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  let current = selectedDate ? new Date(selectedDate) : new Date();
  current.setDate(1);

  function render() {
    const today = new Date();
    const y = current.getFullYear();
    const m = current.getMonth();
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();

    let html = `
      <div class="cal-header">
        <button class="btn btn-ghost btn-sm" id="cal-prev">‹</button>
        <span class="cal-title">${MONTHS_HE[m]} ${y}</span>
        <button class="btn btn-ghost btn-sm" id="cal-next">›</button>
      </div>
      <table class="mini-cal"><thead><tr>
        ${DAYS_HE.map(d => `<th>${d}</th>`).join('')}
      </tr></thead><tbody>`;

    let day = 1;
    for (let r = 0; r < 6; r++) {
      html += '<tr>';
      for (let c = 0; c < 7; c++) {
        const idx = r * 7 + c;
        const offset = (first + 6) % 7;
        if (idx < offset || day > days) {
          html += '<td></td>';
        } else {
          const date = new Date(y, m, day);
          const isToday = date.toDateString() === today.toDateString();
          const isSel = selectedDate && date.toDateString() === new Date(selectedDate).toDateString();
          const cls = isToday ? 'today' : isSel ? 'selected' : '';
          html += `<td class="${cls}" data-date="${date.toISOString().split('T')[0]}">${day}</td>`;
          day++;
        }
      }
      html += '</tr>';
      if (day > days) break;
    }
    html += '</tbody></table>';
    container.innerHTML = html;

    container.querySelector('#cal-prev').addEventListener('click', () => { current.setMonth(m - 1); render(); });
    container.querySelector('#cal-next').addEventListener('click', () => { current.setMonth(m + 1); render(); });
    container.querySelectorAll('td[data-date]').forEach(td => {
      td.addEventListener('click', () => { if (onSelect) onSelect(td.dataset.date); });
    });
  }
  render();
}

// ===== PATIENT SELECT SEARCH =====
async function initPatientSearch(inputId, hiddenId, therapistId) {
  const input = document.getElementById(inputId);
  const hidden = document.getElementById(hiddenId);
  if (!input) return;

  let dropdown = null;

  input.addEventListener('input', async () => {
    const q = input.value.trim();
    if (q.length < 2) { dropdown && dropdown.remove(); dropdown = null; return; }
    const patients = await getPatients(therapistId, { search: q });
    if (dropdown) dropdown.remove();
    dropdown = document.createElement('div');
    dropdown.style.cssText = 'position:absolute;background:white;border:1.5px solid var(--border);border-radius:8px;box-shadow:var(--shadow-md);z-index:500;width:100%;max-height:200px;overflow-y:auto;';
    if (patients.length === 0) {
      dropdown.innerHTML = '<div style="padding:12px 16px;color:var(--text-muted);font-size:0.875rem">לא נמצאו מטופלים</div>';
    } else {
      patients.forEach(p => {
        const item = document.createElement('div');
        item.style.cssText = 'padding:10px 16px;cursor:pointer;font-size:0.875rem;transition:background 0.15s;';
        item.textContent = `${p.full_name} — ${p.phone || ''}`;
        item.addEventListener('mouseenter', () => item.style.background = 'var(--surface-2)');
        item.addEventListener('mouseleave', () => item.style.background = '');
        item.addEventListener('click', () => {
          input.value = p.full_name;
          if (hidden) hidden.value = p.id;
          dropdown.remove(); dropdown = null;
        });
        dropdown.appendChild(item);
      });
    }
    const wrapper = input.parentElement;
    wrapper.style.position = 'relative';
    wrapper.appendChild(dropdown);
  });

  document.addEventListener('click', (e) => {
    if (dropdown && !input.contains(e.target)) { dropdown.remove(); dropdown = null; }
  });
}
