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

async function oneAirport(airport: AirportRow, ident: string): Promise<RadarAirportAtis> {
  const name = airport.controlName || airport.name || airport.icao;
  try {
    const result = await resolveAviationMetar(airport.icao);
    const metar = result.ok ? result.body.rawOb : undefined;
    if (typeof metar !== 'string' || !metar.trim()) {
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
