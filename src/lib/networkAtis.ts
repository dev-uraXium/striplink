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

export const PFTRACKER_FILE_URL =
  'https://canary.project-flight.com/flight-plan/create';

/** "London Gatwick International Airport" -> "LONDON GATWICK" */
export function networkAirportName(name: string, icao: string) {
  const cleaned = name
    .replace(
      /\b(international|intl\.?|regional|municipal)?\s*(airport|aerodrome|airfield|arpt)\b/gi,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
  return (cleaned || icao).toUpperCase();
}

/** First frequency for a position: exact key (GND) or a prefixed one (S_GND, N_GND). */
export function frequencyFor(
  frequencies: AirportFrequencies,
  position: NetworkPosition
) {
  if (frequencies[position]) return frequencies[position];
  const key = Object.keys(frequencies).find((k) =>
    k.toUpperCase().endsWith(`_${position}`)
  );
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
  const stem = (
    input.controlName || networkAirportName(input.airportName, icao)
  )
    .trim()
    .replace(/\s+(center|centre|control)$/i, ''); // the suffix below adds "Control"
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
    lines.push(
      `${icao}_${pos} "${stemTitle} ${RT_SUFFIX[pos]}" (${freq}): ${mentions}`
    );
  }

  const header = `${networkAirportName(input.airportName, icao)} ${icao}`;
  const body = cleanAtisBody(input.atisText);
  // Flight plan filing links are the only links the network allows. <> stops Discord previews.
  const filing: string[] = [];
  if (input.formLink) filing.push(`FILE YOUR FLIGHT PLAN: <${input.formLink}>`);
  if (input.includePfTracker)
    filing.push(
      input.formLink
        ? `OR PLAN ON PFTRACKER: <${PFTRACKER_FILE_URL}>`
        : `FILE YOUR FLIGHT PLAN ON PFTRACKER: <${PFTRACKER_FILE_URL}>`
    );
  return [
    header,
    '',
    ...lines,
    '',
    '```' + body + '```',
    ...(filing.length ? ['', ...filing] : []),
  ].join('\n');
}

// ---------- PF Radar: one controller, every airport ----------

export const PF_RADAR = {
  position: 'PF_RDR',
  callsign: 'PF Radar',
  frequency: '132.555',
} as const;
export const DISCORD_LIMIT = 2000;

export interface RadarAirport {
  icao: string;
  name: string;
  runway?: string | null;
  text: string | null;
  metar?: string | null;
}

/**
 * Compact METAR-style ATIS, like the network's FIR posts:
 * "GATWICK ARRIVAL AND DEPARTURE INFORMATION A. TIME 1450Z. RWY IN USE 08R. 14004KT 110V170. 9999 FEW027. 7. M0. QNH1024. CONFIRM INFORMATION A ON FIRST CONTACT."
 * `short` drops the wording down further for when even that doesn't fit Discord.
 */
