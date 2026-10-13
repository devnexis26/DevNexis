import 'dotenv/config';
import express from 'express';
import pg from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;
const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const timezone = 'Europe/Lisbon';
const openDays = new Set([2, 3, 4, 5, 6]); // terça a sábado
const openMinute = 9 * 60;
const closeMinute = 19 * 60;
const services = [
  { id: 'corte', name: 'Corte clássico', duration: 45, price: 15 },
  { id: 'degrade', name: 'Corte degradê', duration: 60, price: 18 },
  { id: 'barba', name: 'Barba e toalha quente', duration: 30, price: 12 },
  { id: 'corte-barba', name: 'Corte + barba', duration: 75, price: 25 }
];

if (!process.env.DATABASE_URL) {
  console.error('Falta configurar DATABASE_URL. Copia .env.example para .env e indica uma base de dados PostgreSQL.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: 10
});

const emailReady = Boolean(
  process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('your_key') &&
  process.env.EMAIL_FROM && !process.env.EMAIL_FROM.includes('seudominio.pt') &&
  process.env.OWNER_EMAIL && !process.env.OWNER_EMAIL.includes('example.com')
);
const attempts = new Map();

function localParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date);
  return Object.fromEntries(parts.map(part => [part.type, part.value]));
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function minuteLabel(value) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function localDateLabel(date, time) {
  const [year, month, day] = date.split('-').map(Number);
  const dateAtNoonUtc = new Date(Date.UTC(year, month - 1, day, 12));
  const weekday = new Intl.DateTimeFormat('pt-PT', { weekday: 'long', timeZone: 'UTC' }).format(dateAtNoonUtc);
  const monthName = new Intl.DateTimeFormat('pt-PT', { month: 'long', timeZone: 'UTC' }).format(dateAtNoonUtc);
  return `${weekday}, ${day} de ${monthName} de ${year}, às ${time}`;
}

async function sendEmail({ to, subject, html, replyTo }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html, reply_to: replyTo })
  });
  if (!response.ok) throw new Error(`O serviço de e-mail respondeu ${response.status}.`);
  return response.json();
}

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(root, 'public'), { extensions: ['html'] }));

app.get('/api/config', (_req, res) => {
  const today = localParts();
  const max = new Date(Date.UTC(Number(today.year), Number(today.month) - 1, Number(today.day) + 60)).toISOString().slice(0, 10);
  res.json({
    name: 'Demonstração', location: 'Rua das Flores, 24 · Lisboa', phone: '+351 210 000 000', email: 'ola@demonstracao.pt',
    today: `${today.year}-${today.month}-${today.day}`, lastDate: max, services,
    schedule: 'Terça a sábado, das 09:00 às 19:00', bookingEnabled: emailReady
  });
});

app.get('/api/availability', async (req, res) => {
  const { date, service: serviceId } = req.query;
  const service = services.find(item => item.id === serviceId);
  if (!validDate(date) || !service) return res.status(400).json({ error: 'Escolhe uma data e um serviço válidos.' });
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (!openDays.has(day)) return res.json({ date, closed: true, slots: [] });
  try {
    const result = await pool.query(
      `SELECT start_minute, duration_minutes FROM bookings
       WHERE booking_date = $1 AND status = 'confirmed'
       ORDER BY start_minute`, [date]
    );
    const today = localParts();
    const isToday = date === `${today.year}-${today.month}-${today.day}`;
    const nowMinute = Number(today.hour) * 60 + Number(today.minute);
    const slots = [];
    for (let start = openMinute; start + service.duration <= closeMinute; start += 30) {
      const overlaps = result.rows.some(row => start < Number(row.start_minute) + Number(row.duration_minutes) && start + service.duration > Number(row.start_minute));
      if (!overlaps && (!isToday || start > nowMinute)) slots.push(minuteLabel(start));
    }
    res.json({ date, closed: false, slots });
  } catch (error) {
    console.error('Erro ao consultar horários:', error);
    res.status(503).json({ error: 'Não foi possível consultar a disponibilidade. Tenta novamente.' });
  }
});

