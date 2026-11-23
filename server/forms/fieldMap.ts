// StripLink: turn Google Form answers into StripLink flight fields.
// Question titles are matched case-insensitively with punctuation ignored, so
// "Call sign:" and "Callsign (e.g. BAW123)" both land on `callsign`.
import type { AddFlightData } from '../db/flights.js';

export type FormAnswers = Record<string, string | string[] | null | undefined>;

type Field =
  | 'callsign'
  | 'aircraft_type'
  | 'flight_type'
  | 'departure'
  | 'arrival'
  | 'alternate'
  | 'route'
  | 'cruisingFL'
  | 'stand'
  | 'gate'
  | 'remark'
  | 'roblox_username'
  | 'pilot';

export const FIELD_ALIASES: Record<Field, string[]> = {
  callsign: [
    'callsign',
    'call sign',
    'flight callsign',
    'flight number',
    'flight no',
  ],
  aircraft_type: [
    'aircraft',
    'aircraft type',
    'type',
    'ac type',
    'plane',
    'aircraft icao',
  ],
  flight_type: [
    'flight rules',
    'rules',
    'ifr vfr',
    'ifr or vfr',
    'flight type',
  ],
  departure: [
    'departure',
    'departure airport',
    'departing',
    'from',
    'origin',
    'dep',
    'adep',
  ],
  arrival: [
    'arrival',
    'arrival airport',
    'destination',
    'to',
    'arr',
    'dest',
    'ades',
  ],
  alternate: ['alternate', 'alternate airport', 'altn'],
  route: ['route', 'flight route', 'planned route'],
  cruisingFL: [
    'cruising level',
    'cruising altitude',
    'cruise altitude',
    'cruise level',
    'cruising flight level',
    'requested level',
    'requested altitude',
    'flight level',
    'rfl',
  ],
  stand: ['stand', 'parking stand', 'parking'],
  gate: ['gate'],
  remark: ['remarks', 'remark', 'notes', 'comments', 'other info'],
  roblox_username: ['roblox username', 'roblox', 'roblox name', 'roblox user'],
  pilot: [
    'pilot',
    'pilot name',
    'discord username',
    'discord',
    'username',
    'your name',
    'name',
  ],
};

const norm = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const lookup = new Map<string, Field>();
for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [
  Field,
  string[],
][]) {
  for (const alias of aliases) lookup.set(norm(alias), field);
}

export function fieldForTitle(title: string): Field | null {
  const n = norm(title);
  const exact = lookup.get(n);
  if (exact) return exact;
  // "Callsign (e.g. BAW123)" -> longest alias the title starts with
  let best: { alias: string; field: Field } | null = null;
  for (const [alias, field] of lookup) {
    if (
      alias.length > 2 &&
      n.startsWith(alias + ' ') &&
      (!best || alias.length > best.alias.length)
    ) {
      best = { alias, field };
    }
  }
  return best?.field ?? null;
}

const clip = (v: string, n: number) => v.trim().slice(0, n);

/** "EGKK - London Gatwick" -> "EGKK" */
const icao = (v: string) =>
  clip(v, 4)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

/** StripLink stores levels as 3 digits in hundreds of feet: "FL350" / "35000" / "350" -> "350" */
export function normalizeLevel(v: string) {
  const s = v.toUpperCase().replace(/[\s,]+/g, '');
  const fl = s.match(/^(?:FL)?(\d{1,3})$/);
  if (fl) return fl[1].padStart(3, '0');
  const ft = Number(s.replace(/[^0-9]/g, ''));
  if (ft >= 1000) return String(Math.round(ft / 100)).padStart(3, '0');
  return '';
}

function flightRules(v: string) {
  const s = v.toUpperCase();
  if (s.includes('VFR')) return 'VFR';
  return 'IFR';
}

/**
 * Map answers to the same payload the Submit page sends.
 * Only whitelisted fields come out; anything unmapped is summarised in the remark
 * so controllers still see it.
 */
export function answersToFlight(answers: FormAnswers): {
  flight: AddFlightData;
  unmapped: Record<string, string>;
} {
  const fields: Partial<Record<Field, string>> = {};
  const unmapped: Record<string, string> = {};

  for (const [title, raw] of Object.entries(answers ?? {})) {
    const value = (
      Array.isArray(raw) ? raw.join(', ') : String(raw ?? '')
    ).trim();
    if (!value) continue;
    const field = fieldForTitle(title);
    if (field && !fields[field]) fields[field] = value;
    else unmapped[clip(title, 60)] = clip(value, 120);
  }

  const flight: AddFlightData = {
    callsign: fields.callsign
      ? clip(fields.callsign, 16).toUpperCase().replace(/\s+/g, '')
      : undefined,
    aircraft_type: fields.aircraft_type
      ? clip(fields.aircraft_type, 16).toUpperCase()
      : undefined,
    flight_type: flightRules(fields.flight_type ?? ''),
    departure: fields.departure ? icao(fields.departure) : undefined,
    arrival: fields.arrival ? icao(fields.arrival) : undefined,
    alternate: fields.alternate ? icao(fields.alternate) : undefined,
    route: fields.route ? clip(fields.route, 500).toUpperCase() : undefined,
    cruisingFL: fields.cruisingFL
      ? normalizeLevel(fields.cruisingFL) || undefined
      : undefined,
    stand: fields.stand ? clip(fields.stand, 8).toUpperCase() : undefined,
    gate: fields.gate ? clip(fields.gate, 8).toUpperCase() : undefined,
    roblox_username: fields.roblox_username
      ? clip(fields.roblox_username, 40)
      : undefined,
    status: 'PENDING',
    submitted_via: 'form',
  } as AddFlightData;

  const remarkParts = [
    fields.remark,
    fields.pilot ? `Pilot: ${fields.pilot}` : undefined,
    ...Object.entries(unmapped).map(([q, a]) => `${q}: ${a}`),
  ].filter(Boolean);
  if (remarkParts.length) flight.remark = clip(remarkParts.join(' · '), 300);

  // Drop empty keys so addFlight's defaults (status, SID, runway, squawk) apply
  for (const k of Object.keys(flight)) {
    if (flight[k] === undefined || flight[k] === '') delete flight[k];
  }
  return { flight, unmapped };
}
