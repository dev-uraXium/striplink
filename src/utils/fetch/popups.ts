import { apiFetch } from '../apiFetch.js';
import { apiError } from './error.js';

const API_BASE_URL = import.meta.env.VITE_SERVER_URL;

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

export interface AdminPopup extends Popup {
  votes: number[];
}

export async function fetchLivePopup(): Promise<Popup | null> {
  const res = await apiFetch(`${API_BASE_URL}/api/popups/live`, {
    credentials: 'include',
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { popup: Popup | null };
  return data.popup;
}

export async function votePopup(id: number, option: number): Promise<number[]> {
  const res = await apiFetch(`${API_BASE_URL}/api/popups/${id}/vote`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ option }),
  });
  if (!res.ok) await apiError(res, 'Vote failed');
  return ((await res.json()) as { results: number[] }).results;
}

async function admin<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/popups${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) await apiError(res, `HTTP ${res.status}`);
  return res.json();
}

export const fetchAdminPopups = () =>
  admin<{ popups: AdminPopup[] }>('').then((d) => d.popups);

export const createAdminPopup = (input: PopupInput, publish: boolean) =>
  admin<{ popup: Popup }>('', {
    method: 'POST',
    body: JSON.stringify({ ...input, publish }),
  });

export const updateAdminPopup = (id: number, input: PopupInput) =>
  admin<{ popup: Popup }>(`/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });

export const setAdminPopupActive = (id: number, active: boolean) =>
  admin<{ ok: true }>(`/${id}/active`, {
    method: 'PUT',
    body: JSON.stringify({ active }),
  });

export const deleteAdminPopup = (id: number) =>
  admin<{ ok: true }>(`/${id}`, { method: 'DELETE' });
