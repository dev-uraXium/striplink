// StripLink popups: cards an admin publishes at the bottom of the site.
// A "notice" is text plus an optional button link; a "poll" is one question with 2-6 answers.
import { sql } from 'kysely';
import { mainDb } from '../db/connection.js';

export type PopupKind = 'notice' | 'poll';
export type PopupAudience = 'everyone' | 'signed_in';

export interface PopupInput {
  kind: PopupKind;
  title: string;
  body: string;
  buttonLabel: string | null;
  buttonUrl: string | null;
  options: string[];
  audience: PopupAudience;
  endsAt: string | null;
}

export interface Popup extends PopupInput {
  id: number;
  active: boolean;
  createdAt: string;
}

const str = (v: unknown, max: number) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

/** Only http(s) links, so a popup button can't run script. */
export function safeUrl(v: unknown): string | null {
  const s = str(v, 500);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:'
      ? u.toString()
      : null;
  } catch {
    return null;
  }
}

export function validatePopupInput(
  body: unknown
): { ok: true; value: PopupInput } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const kind =
    b.kind === 'poll' ? 'poll' : b.kind === 'notice' ? 'notice' : null;
  if (!kind) return { ok: false, error: 'Kind must be notice or poll' };
  const title = str(b.title, 120);
  if (!title) return { ok: false, error: 'Title is required' };
  const text = str(b.body, 1000);
  const buttonUrl = b.buttonUrl ? safeUrl(b.buttonUrl) : null;
  if (b.buttonUrl && !buttonUrl)
    return { ok: false, error: 'Button link must start with https://' };
  const buttonLabel = buttonUrl ? str(b.buttonLabel, 40) || 'Open' : null;
  const options =
    kind === 'poll' && Array.isArray(b.options)
      ? b.options
          .map((o) => str(o, 80))
          .filter(Boolean)
          .slice(0, 6)
      : [];
  if (kind === 'poll' && options.length < 2)
    return { ok: false, error: 'A poll needs at least 2 answers' };
  const audience = b.audience === 'signed_in' ? 'signed_in' : 'everyone';
  let endsAt: string | null = null;
  if (b.endsAt) {
    const d = new Date(String(b.endsAt));
    if (Number.isNaN(d.getTime()))
      return { ok: false, error: 'End date is not valid' };
    endsAt = d.toISOString();
  }
  return {
    ok: true,
    value: {
      kind,
      title,
      body: text,
      buttonLabel,
      buttonUrl,
      options,
      audience,
      endsAt,
    },
  };
}

type Row = {
  id: number;
  kind: PopupKind;
  title: string;
  body: string;
  button_label: string | null;
  button_url: string | null;
  options: string[];
  audience: PopupAudience;
  active: boolean;
  ends_at: Date | null;
  created_at: Date;
};

const toPopup = (r: Row): Popup => ({
  id: r.id,
  kind: r.kind,
  title: r.title,
  body: r.body,
  buttonLabel: r.button_label,
  buttonUrl: r.button_url,
  options: Array.isArray(r.options) ? r.options : [],
  audience: r.audience,
  active: r.active,
  endsAt: r.ends_at ? new Date(r.ends_at).toISOString() : null,
  createdAt: new Date(r.created_at).toISOString(),
});

export async function listPopups(): Promise<(Popup & { votes: number[] })[]> {
  const rows = await sql<Row>`
    SELECT * FROM striplink_popups ORDER BY created_at DESC LIMIT 200
  `.execute(mainDb);
  const votes = await sql<{ popup_id: number; option_idx: number; n: string }>`
    SELECT popup_id, option_idx, count(*) AS n
    FROM striplink_popup_votes GROUP BY popup_id, option_idx
  `.execute(mainDb);
  return rows.rows.map((r) => {
    const p = toPopup(r);
    const counts = p.options.map(() => 0);
    for (const v of votes.rows)
      if (v.popup_id === p.id && v.option_idx < counts.length)
        counts[v.option_idx] = Number(v.n);
    return { ...p, votes: counts };
  });
}

/** The newest popup this visitor may see: switched on, not ended, right audience. */
export async function getLivePopup(signedIn: boolean): Promise<Popup | null> {
  const r = await sql<Row>`
    SELECT * FROM striplink_popups
    WHERE active AND (ends_at IS NULL OR ends_at > now())
      AND (audience = 'everyone' OR ${signedIn})
    ORDER BY created_at DESC LIMIT 1
  `.execute(mainDb);
  return r.rows[0] ? toPopup(r.rows[0]) : null;
}

/** A specific popup, only if it's currently live. */
export async function getLivePopupById(id: number): Promise<Popup | null> {
  const r = await sql<Row>`
    SELECT * FROM striplink_popups
    WHERE id = ${id} AND active AND (ends_at IS NULL OR ends_at > now())
  `.execute(mainDb);
  return r.rows[0] ? toPopup(r.rows[0]) : null;
}

export async function getPopup(id: number): Promise<Popup | null> {
  const r =
    await sql<Row>`SELECT * FROM striplink_popups WHERE id = ${id}`.execute(
      mainDb
    );
  return r.rows[0] ? toPopup(r.rows[0]) : null;
}

export async function createPopup(v: PopupInput, by: string | null) {
  const r = await sql<Row>`
    INSERT INTO striplink_popups
      (kind, title, body, button_label, button_url, options, audience, ends_at, created_by)
    VALUES (${v.kind}, ${v.title}, ${v.body}, ${v.buttonLabel}, ${v.buttonUrl},
      ${JSON.stringify(v.options)}::jsonb, ${v.audience}, ${v.endsAt}, ${by})
    RETURNING *
  `.execute(mainDb);
  return toPopup(r.rows[0]);
}

export async function updatePopup(id: number, v: PopupInput) {
  const r = await sql<Row>`
    UPDATE striplink_popups SET kind = ${v.kind}, title = ${v.title}, body = ${v.body},
      button_label = ${v.buttonLabel}, button_url = ${v.buttonUrl},
      options = ${JSON.stringify(v.options)}::jsonb, audience = ${v.audience},
      ends_at = ${v.endsAt}
    WHERE id = ${id} RETURNING *
  `.execute(mainDb);
  return r.rows[0] ? toPopup(r.rows[0]) : null;
}

export async function setPopupActive(id: number, active: boolean) {
  await sql`UPDATE striplink_popups SET active = ${active} WHERE id = ${id}`.execute(
    mainDb
  );
}

export async function deletePopup(id: number) {
  await sql`DELETE FROM striplink_popups WHERE id = ${id}`.execute(mainDb);
}

/** One vote per voter per poll; voting again changes the answer. */
export async function votePopup(id: number, voter: string, option: number) {
  await sql`
    INSERT INTO striplink_popup_votes (popup_id, voter, option_idx)
    VALUES (${id}, ${voter}, ${option})
    ON CONFLICT (popup_id, voter)
    DO UPDATE SET option_idx = EXCLUDED.option_idx, created_at = now()
  `.execute(mainDb);
}

export async function pollResults(id: number, optionCount: number) {
  const r = await sql<{ option_idx: number; n: string }>`
    SELECT option_idx, count(*) AS n FROM striplink_popup_votes
    WHERE popup_id = ${id} GROUP BY option_idx
  `.execute(mainDb);
  const counts = Array.from({ length: optionCount }, () => 0);
  for (const row of r.rows)
    if (row.option_idx < optionCount) counts[row.option_idx] = Number(row.n);
  return counts;
}
