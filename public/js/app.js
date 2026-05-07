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

// ===== CUSTOM SELECT DROPDOWN =====
const CUSTOM_SELECT_OPTIONS = {
  treatment: [
    'טיפול פרטני', 'טיפול זוגי', 'טיפול משפחתי', 'טיפול קבוצתי',
    'CBT', 'EMDR', 'DBT', 'ACT', 'פסיכודינמי', 'הדרכת הורים',
    'טיפול בחרדה', 'טיפול בטראומה', 'פגישת אינטייק', 'מעקב',
    'פיזיותרפיה', 'נטורופתיה', 'רפלקסולוגיה', 'דיקור סיני'
  ],
  profession: [
    'פסיכולוג/ית קלינית', 'פסיכותרפיסט/ית', 'מטפל/ת CBT', 'מטפל/ת EMDR',
    'עובד/ת סוציאלי/ת קלינית', 'פיזיותרפיסט/ית', 'נטורופת/ית',
    'דיאטן/ית קליני/ת', 'מרפא/ה בעיסוק', 'הומאופת/ית', 'רפלקסולוג/ית',
    'דיקור סיני', 'מאמן/ת אישי/ת', 'יועץ/ת זוגי/ת ומשפחתי/ת'
  ]
};

function initCustomSelect(inputEl, options) {
  inputEl.setAttribute('readonly', '');
  inputEl.style.cursor = 'pointer';

  const dropdown = document.createElement('div');
  dropdown.className = 'custom-select-dropdown';
  document.body.appendChild(dropdown);

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'custom-select-search';
  searchInput.placeholder = 'חיפוש...';
  searchInput.setAttribute('autocomplete', 'off');

  const listEl = document.createElement('div');
  listEl.className = 'custom-select-list';

  dropdown.appendChild(searchInput);
  dropdown.appendChild(listEl);

  let isOpen = false;

  function renderList(q) {
    const lower = (q || '').toLowerCase();
    const filtered = lower ? options.filter(o => o.toLowerCase().includes(lower)) : options;
    listEl.innerHTML = '';

    filtered.forEach(opt => {
      const item = document.createElement('div');
      item.className = 'custom-select-option';
      item.textContent = opt;
      item.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        inputEl.value = opt;
        inputEl.setAttribute('readonly', '');
        inputEl.style.cursor = 'pointer';
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        close();
      });
      listEl.appendChild(item);
    });

    const other = document.createElement('div');
    other.className = 'custom-select-option custom-select-other';
    other.textContent = 'אחר - הכנס ידנית';
    other.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      inputEl.value = '';
      inputEl.removeAttribute('readonly');
      inputEl.style.cursor = '';
      inputEl.placeholder = 'הכנס ידנית...';
      close();
      setTimeout(() => inputEl.focus(), 50);
    });
    listEl.appendChild(other);
  }

  function position() {
    const rect = inputEl.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    dropdown.style.left = rect.left + 'px';
    dropdown.style.width = rect.width + 'px';
    if (spaceBelow > 180 || spaceBelow >= rect.top) {
      dropdown.style.top = (rect.bottom + 2) + 'px';
      dropdown.style.bottom = 'auto';
    } else {
      dropdown.style.bottom = (window.innerHeight - rect.top + 2) + 'px';
      dropdown.style.top = 'auto';
    }
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    searchInput.value = '';
    renderList('');
    position();
    dropdown.classList.add('open');
    setTimeout(() => searchInput.focus(), 50);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    dropdown.classList.remove('open');
  }

  inputEl.addEventListener('click', open);
  searchInput.addEventListener('input', () => renderList(searchInput.value));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { close(); inputEl.focus(); }
  });

  document.addEventListener('pointerdown', (e) => {
    if (isOpen && !dropdown.contains(e.target) && e.target !== inputEl) close();
  });

  window.addEventListener('resize', () => { if (isOpen) position(); });
  window.addEventListener('scroll', () => { if (isOpen) position(); }, true);
}

