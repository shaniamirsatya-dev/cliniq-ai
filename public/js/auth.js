// Auth management — shared across all pages

const AUTH_REDIRECT = '/index.html';
const DASHBOARD_REDIRECT = '/dashboard.html';

async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = AUTH_REDIRECT;
    return null;
  }
  return user;
}

async function redirectIfLoggedIn() {
  const user = await getCurrentUser();
  if (user) {
    window.location.href = DASHBOARD_REDIRECT;
  }
}

async function signOut() {
  await sb.auth.signOut();
  window.location.href = AUTH_REDIRECT;
}

async function signInWithGoogle() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/dashboard.html'
    }
  });
  if (error) throw error;
}

async function signIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signUp(email, password, metadata = {}) {
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: metadata }
  });
  if (error) throw error;
  return data;
}

// Load and set therapist info in sidebar
async function loadSidebarUser() {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    const profile = await getTherapistProfile(user.id);
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    const avatarEl = document.getElementById('sidebar-avatar');
    if (nameEl && profile) {
      nameEl.textContent = profile.full_name || user.email;
      if (roleEl) roleEl.textContent = profile.profession || 'מטפל/ת';
      if (avatarEl) {
        const initials = (profile.full_name || user.email)
          .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
        avatarEl.textContent = initials;
      }
    } else if (nameEl) {
      nameEl.textContent = user.email;
    }
  } catch (e) {
    console.warn('loadSidebarUser:', e);
  }
}

// Wire up logout button
function initLogout() {
  const btn = document.getElementById('logout-btn');
  if (btn) btn.addEventListener('click', signOut);
}

// Mobile sidebar toggle
function initMobileSidebar() {
  const btn = document.getElementById('mobile-menu-btn');
  const sidebar = document.querySelector('.sidebar');
  if (btn && sidebar) {
    btn.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && !btn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }
}
