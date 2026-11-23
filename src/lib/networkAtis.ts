// PFATC network ATIS message (the format posted in the network's Discord):
//
//   LONDON GATWICK EGKK
//
//   EGKK_TWR "Gatwick Tower" (124.230): <@716944317448585216>
//   EGKK_GND "Gatwick Ground" (121.805): <@303875810350202880>
//
//   ```LONDON GATWICK ... INFORMATION J... CONFIRM INFORMATION J ON FIRST CONTACT.```
//
// Rules: airport name, ICAO_POS lines with Discord @mentions, ATIS in caps,
// no markdown other than the backticks, no emojis, no links.
import type { AirportFrequencies } from '../types/airports';

export const NETWORK_POSITIONS = ['CTR', 'APP', 'TWR', 'GND', 'DEL'] as const;
export type NetworkPosition = (typeof NETWORK_POSITIONS)[number];

const RT_SUFFIX: Record<NetworkPosition, string> = {
  CTR: 'Control',
  APP: 'Approach',
  TWR: 'Tower',
  GND: 'Ground',
  DEL: 'Delivery',
};

export interface NetworkController {
  /** Discord user ID (StripLink user IDs are Discord IDs). */
  id: string;
  /** Position picked on the board: DEL/GND/TWR/APP, or ALL / unset for everything. */
  position: string;
}

export interface NetworkAtisInput {
  icao: string;
  airportName: string;
  controlName?: string;
  frequencies: AirportFrequencies;
  controllers: NetworkController[];
  atisText: string;
  /** The session's Google Form link (the Submit Link). */
  formLink?: string | null;
  /** Also point pilots at the PFTracker flight plan generator. */
  includePfTracker?: boolean;
}

export const PFTRACKER_FILE_URL = 'https://canary.project-flight.com/flight-plan/create';

/** "London Gatwick International Airport" -> "LONDON GATWICK" */
export function networkAirportName(name: string, icao: string) {
  const cleaned = name
    .replace(/\b(international|intl\.?|regional|municipal)?\s*(airport|aerodrome|airfield|arpt)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return (cleaned || icao).toUpperCase();
}

/** First frequency for a position: exact key (GND) or a prefixed one (S_GND, N_GND). */
export function frequencyFor(frequencies: AirportFrequencies, position: NetworkPosition) {
  if (frequencies[position]) return frequencies[position];
  const key = Object.keys(frequencies).find((k) => k.toUpperCase().endsWith(`_${position}`));
  return key ? frequencies[key] : undefined;
}

/** Strips anything the network bans from the ATIS body: markdown, emojis, links, extra whitespace. */
export function cleanAtisBody(text: string) {
  return text
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[`*_~|>#]/g, '')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function buildNetworkAtis(input: NetworkAtisInput): string {
  const icao = input.icao.trim().toUpperCase();
  const stem = (input.controlName || networkAirportName(input.airportName, icao)).trim();
  const stemTitle = stem
    .toLowerCase()
    .replace(/\b\p{L}/gu, (c) => c.toUpperCase());

  const dedicated = new Map<NetworkPosition, string[]>();
  const everything: string[] = [];
  for (const c of input.controllers) {
    if (!/^\d{5,25}$/.test(c.id)) continue; // only real Discord IDs can be mentioned
    const pos = c.position?.toUpperCase();
    if ((NETWORK_POSITIONS as readonly string[]).includes(pos)) {
      const list = dedicated.get(pos as NetworkPosition) ?? [];
      if (!list.includes(c.id)) list.push(c.id);
      dedicated.set(pos as NetworkPosition, list);
    } else if (!everything.includes(c.id)) {
      everything.push(c.id); // ALL / unset: covers every position nobody else has
    }
  }

  const lines: string[] = [];
  for (const pos of NETWORK_POSITIONS) {
    const freq = frequencyFor(input.frequencies, pos);
    if (!freq) continue;
    const ids = dedicated.get(pos) ?? (everything.length ? everything : []);
    if (!ids.length) continue;
    const mentions = ids.map((id) => `<@${id}>`).join(' ');
    lines.push(`${icao}_${pos} "${stemTitle} ${RT_SUFFIX[pos]}" (${freq}): ${mentions}`);
  }

  const header = `${networkAirportName(input.airportName, icao)} ${icao}`;
  const body = cleanAtisBody(input.atisText);
  // Flight plan filing links are the only links the network allows. <> stops Discord previews.
  const filing: string[] = [];
  if (input.formLink) filing.push(`FILE YOUR FLIGHT PLAN: <${input.formLink}>`);
  if (input.includePfTracker) filing.push(`OR PLAN ON PFTRACKER: <${PFTRACKER_FILE_URL}>`);
  return [header, '', ...lines, '', '```' + body + '```', ...(filing.length ? ['', ...filing] : [])].join('\n');
}
