import type { Request } from 'express';
import { DEPLOYMENT } from './cacheTtl.js';

export const KNOWN_DEPLOYMENT_CHANNELS = ['production', 'canary'];

/** StripLink: the production host is whatever FRONTEND_URL points at. */
export function isProductionHost(host: string): boolean {
  let configured = '';
  try {
    configured = process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL).hostname.toLowerCase() : '';
  } catch {
    configured = '';
  }
  const h = host.split(',')[0].trim().toLowerCase().split(':')[0];
  return Boolean(configured) && process.env.NODE_ENV === 'production' && (h === configured || h === `www.${configured}`);
}

export function resolveChannelFromHostname(host: string): string {
  const normalized = host.split(',')[0].trim().toLowerCase();

  if (isProductionHost(normalized)) {
    return 'production';
  }
  if (normalized.startsWith('canary.')) {
    return 'canary';
  }

  return DEPLOYMENT;
}

export function resolveChannelFromHost(req: Request): string {
  return resolveChannelFromHostname(
    req.get('host') || req.get('x-forwarded-host') || ''
  );
}
