# CliniqAI — Clinic Management App with AI

A full-stack SaaS web app for Israeli therapists and clinic owners to manage appointments, patients, treatment notes, and generate AI-powered summaries and Instagram posts.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML, CSS, JavaScript (RTL Hebrew) |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Auth | Supabase Auth + Google OAuth |
| AI | Google Gemini API |
| Deployment | Render.com |
| Version Control | GitHub |

## File Structure

```
cliniq-ai/
├── server.js               — Express server, API routes, Gemini integration
├── .env                    — Environment variables (never commit)
├── public/
│   ├── index.html          — Landing page + Login/Register
│   ├── dashboard.html      — Main dashboard with stats
│   ├── calendar.html       — Appointments calendar (day/week/month)
│   ├── patients.html       — Patients list with search/filter
│   ├── patient.html        — Single patient profile + AI features
│   ├── settings.html       — Clinic settings
│   ├── css/
│   │   └── style.css       — Full design system (tokens, components, layout)
│   └── js/
│       ├── supabase.js     — Supabase client + all DB helper functions
│       ├── auth.js         — Authentication logic (login, signup, OAuth, guards)
│       └── app.js          — Shared utilities (toast, modal, escapeHTML, apiPost)
```

## Database Schema

All tables have **Row Level Security** — each therapist sees only their own data.

```sql
therapists      (id, user_id, full_name, profession, phone, clinic_address, working_hours)
patients        (id, therapist_id, full_name, phone, email, birth_date, treatment_type, notes, status)
appointments    (id, therapist_id, patient_id, date_time, duration, treatment_type, notes, status, reminder_sent)
treatment_notes (id, appointment_id, patient_id, therapist_id, content, ai_summary)
```

A database trigger (`handle_new_user`) auto-creates the `therapists` row on signup using `security definer` to bypass RLS during registration.

## Environment Variables

Stored in `.env`, never committed. Set these in Render dashboard for production.

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
GEMINI_API_KEY=
PORT=3000
ALLOWED_ORIGINS=https://your-app.onrender.com
```

## Design System

- **Primary:** Teal `#0D9488`
- **Secondary:** Purple `#7C3AED`
- **Accent:** Gold `#F59E0B`
- **Background:** `#F8FAFC`
- **Font:** Heebo (Google Fonts)
- RTL Hebrew throughout, mobile-first responsive

All design tokens are CSS custom properties in `style.css` under `:root`.

## Key Features

- **Google OAuth** login via Supabase Auth
- **Appointment calendar** — day / week / month views, click-to-create, drag placeholder
- **Patient management** — full profiles, search, filter, archive
- **AI treatment summary** — Gemini API generates professional Hebrew summaries
- **AI Instagram post** — anonymized, educational posts from treatment notes
- **RLS data isolation** — complete separation between therapist accounts
- **Auth-protected API routes** — all `/api/*` endpoints verify Supabase JWT
- **Rate limiting** — 20 req/min per IP on API routes

## Code Conventions

- Comments in **English**
- Hebrew only in **UI strings** (labels, toasts, placeholders)
- `async/await` for all API and DB calls
- User-facing **error messages in Hebrew**
- Console logs in **English** for debugging
- User data injected into DOM via `textContent` or `escapeHTML()` — never raw `innerHTML`
- No inline `onclick` with user data — use `addEventListener` + `data-*` attributes

## Server API Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/send-reminder` | JWT | Log WhatsApp reminder (placeholder) |
| POST | `/api/ai-summary` | JWT | Generate treatment summary via Gemini |
| POST | `/api/ai-post` | JWT | Generate Instagram post via Gemini |

## Running Locally

```bash
npm install
# Fill in .env values
npm start          # http://localhost:3000
npm run dev        # with nodemon auto-reload
```

## Current Status

- MVP built and working locally
- Supabase connected with RLS + signup trigger
- Google OAuth configured
- XSS protection and server-side auth on all API routes

## Next Steps

1. Push to GitHub + deploy to Render.com
2. Mobile QA testing
3. WhatsApp reminders via Twilio
4. Google Calendar sync
5. Stripe billing integration

## Business Model

| Plan | Price | Features |
|------|-------|---------|
| Starter | ₪39/month | Up to 20 patients, basic calendar |
| Pro | ₪89/month | Unlimited patients + AI features |
| Studio | ₪149/month | Pro + clinic website + marketing agent |

## Competitive Landscape

| Competitor | Price | Weakness |
|------------|-------|---------|
| Jade.co.il | ₪47–110/month | No AI features |
| Tipulog | Legacy pricing | Acquired by Arbox (20M NIS), outdated UI |
| **CliniqAI** | ₪39–149/month | **AI-first, modern UI, website + marketing bundle** |
