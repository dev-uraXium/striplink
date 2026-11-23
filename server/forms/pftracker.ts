// StripLink: opt-in import of a pilot's own PFTracker flight plan.
// PFTracker (canary.project-flight.com) loads a pilot's active plan from this public,
// undocumented endpoint by Roblox username. We only call it when the pilot asks us to
// (the "Import my PFTracker flight plan" answer), and treat any failure as "not found".
import type { FormAnswers } from './fieldMap.js';

const ENDPOINT = 'https://api.project-flight.com/v4/traffic/flight-plans';

export interface PfTrackerPlan {
  id?: string;
  user?: string;
  departureInfo?: {
    departureAirport?: string;
    arrivalAirport?: string;
    alternateAirport?: string;
  };
  selections?: {
    flightRules?: string;
    departureRunway?: string;
    arrivalRunway?: string;
    altitude?: number | string;
  };
  routeInfo?: { route?: string };
  aircraftInfo?: {
    callsign?: string;
    aircraftType?: string;
    aircraft?: string;
    type?: string;
    airframe?: string;
  };
  active?: boolean;
}

export async function fetchPfTrackerPlan(
  robloxUsername: string
): Promise<PfTrackerPlan | null> {
  const username = robloxUsername.trim();
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return null; // Roblox username rules
  try {
    const res = await fetch(
      `${ENDPOINT}?username=${encodeURIComponent(username)}`,
      {
        headers: {
          'User-Agent': 'StripLink (pilot-requested flight plan import)',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (!res.ok) {
      if (res.status !== 404) {
        const body = (await res.text().catch(() => ''))
          .slice(0, 200)
          .replace(/\s+/g, ' ');
        console.warn(`[pftracker] ${res.status} for ${username}: ${body}`);
      }
      return null;
    }
    const plan = (await res.json()) as PfTrackerPlan;
    if (!plan || plan.active === false) return null;
    if (plan.user && plan.user.toLowerCase() !== username.toLowerCase())
      return null;
    return plan;
  } catch (err) {
    console.warn(
      '[pftracker] request failed:',
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/** PFTracker plan -> form-style answers that fieldMap understands. */
export function planToAnswers(plan: PfTrackerPlan): FormAnswers {
  const d = plan.departureInfo ?? {};
  const s = plan.selections ?? {};
  const a = plan.aircraftInfo ?? {};
  const altitude = Number(s.altitude);
  const runways = [
    s.departureRunway && `DEP RWY ${s.departureRunway}`,
    s.arrivalRunway && `ARR RWY ${s.arrivalRunway}`,
  ]
    .filter(Boolean)
    .join(' ');
  return {
    Callsign: a.callsign,
    Aircraft: a.aircraftType || a.aircraft || a.type || a.airframe,
    'Flight rules': s.flightRules,
    Departure: d.departureAirport,
    Arrival: d.arrivalAirport,
    Alternate: d.alternateAirport,
    Route: plan.routeInfo?.route,
    'Cruising level':
      Number.isFinite(altitude) && altitude > 0
        ? String(Math.round(altitude / 100))
        : undefined,
    Remarks: `PFTracker plan${runways ? ` (${runways})` : ''}`,
  };
}

const IMPORT_TITLE = /pf\s*tracker|import.*flight\s*plan/i;

/** Did the pilot opt in? Looks for a yes to the "Import my PFTracker flight plan" question. */
export function wantsPfTrackerImport(answers: FormAnswers): boolean {
  return Object.entries(answers).some(([title, value]) => {
    if (!IMPORT_TITLE.test(title)) return false;
    const v = (
      Array.isArray(value) ? value.join(' ') : String(value ?? '')
    ).trim();
    return /^(yes|y|oui|ja|true)\b/i.test(v);
  });
}

/** Removes the opt-in question so it doesn't end up in the strip's remarks. */
export function withoutImportQuestion(answers: FormAnswers): FormAnswers {
  return Object.fromEntries(
    Object.entries(answers).filter(([title]) => !IMPORT_TITLE.test(title))
  );
}

/** Pilot's own answers win; the plan fills whatever they left blank. */
export function mergeAnswers(plan: FormAnswers, own: FormAnswers): FormAnswers {
  const merged: FormAnswers = { ...plan };
  for (const [title, value] of Object.entries(own)) {
    const v = Array.isArray(value) ? value.join(', ') : String(value ?? '');
    if (!v.trim()) continue;
    // replace the plan's value for the same field (titles may differ slightly)
    for (const k of Object.keys(merged))
      if (k.toLowerCase() === title.toLowerCase()) delete merged[k];
    merged[title] = value;
  }
  return merged;
}
