require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== CORS — restrict to own origin in production =====
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ===== RATE LIMITER (in-memory, per IP) =====
const rateLimitMap = new Map();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 20;

function rateLimit(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_WINDOW_MS) {
    entry.count = 1;
    entry.start = now;
  } else {
    entry.count++;
  }
  rateLimitMap.set(ip, entry);
  if (entry.count > RATE_MAX) {
    return res.status(429).json({ error: 'יותר מדי בקשות. נסה שוב בעוד דקה.' });
  }
  next();
}

// ===== AUTH MIDDLEWARE — verify Supabase JWT =====
async function verifyAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'נדרשת התחברות.' });
  }
  const token = auth.slice(7);
  try {
    const response = await fetch(
      `${process.env.SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': process.env.SUPABASE_ANON_KEY
        }
      }
    );
    if (!response.ok) return res.status(401).json({ error: 'טוקן לא תקין.' });
    req.user = await response.json();
    next();
  } catch {
    res.status(401).json({ error: 'שגיאת אימות.' });
  }
}

// ===== INPUT VALIDATION HELPERS =====
function truncate(str, max) {
  if (typeof str !== 'string') return '';
  return str.slice(0, max);
}

// ===== POST /api/send-reminder =====
app.post('/api/send-reminder', rateLimit, verifyAuth, async (req, res) => {
  const { phone, patientName, dateTime, therapistName } = req.body;
  if (!phone || !patientName || !dateTime) {
    return res.status(400).json({ error: 'שדות חסרים.' });
  }
  const cleanPhone = truncate(phone, 20).replace(/[^\d+\-\s()]/g, '');
  const cleanName  = truncate(patientName, 100);
  const cleanDT    = truncate(dateTime, 50);
  const cleanThera = truncate(therapistName || '', 100);

  const message = `שלום ${cleanName}, תזכורת לתור שלך עם ${cleanThera} ב-${cleanDT}. נתראה!`;
  console.log(`[Reminder] To: ${cleanPhone} | ${message}`);
  res.json({ success: true, preview: message });
});

// ===== POST /api/ai-summary =====
app.post('/api/ai-summary', rateLimit, verifyAuth, async (req, res) => {
  const raw = req.body.treatmentNotes;
  if (!raw || typeof raw !== 'string') {
    return res.status(400).json({ error: 'תיאור הטיפול חסר.' });
  }
  const treatmentNotes = truncate(raw.trim(), 4000);
  if (treatmentNotes.length < 10) {
    return res.status(400).json({ error: 'תיאור הטיפול קצר מדי.' });
  }

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_key') {
    return res.json({
      summary: `סיכום לדוגמה:\n\nמה נעשה: בוצע טיפול מקיף.\n\nתצפיות מרכזיות: שיפור ניכר.\n\nהמשך מומלץ: מעקב תוך 2-3 שבועות.\n\n(חברי Gemini API לסיכומים אמיתיים)`
    });
  }

  try {
    const prompt = `אתה עוזר למטפל לסכם טיפול. צור סיכום מקצועי ותמציתי בעברית. כלול: מה נעשה, תצפיות מרכזיות, המשך מומלץ.\nתיאור: ${treatmentNotes}`;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
    );
    const data = await response.json();
    const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'לא הצלחנו ליצור סיכום.';
    res.json({ summary });
  } catch (err) {
    console.error('Gemini summary error:', err.message);
    res.status(500).json({ error: 'שגיאה ביצירת הסיכום.' });
  }
});

// ===== POST /api/ai-post =====
app.post('/api/ai-post', rateLimit, verifyAuth, async (req, res) => {
  const raw = req.body.topic;
  if (!raw || typeof raw !== 'string') {
    return res.status(400).json({ error: 'נושא הפוסט חסר.' });
  }
  const topic = truncate(raw.trim(), 500);
  if (topic.length < 5) {
    return res.status(400).json({ error: 'נושא הפוסט קצר מדי.' });
  }

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_key') {
    return res.json({
      post: `✨ פוסט לדוגמה:\n\nלפעמים הצעד הקטן ביותר הוא שמשנה הכל...\n\n#בריאותנפשית #טיפול #צמיחה #שינוי #עצמי`
    });
  }

  try {
    const prompt = `צור פוסט אינסטגרם מעורר השראה בעברית על: ${topic}\nדרישות: חינוכי, ללא שמות/פרטים מזהים, CTA בסוף, 5 האשטאגים.`;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
    );
    const data = await response.json();
    const post = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'לא הצלחנו ליצור פוסט.';
    res.json({ post });
  } catch (err) {
    console.error('Gemini post error:', err.message);
    res.status(500).json({ error: 'שגיאה ביצירת הפוסט.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`CliniqAI server running on http://localhost:${PORT}`);
});
