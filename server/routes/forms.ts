// StripLink: Google Forms intake.
//   POST /api/forms/webhook/:sessionId        <- called by the form's Apps Script
//   GET/POST /api/forms/session/:sessionId/*  <- session owner manages it from the board
//   POST /api/forms/shared[/register]         <- the site-wide shared form (see forms/shared.ts)
//   GET  /api/forms/shared/setup               <- admin: what the shared form's script needs
import express from 'express';
import rateLimit from 'express-rate-limit';
import { mainDb } from '../db/connection.js';
import requireAuth from '../middleware/auth.js';
import { requireSessionOwnership } from '../middleware/sessionAccess.js';
import { validateSessionId } from '../utils/validation.js';
import {
  fileFormResponse,
  FormIntakeError,
  getFormSettings,
  newFormSecret,
  secretsMatch,
} from '../forms/intake.js';
import { formsPollerInfo } from '../forms/poller.js';
import { requireAdmin } from '../middleware/admin.js';
import {
  getSharedForm,
  setSharedForm,
  sharedFormLink,
  sharedFormSecret,
  splitSessionAnswer,
  validPrefillTemplate,
} from '../forms/shared.js';
import type { FormAnswers } from '../forms/fieldMap.js';

const router = express.Router();

// Apps Script calls come from shared Google IPs, so limit per session, not per IP.
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => `forms:${req.params.sessionId ?? 'unknown'}`,
  message: { error: 'Too many form submissions for this session. Slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function validSessionParam(id: unknown) {
  try {
    return validateSessionId(String(id));
  } catch {
    return null;
  }
}

function parseAnswers(body: unknown): FormAnswers | null {
  const answers = (body as { answers?: unknown } | null)?.answers;
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return null;
  const out: FormAnswers = {};
  for (const [k, v] of Object.entries(answers as Record<string, unknown>)) {
    if (typeof v === 'string') out[k.slice(0, 200)] = v.slice(0, 1000);
    else if (Array.isArray(v)) out[k.slice(0, 200)] = v.map((x) => String(x).slice(0, 200)).slice(0, 20);
  }
  return out;
}

// POST: /api/forms/webhook/:sessionId - file a Google Form response as a flight
router.post('/webhook/:sessionId', webhookLimiter, async (req, res) => {
  const sessionId = validSessionParam(req.params.sessionId);
  if (!sessionId) return res.status(404).json({ error: 'Session not found' });

  const settings = await getFormSettings(sessionId);
  if (!settings) return res.status(404).json({ error: 'Session not found' });
  if (!settings.form_webhook_secret) {
    return res.status(403).json({ error: 'Google Form intake is turned off for this session' });
  }
  if (!secretsMatch(req.get('x-striplink-secret'), settings.form_webhook_secret)) {
    return res.status(401).json({ error: 'Bad secret' });
  }

  const answers = parseAnswers(req.body);
  if (!answers) return res.status(400).json({ error: 'Expected { "answers": { "Question": "Answer" } }' });

  const responseId =
    typeof req.body?.responseId === 'string' ? req.body.responseId.slice(0, 200) : null;

  try {
    const flight = await fileFormResponse(sessionId, answers, responseId);
    if (!flight) return res.json({ ok: true, duplicate: true });
    res.status(201).json({ ok: true, flightId: flight.id, callsign: flight.callsign });
  } catch (err) {
    if (err instanceof FormIntakeError) return res.status(err.status).json({ error: err.message });
    console.error('[forms] webhook failed:', err);
    res.status(500).json({ error: 'Failed to file the flight' });
  }
});