export function compactAtis(
  airport: RadarAirport,
  ident: string,
  short = false
): string | null {
  if (!airport.metar || !airport.runway) return null;
  const parts = airport.metar.trim().toUpperCase().split(/\s+/);
  const time = parts.find((p) => /^\d{6}Z$/.test(p))?.slice(2, 6) ?? '';
  const wind = parts.filter(
    (p) =>
      /^(\d{3}|VRB)\d{2,3}(G\d{2,3})?KT$/.test(p) || /^\d{3}V\d{3}$/.test(p)
  );
  const sky = parts.filter(
    (p) =>
      /^(CAVOK|\d{4}|\d{1,2}SM|(FEW|SCT|BKN|OVC|VV)\d{3}(CB|TCU)?|NCD|NSC|SKC|CLR|[-+]?(VC)?[A-Z]{2,6})$/.test(
        p
      ) &&
      !/^(AUTO|COR|NOSIG|RMK|METAR|SPECI|TEMPO|BECMG)$/.test(p) &&
      p !== airport.icao
  );
  // stop sky at remarks/trend groups
  const rmk = parts.findIndex((p) => /^(RMK|NOSIG|TEMPO|BECMG)$/.test(p));
  const skyBeforeRmk =
    rmk >= 0 ? sky.filter((p) => parts.indexOf(p) < rmk) : sky;
  const temp = parts.find((p) => /^M?\d{2}\/M?\d{2}$/.test(p));
  const [t, d] = temp
    ? temp
        .split('/')
        .map((v) =>
          v.startsWith('M')
            ? `M${parseInt(v.slice(1), 10)}`
            : String(parseInt(v, 10))
        )
    : [];
  const pressure = parts.find((p) => /^[QA]\d{4}$/.test(p));
  const qnh = pressure
    ? pressure.startsWith('Q')
      ? pressure.slice(1)
      : String(Math.round((parseInt(pressure.slice(1), 10) / 100) * 33.8639))
    : null;
  const name = airport.name.toUpperCase();
  const info = short ? 'INFO' : 'ARRIVAL AND DEPARTURE INFORMATION';
  const bits = [
    `${name} ${info} ${ident}`,
    time && (short ? `${time}Z` : `TIME ${time}Z`),
    short ? `RWY ${airport.runway}` : `RWY IN USE ${airport.runway}`,
    wind.join(' '),
    skyBeforeRmk.filter((p) => !wind.includes(p)).join(' '),
    t !== undefined && (short ? `${t}/${d}` : `${t}. ${d}`),
    qnh && `QNH${qnh}`,
    short
      ? `CONFIRM INFO ${ident}`
      : `CONFIRM INFORMATION ${ident} ON FIRST CONTACT`,
  ].filter(Boolean);
  return bits.join('. ') + '.';
}

export type RadarAtisStyle = 'full' | 'compact' | 'short';

export interface RadarNetworkAtisInput {
  controllers: NetworkController[];
  airports: RadarAirport[];
  ident: string;
  style: RadarAtisStyle;
  /** Plain links pilots use to file, e.g. the forms.gle link and PFTracker. */
  links?: string[];
}

/**
 * PF Radar
 *
 * PF_RDR "PF Radar" (132.555): <@id>
 *
 * ```PUNTA CANA ...```
 * ```GATWICK ...```
 *
 * https://forms.gle/...
 * OR
 * https://canary.project-flight.com/flight-plan/create
 */
export function buildRadarNetworkAtis(input: RadarNetworkAtisInput): string {
  const ids = [
    ...new Set(
      input.controllers.map((c) => c.id).filter((id) => /^\d{5,25}$/.test(id))
    ),
  ];
  const lines = ids.length
    ? [
        `${PF_RADAR.position} "${PF_RADAR.callsign}" (${PF_RADAR.frequency}): ${ids.map((id) => `<@${id}>`).join(' ')}`,
      ]
    : [];
  const blocks = input.airports
    .map((a) =>
      input.style === 'full'
        ? a.text
          ? cleanAtisBody(a.text)
          : null
        : compactAtis(a, input.ident, input.style === 'short')
    )
    .filter((b): b is string => Boolean(b))
    .map((b) => '```' + b + '```');
  const links = (input.links ?? []).filter(Boolean);
  const linkLines = links.length
    ? ['', ...links.flatMap((l, i) => (i ? ['OR', l] : [l]))]
    : [];
  return [
    PF_RADAR.callsign,
    '',
    ...lines,
    '',
    blocks.join('\n\n'),
    ...linkLines,
  ].join('\n');
}

/** Longest style that fits in one Discord message (falls back to the shortest). */
export function bestRadarStyle(
  input: Omit<RadarNetworkAtisInput, 'style'>
): RadarAtisStyle {
  for (const style of ['full', 'compact', 'short'] as const) {
    if (buildRadarNetworkAtis({ ...input, style }).length <= DISCORD_LIMIT)
      return style;
  }
  return 'short';
}
