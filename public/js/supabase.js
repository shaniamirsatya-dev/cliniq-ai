// Supabase client initialization
const SUPABASE_URL = 'https://xpqyrtrgeoqzfxovxtrd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_jGGFZ8SnCA543RNFSw7n2g_Acd0456j';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storageKey: 'cliniq-auth',
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// ===== AUTH HELPERS =====
async function getCurrentUser() {
  const { data: { session } } = await sb.auth.getSession();
  return session?.user || null;
}

async function getTherapistProfile(userId) {
  const { data, error } = await sb
    .from('therapists')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) console.error('getTherapistProfile error:', error);
  return data;
}

async function upsertTherapistProfile(profile) {
  const { data, error } = await sb.from('therapists').upsert(profile, { onConflict: 'user_id' }).select().single();
  if (error) throw error;
  return data;
}

// Fetch profile, and create it if missing (handles users who registered before the DB trigger was added)
async function ensureTherapistProfile(user) {
  let profile = await getTherapistProfile(user.id);
  if (!profile) {
    profile = await upsertTherapistProfile({
      user_id: user.id,
      full_name: user.user_metadata?.full_name || '',
      profession: user.user_metadata?.profession || ''
    });
  }
  return profile;
}

// ===== PATIENTS =====
async function getPatients(therapistId, filters = {}) {
  let query = sb
    .from('patients')
    .select('*')
    .eq('therapist_id', therapistId)
    .order('created_at', { ascending: false });

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  }
  const { data, error } = await query;
  if (error) console.error('getPatients error:', error);
  return data || [];
}

async function getPatient(patientId) {
  const { data, error } = await sb
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single();
  if (error) console.error('getPatient error:', error);
  return data;
}

async function createPatient(patient) {
  const { data, error } = await sb.from('patients').insert(patient).select().single();
  if (error) throw error;
  return data;
}

async function updatePatient(patientId, updates) {
  const { data, error } = await sb
    .from('patients')
    .update(updates)
    .eq('id', patientId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ===== APPOINTMENTS =====
async function getAppointments(therapistId, filters = {}) {
  let query = sb
    .from('appointments')
    .select(`*, patients(full_name, phone)`)
    .eq('therapist_id', therapistId)
    .order('date_time', { ascending: true });

  if (filters.date) {
    const start = new Date(filters.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filters.date);
    end.setHours(23, 59, 59, 999);
    query = query.gte('date_time', start.toISOString()).lte('date_time', end.toISOString());
  }
  if (filters.patientId) {
    query = query.eq('patient_id', filters.patientId);
  }
  const { data, error } = await query;
  if (error) console.error('getAppointments error:', error);
  return data || [];
}

async function createAppointment(appointment) {
  const { data, error } = await sb.from('appointments').insert(appointment).select().single();
  if (error) throw error;
  return data;
}

async function updateAppointment(appointmentId, updates) {
  const { data, error } = await sb
    .from('appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteAppointment(appointmentId) {
  const { error } = await sb.from('appointments').delete().eq('id', appointmentId);
  if (error) throw error;
}

// ===== TREATMENT NOTES =====
async function getTreatmentNotes(patientId) {
  const { data, error } = await sb
    .from('treatment_notes')
    .select(`*, appointments(date_time, treatment_type)`)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) console.error('getTreatmentNotes error:', error);
  return data || [];
}

async function createTreatmentNote(note) {
  const { data, error } = await sb.from('treatment_notes').insert(note).select().single();
  if (error) throw error;
  return data;
}

async function updateTreatmentNote(noteId, updates) {
  const { data, error } = await sb
    .from('treatment_notes')
    .update(updates)
    .eq('id', noteId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ===== STATS =====
async function getDashboardStats(therapistId) {
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [futureToday, activePatients, monthTreatments] = await Promise.all([
    sb.from('appointments')
      .select('*, patients(full_name, phone)', { count: 'exact' })
      .eq('therapist_id', therapistId)
      .gte('date_time', now.toISOString())
      .lte('date_time', todayEnd.toISOString())
      .order('date_time', { ascending: true }),
    sb.from('patients')
      .select('*', { count: 'exact' })
      .eq('therapist_id', therapistId)
      .eq('status', 'active'),
    sb.from('appointments')
      .select('*', { count: 'exact' })
      .eq('therapist_id', therapistId)
      .eq('status', 'confirmed')
      .gte('date_time', firstOfMonth)
  ]);

  return {
    todayCount: futureToday.count || 0,
    activePatients: activePatients.count || 0,
    monthTreatments: monthTreatments.count || 0,
    nextAppt: futureToday.data?.[0] || null
  };
}

// ===== SUPABASE SQL SCHEMA (run in Supabase SQL editor) =====
/*
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Therapists
create table therapists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  full_name text not null,
  profession text,
  phone text,
  clinic_address text,
  working_hours jsonb default '{}',
  created_at timestamptz default now(),
  unique(user_id)
);
alter table therapists enable row level security;
create policy "Users manage own therapist profile" on therapists
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Patients
create table patients (
  id uuid primary key default uuid_generate_v4(),
  therapist_id uuid references therapists(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  birth_date date,
  treatment_type text,
  notes text,
  status text default 'active' check (status in ('active', 'archived')),
  created_at timestamptz default now()
);
alter table patients enable row level security;
create policy "Therapists manage own patients" on patients
  using (therapist_id in (select id from therapists where user_id = auth.uid()))
  with check (therapist_id in (select id from therapists where user_id = auth.uid()));

-- Appointments
create table appointments (
  id uuid primary key default uuid_generate_v4(),
  therapist_id uuid references therapists(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  date_time timestamptz not null,
  duration int default 60,
  treatment_type text,
  notes text,
  status text default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  reminder_sent boolean default false,
  created_at timestamptz default now()
);
alter table appointments enable row level security;
create policy "Therapists manage own appointments" on appointments
  using (therapist_id in (select id from therapists where user_id = auth.uid()))
  with check (therapist_id in (select id from therapists where user_id = auth.uid()));

-- Treatment Notes
create table treatment_notes (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid references appointments(id) on delete set null,
  patient_id uuid references patients(id) on delete cascade,
  therapist_id uuid references therapists(id) on delete cascade,
  content text,
  ai_summary text,
  created_at timestamptz default now()
);
alter table treatment_notes enable row level security;
create policy "Therapists manage own treatment notes" on treatment_notes
  using (therapist_id in (select id from therapists where user_id = auth.uid()))
  with check (therapist_id in (select id from therapists where user_id = auth.uid()));
*/
