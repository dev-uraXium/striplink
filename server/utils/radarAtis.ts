// StripLink: PF Radar covers every airport, so it generates one ATIS per airport.
// Runway per airport: the one most into the wind from its METAR (first runway when calm).
import { getAirportData } from './getData.js';
import { resolveAviationMetar } from './metarAviationWeather.js';
import { generateAtisText } from './atisGenerator.js';

export interface RadarAirportAtis {
  icao: string;
  name: string;
  runway: string | null;
  text: string | null;
  error?: string;
}

interface AirportRow {
  icao: string;
  name?: string;
  controlName?: string;
  runways?: string[];
  retired?: boolean;
}

/** Airports PF Radar covers: real airports with runways (not the Center/control entries). */
export function radarAirports(): AirportRow[] {
  return (getAirportData() as AirportRow[]).filter(
    (a) => !a.retired && Array.isArray(a.runways) && a.runways.length > 0 && !/center|control/i.test(a.controlName ?? '')
  );
}

/** Runway whose heading is closest to the wind direction. */
export function runwayForWind(runways: string[], metar: string): string {
  const wind = metar.match(/\b(\d{3})(\d{2,3})(G\d{2,3})?KT\b/);
  const dir = wind ? parseInt(wind[1], 10) : NaN;
  const speed = wind ? parseInt(wind[2], 10) : 0;
  if (!Number.isFinite(dir) || speed < 3 || dir === 0) return runways[0];
  let best = runways[0];
  let bestDiff = Infinity;
  for (const rwy of runways) {
    const n = parseInt(rwy, 10);
    if (!Number.isFinite(n)) continue;
    const diff = Math.abs(((n * 10 - dir + 540) % 360) - 180);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = rwy;
    }
  }
  return best;
}

// Small fields with no METAR of their own borrow the nearest reporting station's weather.
const NEAREST_METAR: Record<string, string> = {
  EGHJ: 'EGHI', // Bembridge, Isle of Wight -> Southampton
  X2BH: 'EGHQ', // Bolt Head -> Newquay
  MTCA: 'MTPP', // Les Cayes -> Port-au-Prince
};

async function metarFor(icao: string): Promise<string | null> {
  for (const station of [icao, NEAREST_METAR[icao]].filter(Boolean) as string[]) {
    const result = await resolveAviationMetar(station);
    const raw = result.ok ? result.body.rawOb : undefined;
    if (typeof raw === 'string' && raw.trim()) return raw;
  }
  return null;
}

async function oneAirport(airport: AirportRow, ident: string): Promise<RadarAirportAtis> {
  const name = airport.controlName || airport.name || airport.icao;
  try {
    const metar = await metarFor(airport.icao);
    if (!metar) {
      return { icao: airport.icao, name, runway: null, text: null, error: 'No METAR available' };
    }
    const runway = runwayForWind(airport.runways!, metar);
    const text = generateAtisText({
      stationName: name,
      ident,
      metar,
      landingRunways: [runway],
      departingRunways: [runway],
    });
    return { icao: airport.icao, name, runway, text };
  } catch (err) {
    return {
      icao: airport.icao,
      name,
      runway: null,
      text: null,
      error: err instanceof Error ? err.message : 'Failed',
    };
  }
}

export async function generateRadarAtis(ident: string): Promise<RadarAirportAtis[]> {
  const airports = radarAirports();
  const out: RadarAirportAtis[] = [];
  // A few at a time so METAR lookups don't all hit at once
  for (let i = 0; i < airports.length; i += 4) {
    out.push(...(await Promise.all(airports.slice(i, i + 4).map((a) => oneAirport(a, ident)))));
  }
  return out;
}