app.post('/api/bookings', async (req, res) => {
  const ip = req.ip || 'unknown';
  const prior = attempts.get(ip) || { count: 0, reset: Date.now() + 60_000 };
  if (Date.now() > prior.reset) { prior.count = 0; prior.reset = Date.now() + 60_000; }
  prior.count++;
  attempts.set(ip, prior);
  if (prior.count > 12) return res.status(429).json({ error: 'Demasiados pedidos. Aguarda um minuto e tenta novamente.' });

  const { name, email, phone, date, time, service: serviceId, website } = req.body || {};
  if (website) return res.status(400).json({ error: 'Pedido inválido.' }); // honeypot anti-spam
  if (!emailReady) return res.status(503).json({ error: 'As marcações ainda não estão ativadas. Tenta mais tarde ou contacta a barbearia.' });
  const service = services.find(item => item.id === serviceId);
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPhone = String(phone || '').trim();
  const cleanTime = String(time || '');
  const startMinute = /^\d{2}:\d{2}$/.test(cleanTime) ? Number(cleanTime.slice(0, 2)) * 60 + Number(cleanTime.slice(3)) : -1;
  if (!service || cleanName.length < 2 || cleanName.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254 || cleanPhone.length < 9 || cleanPhone.length > 30 || !validDate(date) || startMinute < openMinute || startMinute + (service?.duration || 0) > closeMinute || startMinute % 30 !== 0 || minuteLabel(startMinute) !== cleanTime) {
    return res.status(400).json({ error: 'Confere o nome, e-mail, telemóvel, serviço, data e horário.' });
  }
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (!openDays.has(day)) return res.status(400).json({ error: 'A barbearia está encerrada nesse dia.' });
  const today = localParts();
  const todayString = `${today.year}-${today.month}-${today.day}`;
  const latest = new Date(Date.UTC(Number(today.year), Number(today.month) - 1, Number(today.day) + 60)).toISOString().slice(0, 10);
  if (date < todayString || date > latest || (date === todayString && startMinute <= Number(today.hour) * 60 + Number(today.minute))) {
    return res.status(400).json({ error: 'Escolhe um horário futuro dentro dos próximos 60 dias.' });
  }

  const client = await pool.connect();
  let booking;
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [date]);
    const conflict = await client.query(
      `SELECT 1 FROM bookings WHERE booking_date = $1 AND status = 'confirmed'
       AND start_minute < $2 AND start_minute + duration_minutes > $3 LIMIT 1`,
      [date, startMinute + service.duration, startMinute]
    );
    if (conflict.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Esse horário acabou de ficar ocupado. Escolhe outro horário disponível.' });
    }
    const result = await client.query(
      `INSERT INTO bookings (customer_name, customer_email, customer_phone, service_id, service_name, price_eur, booking_date, start_minute, duration_minutes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, booking_date, start_minute, duration_minutes, service_name, price_eur`,
      [cleanName, cleanEmail, cleanPhone, service.id, service.name, service.price, date, startMinute, service.duration]
    );
    booking = result.rows[0];
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Erro ao guardar marcação:', error);
    return res.status(503).json({ error: 'Não foi possível concluir a marcação. Tenta novamente.' });
  } finally {
    client.release();
  }

  const displayTime = minuteLabel(startMinute);
  const when = localDateLabel(date, displayTime);
  const safeName = escapeHtml(cleanName);
  const safeService = escapeHtml(service.name);
  const info = `<p><strong>${safeName}</strong> marcou <strong>${safeService}</strong>.</p><p>${escapeHtml(when)}<br>${escapeHtml(cleanPhone)} · ${escapeHtml(cleanEmail)}</p><p>Preço indicativo: ${service.price} €</p>`;
  try {
    await Promise.all([
      sendEmail({ to: process.env.OWNER_EMAIL, replyTo: cleanEmail, subject: `Nova marcação · ${safeName} · ${date} ${displayTime}`, html: `<h2>Nova marcação</h2>${info}` }),
      sendEmail({ to: cleanEmail, subject: 'Marcação confirmada · Demonstração', html: `<h2>A tua marcação está confirmada</h2>${info}<p>Se precisares de alterar ou cancelar, contacta-nos através do telefone indicado no site.</p>` })
    ]);
    res.status(201).json({ id: booking.id, message: `Marcação confirmada para ${when}. Enviámos uma confirmação por e-mail.` });
  } catch (error) {
    console.error('Marcação guardada; falhou o envio de notificação:', error);
    res.status(201).json({ id: booking.id, message: `Marcação confirmada para ${when}. O envio do e-mail está pendente; contacta a barbearia se não receberes confirmação.` });
  }
});

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true }); }
  catch { res.status(503).json({ ok: false }); }
});

try {
  await pool.query(`CREATE TABLE IF NOT EXISTS bookings (
    id BIGSERIAL PRIMARY KEY,
    customer_name VARCHAR(80) NOT NULL,
    customer_email VARCHAR(254) NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    service_id VARCHAR(40) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    price_eur INTEGER NOT NULL,
    booking_date DATE NOT NULL,
    start_minute INTEGER NOT NULL CHECK (start_minute >= 540 AND start_minute < 1140),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  app.listen(port, '0.0.0.0', () => console.log(`Barbearia a funcionar na porta ${port}`));
} catch (error) {
  console.error('Não foi possível ligar à base de dados ou preparar a tabela:', error.message);
  process.exit(1);
}