function initCustomSelects() {
  document.querySelectorAll('[data-custom-select]').forEach(input => {
    const type = input.dataset.customSelect;
    const opts = CUSTOM_SELECT_OPTIONS[type];
    if (opts) initCustomSelect(input, opts);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initCustomSelects(); // no-op: no [data-custom-select] elements remain
  document.querySelectorAll('select[data-with-other]').forEach(initSelectWithOther);
});

// ===== NATIVE SELECT + "OTHER" HELPERS =====
function initSelectWithOther(sel) {
  const other = document.getElementById(sel.id + '-other');
  if (!other) return;
  sel.addEventListener('change', () => {
    if (sel.value === 'other') {
      other.style.display = 'block';
      other.focus();
    } else {
      other.style.display = 'none';
      other.value = '';
    }
  });
}

function getSelectValue(id) {
  const el = document.getElementById(id);
  if (!el) return '';
  if (el.tagName === 'SELECT' && el.value === 'other') {
    return (document.getElementById(id + '-other')?.value || '').trim();
  }
  return el.value;
}

function setSelectValue(id, value) {
  const el = document.getElementById(id);
  if (!el || el.tagName !== 'SELECT') { if (el) el.value = value; return; }
  const match = Array.from(el.options).find(o => o.value === value);
  if (match) {
    el.value = value;
  } else if (value) {
    el.value = 'other';
    const other = document.getElementById(id + '-other');
    if (other) { other.value = value; other.style.display = 'block'; }
  } else {
    el.value = '';
  }
}

function resetSelect(id) {
  const el = document.getElementById(id);
  if (el) el.value = '';
  const other = document.getElementById(id + '-other');
  if (other) { other.value = ''; other.style.display = 'none'; }
}

// ===== PATIENT SELECT SEARCH =====
async function initPatientSearch(inputId, hiddenId, therapistId) {
  const input = document.getElementById(inputId);
  const hidden = document.getElementById(hiddenId);
  if (!input) return;

  let allPatients = [];
  let dropdown = null;

  try { allPatients = await getPatients(therapistId); } catch(e) {}

  function showDropdown(q) {
    removeDropdown();
    const lower = (q || '').toLowerCase();
    const filtered = lower
      ? allPatients.filter(p => p.full_name?.toLowerCase().includes(lower))
      : allPatients;

    dropdown = document.createElement('div');
    dropdown.style.cssText = 'position:absolute;left:0;right:0;top:100%;background:white;border:1.5px solid var(--border);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);z-index:600;max-height:240px;overflow-y:auto;margin-top:2px;';

    if (filtered.length === 0 && lower) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:12px 14px;color:var(--text-muted);font-size:0.875rem;';
      empty.textContent = 'לא נמצאו מטופלים';
      dropdown.appendChild(empty);
    }

    filtered.forEach(p => {
      const item = document.createElement('div');
      item.style.cssText = 'padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border-light);';
      const nameEl = document.createElement('div');
      nameEl.style.cssText = 'font-weight:600;font-size:0.875rem;';
      nameEl.textContent = p.full_name;
      item.appendChild(nameEl);
      if (p.treatment_type || p.phone) {
        const metaEl = document.createElement('div');
        metaEl.style.cssText = 'font-size:0.75rem;color:var(--text-muted);margin-top:2px;';
        metaEl.textContent = [p.treatment_type, p.phone].filter(Boolean).join(' · ');
        item.appendChild(metaEl);
      }
      item.addEventListener('mouseenter', () => item.style.background = 'var(--surface-2)');
      item.addEventListener('mouseleave', () => item.style.background = '');
      item.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        input.value = p.full_name;
        if (hidden) hidden.value = p.id;
        const gf = document.getElementById('appt-guest-fields');
        if (gf) gf.style.display = 'none';
        removeDropdown();
      });
      dropdown.appendChild(item);
    });

    // Guest option
    const guestItem = document.createElement('div');
    guestItem.style.cssText = 'padding:10px 14px;cursor:pointer;color:var(--primary);font-weight:600;font-size:0.875rem;';
    guestItem.textContent = '+ הוסף כמבקר חדש (ללא תיק מטופל)';
    guestItem.addEventListener('mouseenter', () => guestItem.style.background = 'var(--primary-bg)');
    guestItem.addEventListener('mouseleave', () => guestItem.style.background = '');
    guestItem.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      input.value = 'מבקר חדש';
      if (hidden) hidden.value = '__guest__';
      removeDropdown();
      const gf = document.getElementById('appt-guest-fields');
      if (gf) gf.style.display = 'block';
    });
    dropdown.appendChild(guestItem);

    const wrapper = input.parentElement;
    wrapper.style.position = 'relative';
    wrapper.appendChild(dropdown);
  }

  function removeDropdown() {
    if (dropdown) { dropdown.remove(); dropdown = null; }
  }

  input.addEventListener('focus', () => { if (!input.readOnly) showDropdown(input.value.trim()); });
  input.addEventListener('input', () => { if (!input.readOnly) showDropdown(input.value.trim()); });
  document.addEventListener('pointerdown', (e) => {
    if (dropdown && !input.contains(e.target) && !dropdown.contains(e.target)) removeDropdown();
  });
}