// ---------- shared form (one form for every session) ----------
function publicBase(req: express.Request) {
  return (process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
}

const sharedLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => {
    const answers = parseAnswers(req.body);
    return `forms:shared:${(answers && splitSessionAnswer(answers).sessionId) || 'unknown'}`;
  },
  message: { error: 'Too many form submissions for this session. Slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST: /api/forms/shared - a response from the shared form; routed by its session answer
router.post('/shared', sharedLimiter, async (req, res) => {
  if (!secretsMatch(req.get('x-striplink-secret'), sharedFormSecret())) {
    return res.status(401).json({ error: 'Bad secret' });
  }
  const answers = parseAnswers(req.body);
  if (!answers) return res.status(400).json({ error: 'Expected { "answers": { "Question": "Answer" } }' });

  const { sessionId: rawSession, rest } = splitSessionAnswer(answers);
  const sessionId = validSessionParam(rawSession);
  if (!sessionId) {
    return res.status(400).json({ error: 'No StripLink session in the response. Pilots must use their controller\'s link.' });
  }
  const settings = await getFormSettings(sessionId);
  if (!settings) return res.status(404).json({ error: 'Session not found' });
  if (!settings.form_webhook_secret) {
    return res.status(403).json({ error: 'Google Form intake is turned off for this session' });
  }

  const responseId =
    typeof req.body?.responseId === 'string' ? req.body.responseId.slice(0, 200) : null;
  try {
    const flight = await fileFormResponse(sessionId, rest, responseId);
    if (!flight) return res.json({ ok: true, duplicate: true });
    res.status(201).json({ ok: true, sessionId, flightId: flight.id, callsign: flight.callsign });
  } catch (err) {
    if (err instanceof FormIntakeError) return res.status(err.status).json({ error: err.message });
    console.error('[forms] shared webhook failed:', err);
    res.status(500).json({ error: 'Failed to file the flight' });
  }
});

// POST: /api/forms/shared/register - the setup script tells StripLink which form to hand out
router.post('/shared/register', async (req, res) => {
  if (!secretsMatch(req.get('x-striplink-secret'), sharedFormSecret())) {
    return res.status(401).json({ error: 'Bad secret' });
  }
  const prefillTemplate = validPrefillTemplate(req.body?.prefillTemplate);
  if (!prefillTemplate) return res.status(400).json({ error: 'Expected a Google Forms pre-filled link' });
  const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  await setSharedForm({
    prefillTemplate,
    editUrl: str(req.body?.editUrl, 500),
    title: str(req.body?.title, 200),
    registeredAt: new Date().toISOString(),
  });
  res.json({ ok: true });
});

// GET: /api/forms/shared/setup - admin only: values for the shared form's setup script
router.get('/shared/setup', requireAuth, requireAdmin, async (req, res) => {
  const config = await getSharedForm();
  const base = publicBase(req);
  res.json({
    webhookUrl: `${base}/api/forms/shared`,
    registerUrl: `${base}/api/forms/shared/register`,
    secret: sharedFormSecret(),
    configured: Boolean(config),
    editUrl: config?.editUrl ?? null,
    title: config?.title ?? null,
    registeredAt: config?.registeredAt ?? null,
  });
});

// DELETE: /api/forms/shared - admin only: stop handing out the shared form
router.delete('/shared', requireAuth, requireAdmin, async (_req, res) => {
  await setSharedForm(null);
  res.json({ ok: true });
});

// ---------- owner settings ----------
const owner = [requireAuth, requireSessionOwnership];

async function settingsPayload(
  req: express.Request,
  row: { session_id: string; form_webhook_secret?: string | null; google_form_id?: string | null }
) {
  const base = publicBase(req);
  const poller = formsPollerInfo();
  const shared = await getSharedForm().catch(() => null);
  return {
    enabled: Boolean(row.form_webhook_secret),
    secret: row.form_webhook_secret ?? null,
    webhookUrl: `${base}/api/forms/webhook/${row.session_id}`,
    googleFormId: row.google_form_id ?? null,
    sharedFormUrl: sharedFormLink(shared, row.session_id),
    poller,
  };
}

async function updateSession(
  sessionId: string,
  values: { form_webhook_secret?: string | null; google_form_id?: string | null }
) {
  await mainDb.updateTable('sessions').set(values).where('session_id', '=', sessionId).execute();
  return getFormSettings(sessionId);
}

// GET: /api/forms/session/:sessionId
router.get('/session/:sessionId', ...owner, async (req, res) => {
  const row = await getFormSettings(String(req.params.sessionId));
  if (!row) return res.status(404).json({ error: 'Session not found' });
  res.json(await settingsPayload(req, row));
});

// POST: /api/forms/session/:sessionId/enable - turn on (keeps an existing secret)
router.post('/session/:sessionId/enable', ...owner, async (req, res) => {
  const current = await getFormSettings(String(req.params.sessionId));
  if (!current) return res.status(404).json({ error: 'Session not found' });
  const row = current.form_webhook_secret
    ? current
    : await updateSession(current.session_id, { form_webhook_secret: newFormSecret() });
  res.json(await settingsPayload(req, row!));
});

// POST: /api/forms/session/:sessionId/rotate - new secret; the old script stops working
router.post('/session/:sessionId/rotate', ...owner, async (req, res) => {
  const row = await updateSession(String(req.params.sessionId), { form_webhook_secret: newFormSecret() });
  if (!row) return res.status(404).json({ error: 'Session not found' });
  res.json(await settingsPayload(req, row));
});

// POST: /api/forms/session/:sessionId/disable
router.post('/session/:sessionId/disable', ...owner, async (req, res) => {
  const row = await updateSession(String(req.params.sessionId), {
    form_webhook_secret: null,
    google_form_id: null,
  });
  if (!row) return res.status(404).json({ error: 'Session not found' });
  res.json(await settingsPayload(req, row));
});

/** Accepts a raw form ID or an editor URL (…/forms/d/<id>/edit). */
function parseFormId(input: unknown): string | null {
  const s = String(input ?? '').trim();
  if (!s) return null;
  const fromUrl = s.match(/\/forms\/d\/(?!e\/)([A-Za-z0-9_-]{20,})/);
  const id = fromUrl ? fromUrl[1] : s;
  return /^[A-Za-z0-9_-]{20,128}$/.test(id) ? id : null;
}

// PUT: /api/forms/session/:sessionId/google-form - form for the Forms API poller ('' clears)
router.put('/session/:sessionId/google-form', ...owner, async (req, res) => {
  const raw = req.body?.formId;
  const formId = raw ? parseFormId(raw) : null;
  if (raw && !formId) {
    return res.status(400).json({
      error:
        "That isn't a form ID. Paste the editor link (…/forms/d/<id>/edit), not the /d/e/… link pilots see.",
    });
  }
  const current = await getFormSettings(String(req.params.sessionId));
  if (!current) return res.status(404).json({ error: 'Session not found' });
  const row = await updateSession(current.session_id, {
    google_form_id: formId,
    // Linking a form also turns intake on
    ...(formId && !current.form_webhook_secret ? { form_webhook_secret: newFormSecret() } : {}),
  });
  res.json(await settingsPayload(req, row!));
});

// POST: /api/forms/session/:sessionId/test - file a sample flight to check the board
router.post('/session/:sessionId/test', ...owner, async (req, res) => {
  const sessionId = String(req.params.sessionId);
  const session = await mainDb
    .selectFrom('sessions')
    .select(['airport_icao'])
    .where('session_id', '=', sessionId)
    .executeTakeFirst();
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const n = Math.floor(Math.random() * 900 + 100);
  try {
    const flight = await fileFormResponse(sessionId, {
      Callsign: `TEST${n}`,
      Aircraft: 'A320',
      'Flight rules': 'IFR',
      Departure: session.airport_icao,
      Arrival: session.airport_icao === 'EGKK' ? 'MDPC' : 'EGKK',
      'Cruising level': '350',
      Route: 'DCT',
      Remarks: 'Test flight from the Google Form setup',
    });
    res.status(201).json({ ok: true, callsign: flight?.callsign });
  } catch (err) {
    if (err instanceof FormIntakeError) return res.status(err.status).json({ error: err.message });
    console.error('[forms] test failed:', err);
    res.status(500).json({ error: 'Failed to file the test flight' });
  }
});

export default router;
