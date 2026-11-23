// StripLink: one Google Form shared by every session.
// The site admin runs the setup script once on a form they own; it registers the
// form's pre-filled link here. Each session then hands pilots that link with its
// own session ID filled in, and responses are routed by that answer.
import crypto from 'node:crypto';
import { sql } from 'kysely';
import { mainDb } from '../db/connection.js';
import type { FormAnswers } from './fieldMap.js';

export const SESSION_PLACEHOLDER = '__STRIPLINK_SESSION__';
const SETTINGS_KEY = 'shared_google_form';

export interface SharedFormConfig {
  prefillTemplate: string; // viewform URL with SESSION_PLACEHOLDER as the session answer
  editUrl: string | null;
  title: string | null;
  registeredAt: string;
}

/** Secret the shared form's Apps Script sends. FORMS_SHARED_SECRET, else derived from JWT_SECRET. */
export function sharedFormSecret(): string {
  if (process.env.FORMS_SHARED_SECRET) return process.env.FORMS_SHARED_SECRET;
  return crypto
    .createHmac('sha256', String(process.env.JWT_SECRET))
    .update('striplink-shared-google-form-v1')
    .digest('base64url')
    .slice(0, 32);
}

let cache: { at: number; value: SharedFormConfig | null } | null = null;

export async function getSharedForm(): Promise<SharedFormConfig | null> {
  if (cache && Date.now() - cache.at < 60_000) return cache.value;
  const { rows } = await sql<{ value: SharedFormConfig }>`
    SELECT value FROM striplink_settings WHERE key = ${SETTINGS_KEY}
  `.execute(mainDb);
  const value = rows[0]?.value ?? null;
  cache = { at: Date.now(), value };
  return value;
}

export async function setSharedForm(config: SharedFormConfig | null) {
  if (config) {
    await sql`
      INSERT INTO striplink_settings (key, value, updated_at)
      VALUES (${SETTINGS_KEY}, ${JSON.stringify(config)}::jsonb, now())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `.execute(mainDb);
  } else {
    await sql`DELETE FROM striplink_settings WHERE key = ${SETTINGS_KEY}`.execute(mainDb);
  }
  cache = { at: Date.now(), value: config };
}

export function sharedFormLink(config: SharedFormConfig | null, sessionId: string) {
  return config ? config.prefillTemplate.replace(SESSION_PLACEHOLDER, encodeURIComponent(sessionId)) : null;
}

/** Valid only if it's a Google Forms pre-filled link carrying the placeholder. */
export function validPrefillTemplate(url: unknown): string | null {
  if (typeof url !== 'string' || url.length > 2000) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.hostname !== 'docs.google.com') return null;
    if (!u.pathname.startsWith('/forms/')) return null;
    return url.includes(SESSION_PLACEHOLDER) ? url : null;
  } catch {
    return null;
  }
}

const SESSION_TITLES = new Set(['striplink session', 'session', 'session id', 'session code', 'striplink session id']);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Pulls the session answer out of a shared-form response. */
export function splitSessionAnswer(answers: FormAnswers): { sessionId: string | null; rest: FormAnswers } {
  let sessionId: string | null = null;
  const rest: FormAnswers = {};
  for (const [title, value] of Object.entries(answers)) {
    if (SESSION_TITLES.has(norm(title))) {
      const v = Array.isArray(value) ? value[0] : value;
      if (typeof v === 'string' && v.trim()) sessionId = v.trim();
    } else {
      rest[title] = value;
    }
  }
  return { sessionId, rest };
}
