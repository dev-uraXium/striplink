// StripLink: optional Google Forms API poller.
// Use this when you can't add an Apps Script to the form (e.g. someone else owns it).
// Needs a service account with the Forms API enabled; share each form with its email.
//   GOOGLE_SERVICE_ACCOUNT_JSON   (the key file's JSON, handy on hosts)  or
//   GOOGLE_SERVICE_ACCOUNT_FILE   (path to the key file)
//   FORMS_POLL_INTERVAL           seconds, default 20
import fs from 'node:fs';
import { forms as formsApi, type forms_v1 } from '@googleapis/forms';
import { GoogleAuth } from 'google-auth-library';
import { mainDb, redisConnection } from '../db/connection.js';
import { prefixKey } from '../utils/cacheTtl.js';
import type { FormAnswers } from './fieldMap.js';
import { fileFormResponse } from './intake.js';

interface Credentials {
  client_email: string;
  private_key: string;
}

function loadCredentials(): Credentials | null {
  try {
    const raw =
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
      (process.env.GOOGLE_SERVICE_ACCOUNT_FILE
        ? fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_FILE, 'utf8')
        : '');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Credentials>;
    return parsed.client_email && parsed.private_key ? (parsed as Credentials) : null;
  } catch (err) {
    console.error('[forms-api] could not read service account:', err);
    return null;
  }
}

const credentials = loadCredentials();

export function formsPollerInfo() {
  return credentials
    ? { available: true, serviceAccountEmail: credentials.client_email }
    : { available: false, serviceAccountEmail: null };
}

const QUESTION_TTL_MS = 5 * 60 * 1000;
const questionMaps = new Map<string, { at: number; map: Record<string, string> }>();
const backoffUntil = new Map<string, number>();

async function questionMap(client: forms_v1.Forms, formId: string) {
  const cached = questionMaps.get(formId);
  if (cached && Date.now() - cached.at < QUESTION_TTL_MS) return cached.map;
  const { data } = await client.forms.get({ formId });
  const map: Record<string, string> = {};
  for (const item of data.items ?? []) {
    const q = item.questionItem?.question;
    if (q?.questionId) map[q.questionId] = item.title || q.questionId;
    for (const gq of item.questionGroupItem?.questions ?? []) {
      if (gq.questionId) map[gq.questionId] = `${item.title ?? ''} ${gq.rowQuestion?.title ?? ''}`.trim();
    }
  }
  questionMaps.set(formId, { at: Date.now(), map });
  return map;
}

function toAnswers(r: forms_v1.Schema$FormResponse, map: Record<string, string>): FormAnswers {
  const answers: FormAnswers = {};
  for (const [qid, ans] of Object.entries(r.answers ?? {})) {
    const values = (ans.textAnswers?.answers ?? []).map((a) => a.value ?? '');
    answers[map[qid] ?? qid] = values.length > 1 ? values : (values[0] ?? '');
  }
  return answers;
}

async function pollForm(client: forms_v1.Forms, formId: string, sessionIds: string[]) {
  const cursorKey = prefixKey(`forms:cursor:${formId}`);
  const cursor = await redisConnection.get(cursorKey);
  if (!cursor) {
    // First time we see this form: start from now so old answers don't flood the board
    await redisConnection.set(cursorKey, new Date().toISOString());
    return;
  }
  const map = await questionMap(client, formId);
  let newest = cursor;
  let pageToken: string | undefined;
  do {
    const { data } = await client.forms.responses.list({
      formId,
      filter: `timestamp > ${cursor}`,
      pageToken,
    });
    for (const r of data.responses ?? []) {
      const answers = toAnswers(r, map);
      for (const sessionId of sessionIds) {
        await fileFormResponse(sessionId, answers, r.responseId).catch((err) =>
          console.warn(`[forms-api] ${formId} -> ${sessionId}:`, err instanceof Error ? err.message : err)
        );
      }
      const t = r.lastSubmittedTime || r.createTime;
      if (t && t > newest) newest = t;
    }
    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken);
  if (newest !== cursor) await redisConnection.set(cursorKey, newest);
}

export function startFormsPoller() {
  if (!credentials) return;
  const auth = new GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/forms.body.readonly',
      'https://www.googleapis.com/auth/forms.responses.readonly',
    ],
  });
  const client = formsApi({ version: 'v1', auth });
  const intervalMs = Math.max(10, Number(process.env.FORMS_POLL_INTERVAL) || 20) * 1000;

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const rows = await mainDb
        .selectFrom('sessions')
        .select(['session_id', 'google_form_id'])
        .where('google_form_id', 'is not', null)
        .where('form_webhook_secret', 'is not', null)
        .execute();
      const byForm = new Map<string, string[]>();
      for (const r of rows) {
        if (!r.google_form_id) continue;
        byForm.set(r.google_form_id, [...(byForm.get(r.google_form_id) ?? []), r.session_id]);
      }
      for (const [formId, sessionIds] of byForm) {
        if ((backoffUntil.get(formId) ?? 0) > Date.now()) continue;
        try {
          await pollForm(client, formId, sessionIds);
        } catch (err) {
          const e = err as { code?: number; message?: string };
          // Not shared with the service account / deleted form: back off for 5 minutes
          if (e.code === 403 || e.code === 404) backoffUntil.set(formId, Date.now() + 5 * 60 * 1000);
          console.warn(`[forms-api] ${formId}:`, e.message ?? err);
        }
      }
    } catch (err) {
      console.error('[forms-api] tick failed:', err);
    } finally {
      running = false;
    }
  };

  console.log(`[forms-api] polling linked Google Forms every ${intervalMs / 1000}s as ${credentials.client_email}`);
  void tick();
  setInterval(tick, intervalMs);
}
