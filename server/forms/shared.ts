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
  /** The form's questions and their entry IDs, for building fully pre-filled links. */
  fields?: SharedFormField[];
  /** forms.gle short link to the plain form (no session), set by an admin. */
  shortUrl?: string | null;
}

/** Only Google Forms short links (forms.gle) or docs.google.com/forms links. */
export function validShortUrl(url: unknown): string | null {
  if (typeof url !== 'string' || url.length > 300) return null;
  try {
    const u = new URL(url.trim());
    if (u.protocol !== 'https:') return null;
    if (u.hostname === 'forms.gle' && /^\/[A-Za-z0-9]{6,40}$/.test(u.pathname))
      return u.toString();
    if (u.hostname === 'docs.google.com' && u.pathname.startsWith('/forms/'))
      return u.toString();
    return null;
  } catch {
    return null;
  }
}

/** The PF Radar session that takes form responses without a session: newest one opened in the last day. */
export async function activeRadarSessionId(): Promise<string | null> {
  const { rows } = await sql<{ session_id: string }>`
    SELECT session_id FROM sessions
    WHERE is_radar = true AND form_webhook_secret IS NOT NULL
      AND created_at > now() - interval '24 hours'
    ORDER BY created_at DESC LIMIT 1
  `.execute(mainDb);
  return rows[0]?.session_id ?? null;
}

export interface SharedFormField {
  title: string;
  entry: string; // "entry.123456"
  type: string; // TEXT, LIST, MULTIPLE_CHOICE, PARAGRAPH_TEXT, ...
  choices?: string[];
}

/** Validates the fields list sent by the form's script. */
export function parseFormFields(raw: unknown): SharedFormField[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: SharedFormField[] = [];
  for (const f of raw.slice(0, 40)) {
    if (!f || typeof f !== 'object') continue;
    const { title, entry, type, choices } = f as Record<string, unknown>;
    if (
      typeof title !== 'string' ||
      typeof entry !== 'string' ||
      !/^entry\.\d{1,15}$/.test(entry)
    )
      continue;
    out.push({
      title: title.slice(0, 120),
      entry,
      type: typeof type === 'string' ? type.slice(0, 32) : 'TEXT',
      choices: Array.isArray(choices)
        ? choices
            .filter((c): c is string => typeof c === 'string')
            .slice(0, 300)
            .map((c) => c.slice(0, 120))
        : undefined,
    });
  }
  return out.length ? out : undefined;
}

export interface PrefillValues {
  roblox?: string;
  callsign?: string;
  aircraft?: string;
  rules?: string;
  dep?: string;
  arr?: string;
  level?: string;
  route?: string;
  remarks?: string;
}

const PREFILL_FIELDS: { key: keyof PrefillValues; titles: RegExp }[] = [
  { key: 'roblox', titles: /roblox/i },
  { key: 'callsign', titles: /^call ?sign/i },
  { key: 'aircraft', titles: /^aircraft/i },
  { key: 'rules', titles: /flight rules|^rules/i },
  { key: 'dep', titles: /^departure/i },
  { key: 'arr', titles: /^arrival/i },
  { key: 'level', titles: /cruis|flight level|^level/i },
  { key: 'route', titles: /^route/i },
  { key: 'remarks', titles: /^remark/i },
];

/** A choice that matches the value: exact (IFR) or by ICAO prefix ("EGKK - London Gatwick ..."). */
function matchChoice(choices: string[], value: string) {
  const v = value.trim().toUpperCase();
  return (
    choices.find((c) => c.trim().toUpperCase() === v) ??
    choices.find(
      (c) =>
        c.trim().toUpperCase().startsWith(`${v} `) ||
        c.trim().toUpperCase().startsWith(`${v}-`)
    )
  );
}

/** Session link with as many questions pre-filled as the registered fields allow. */
export function buildPrefilledLink(
  config: SharedFormConfig,
  sessionId: string,
  values: PrefillValues
) {
  const url = new URL(
    config.prefillTemplate.replace(
      SESSION_PLACEHOLDER,
      encodeURIComponent(sessionId)
    )
  );
  for (const { key, titles } of PREFILL_FIELDS) {
    const value = values[key]?.trim();
    if (!value) continue;
    const field = config.fields?.find((f) => titles.test(f.title));
    if (!field) continue;
    let answer: string | undefined = value.slice(0, 500);
    if (field.choices?.length) answer = matchChoice(field.choices, value);
    if (answer) url.searchParams.set(field.entry, answer);
  }
  return url.toString();
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
    await sql`DELETE FROM striplink_settings WHERE key = ${SETTINGS_KEY}`.execute(
      mainDb
    );
  }
  cache = { at: Date.now(), value: config };
}

export function sharedFormLink(
  config: SharedFormConfig | null,
  sessionId: string
) {
  return config
    ? config.prefillTemplate.replace(
        SESSION_PLACEHOLDER,
        encodeURIComponent(sessionId)
      )
    : null;
}

/** Valid only if it's a Google Forms pre-filled link carrying the placeholder. */
export function validPrefillTemplate(url: unknown): string | null {
  if (typeof url !== 'string' || url.length > 2000) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.hostname !== 'docs.google.com')
      return null;
    if (!u.pathname.startsWith('/forms/')) return null;
    return url.includes(SESSION_PLACEHOLDER) ? url : null;
  } catch {
    return null;
  }
}

const SESSION_TITLES = new Set([
  'striplink session',
  'session',
  'session id',
  'session code',
  'striplink session id',
]);
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Pulls the session answer out of a shared-form response. */
export function splitSessionAnswer(answers: FormAnswers): {
  sessionId: string | null;
  rest: FormAnswers;
} {
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
