// StripLink: Google Form intake settings for a session (owner only)
import { apiFetch } from '../apiFetch.js';
import { apiError } from './error.js';

const API_BASE_URL = import.meta.env.VITE_SERVER_URL;

export interface FormSettings {
  enabled: boolean;
  secret: string | null;
  webhookUrl: string;
  googleFormId: string | null;
  /** The site-wide StripLink form with this session pre-filled (null until an admin sets it up). */
  sharedFormUrl: string | null;
  poller: { available: boolean; serviceAccountEmail: string | null };
}

async function call(
  path: string,
  init: RequestInit = {},
  fallback = 'Request failed'
) {
  const res = await apiFetch(`${API_BASE_URL}/api/forms/session/${path}`, {
    credentials: 'include',
    ...init,
    headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  if (!res.ok) await apiError(res, fallback);
  return res.json();
}

export const fetchFormSettings = (sessionId: string): Promise<FormSettings> =>
  call(sessionId, {}, 'Could not load Google Form settings');

export const enableFormIntake = (sessionId: string): Promise<FormSettings> =>
  call(
    `${sessionId}/enable`,
    { method: 'POST' },
    'Could not turn on Google Form intake'
  );

export const rotateFormSecret = (sessionId: string): Promise<FormSettings> =>
  call(`${sessionId}/rotate`, { method: 'POST' }, 'Could not reset the secret');

export const disableFormIntake = (sessionId: string): Promise<FormSettings> =>
  call(
    `${sessionId}/disable`,
    { method: 'POST' },
    'Could not turn off Google Form intake'
  );

export const setGoogleFormId = (
  sessionId: string,
  formId: string
): Promise<FormSettings> =>
  call(
    `${sessionId}/google-form`,
    { method: 'PUT', body: JSON.stringify({ formId }) },
    'Could not link the form'
  );

export const sendTestFormFlight = (
  sessionId: string
): Promise<{ ok: true; callsign: string }> =>
  call(
    `${sessionId}/test`,
    { method: 'POST' },
    'Could not send the test flight'
  );

export interface SharedFormSetup {
  webhookUrl: string;
  registerUrl: string;
  secret: string;
  configured: boolean;
  editUrl: string | null;
  title: string | null;
  registeredAt: string | null;
  shortUrl: string | null;
}

/** Admin only. */
export async function fetchSharedFormSetup(): Promise<SharedFormSetup> {
  const res = await apiFetch(`${API_BASE_URL}/api/forms/shared/setup`, {
    credentials: 'include',
  });
  if (!res.ok) await apiError(res, 'Could not load the shared form setup');
  return res.json();
}

/** Public: the session's links. shortUrl (forms.gle) is only set for the open PF Radar session. */
export async function fetchPilotLinks(
  sessionId: string
): Promise<{ url: string | null; shortUrl: string | null }> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/forms/link/${encodeURIComponent(sessionId)}`
    );
    if (!res.ok) return { url: null, shortUrl: null };
    const data = (await res.json()) as {
      url: string | null;
      shortUrl?: string | null;
    };
    return { url: data.url, shortUrl: data.shortUrl ?? null };
  } catch {
    return { url: null, shortUrl: null };
  }
}

/** Admin: the forms.gle link PF Radar posts use. */
export async function saveSharedShortLink(
  shortUrl: string | null
): Promise<string | null> {
  const res = await apiFetch(`${API_BASE_URL}/api/forms/shared/short-link`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shortUrl }),
  });
  if (!res.ok) await apiError(res, 'Could not save the short link');
  return ((await res.json()) as { shortUrl: string | null }).shortUrl;
}

/** Public: the session's Google Form pilot link, or null. */
export async function fetchPilotFormLink(
  sessionId: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/forms/link/${encodeURIComponent(sessionId)}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { url: string | null };
    return data.url;
  } catch {
    return null;
  }
}
