require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// POST /api/send-reminder — WhatsApp reminder (placeholder)
app.post('/api/send-reminder', async (req, res) => {
  const { phone, patientName, dateTime, therapistName } = req.body;
  if (!phone || !patientName || !dateTime) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const message = `שלום ${patientName}, תזכורת לתור שלך עם ${therapistName} ב-${dateTime}. נתראה!`;
  console.log(`[WhatsApp Reminder] To: ${phone} | Message: ${message}`);
  res.json({ success: true, message: 'Reminder logged (WhatsApp integration pending)', preview: message });
});

// POST /api/ai-summary — Gemini treatment summary
app.post('/api/ai-summary', async (req, res) => {
  const { treatmentNotes } = req.body;
  if (!treatmentNotes) {
    return res.status(400).json({ error: 'Treatment notes are required' });
  }
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_key') {
    return res.json({
      summary: `סיכום טיפול לדוגמה:\n\nמה נעשה: בוצע טיפול מקיף בהתאם לתיאור שסופק.\n\nתצפיות מרכזיות: המטופל/ת הראה/ראתה שיפור ניכר במהלך הפגישה.\n\nהמשך מומלץ: מומלץ לקבוע פגישת מעקב תוך 2-3 שבועות.\n\n(הערה: חברו מפתח Gemini API לקבלת סיכומים אמיתיים)`
    });
  }
  try {
    const prompt = `אתה עוזר למטפל לסכם טיפול. צור סיכום מקצועי ותמציתי בעברית מהתיאור הבא. כלול: מה נעשה בטיפול, תצפיות מרכזיות, המשך מומלץ.\nתיאור: ${treatmentNotes}`;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    const data = await response.json();
    const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'לא הצלחנו ליצור סיכום. נסה שוב.';
    res.json({ summary });
  } catch (err) {
    console.error('Gemini error:', err);
    res.status(500).json({ error: 'שגיאה ביצירת הסיכום. נסה שוב.' });
  }
});

// POST /api/ai-post — Gemini Instagram post
app.post('/api/ai-post', async (req, res) => {
  const { topic } = req.body;
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_key') {
    return res.json({
      post: `✨ פוסט לדוגמה:\n\nלפעמים הצעד הקטן ביותר הוא שמשנה הכל...\n\nכאשר אנחנו מאפשרים לעצמנו להיות פגיעים, אנחנו פותחים דלת לשינוי אמיתי. 🌱\n\nאם גם אתם מרגישים שאתם צריכים תמיכה — זה בסדר לבקש עזרה.\n\nמה הצעד הבא שלכם? כתבו לי ⬇️\n\n#בריאותנפשית #טיפול #צמיחה #שינוי #עצמי`
    });
  }
  try {
    const prompt = `צור פוסט אינסטגרם מעורר השראה בעברית על הנושא הבא מטיפול (ללא פרטים מזהים): ${topic}\nהפוסט צריך: להיות חינוכי ומועיל, לא להזכיר שמות או פרטים אישיים, להסתיים עם CTA, לכלול 5 האשטאגים רלוונטיים.`;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    const data = await response.json();
    const post = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'לא הצלחנו ליצור פוסט. נסה שוב.';
    res.json({ post });
  } catch (err) {
    console.error('Gemini error:', err);
    res.status(500).json({ error: 'שגיאה ביצירת הפוסט. נסה שוב.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`CliniqAI server running on http://localhost:${PORT}`);
});
