import { apiFetch } from '../apiFetch.js';
import { apiError } from './error.js';
const API_BASE_URL = import.meta.env.VITE_SERVER_URL;

export interface ATISGenerateRequest {
  sessionId: string;
  ident: string;
  icao: string;
  remarks1?: string;
  remarks2?: Record<string, unknown>;
  landing_runways: string[];
  departing_runways: string[];
  metar?: string;
}

export interface ATISGenerateResponse {
  atisText: string;
  ident: string;
  timestamp: string;
}

export async function generateATIS(
  data: ATISGenerateRequest
): Promise<ATISGenerateResponse> {
  const response = await apiFetch(`${API_BASE_URL}/api/atis/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await apiError(response, `Server responded with ${response.status}`);
  }

  return response.json();
}

export interface RadarAirportAtis {
  icao: string;
  name: string;
  runway: string | null;
  text: string | null;
  metar?: string | null;
  error?: string;
}

export interface RadarAtisResponse {
  letter: string;
  timestamp: string;
  airports: RadarAirportAtis[];
  atisText: string;
}

/** StripLink PF Radar: one ATIS per airport. */
export async function generateRadarATIS(
  sessionId: string,
  ident: string
): Promise<RadarAtisResponse> {
  const response = await apiFetch(`${API_BASE_URL}/api/atis/generate-radar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ sessionId, ident }),
  });
  if (!response.ok) {
    await apiError(response, `Server responded with ${response.status}`);
  }
  return response.json();
}
