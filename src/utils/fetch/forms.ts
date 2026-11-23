// StripLink: Google Form intake settings for a session (owner only)
import { apiFetch } from '../apiFetch.js';
import { apiError } from './error.js';

const API_BASE_URL = import.meta.env.VITE_SERVER_URL;

export interface FormSettings {
  enabled: boolean;
  secret: string | null;
  webhookUrl: string;
  googleFormId: string | null;
  poller: { available: boolean; serviceAccountEmail: string | null };
}

async function call(path: string, init: RequestInit = {}, fallback = 'Request failed') {
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
  call(`${sessionId}/enable`, { method: 'POST' }, 'Could not turn on Google Form intake');

export const rotateFormSecret = (sessionId: string): Promise<FormSettings> =>
  call(`${sessionId}/rotate`, { method: 'POST' }, 'Could not reset the secret');

export const disableFormIntake = (sessionId: string): Promise<FormSettings> =>
  call(`${sessionId}/disable`, { method: 'POST' }, 'Could not turn off Google Form intake');

export const setGoogleFormId = (sessionId: string, formId: string): Promise<FormSettings> =>
  call(
    `${sessionId}/google-form`,
    { method: 'PUT', body: JSON.stringify({ formId }) },
    'Could not link the form'
  );

export const sendTestFormFlight = (sessionId: string): Promise<{ ok: true; callsign: string }> =>
  call(`${sessionId}/test`, { method: 'POST' }, 'Could not send the test flight');
