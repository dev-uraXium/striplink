import { Request } from 'express';
import { proxyClientIp } from './proxyClientIp.js';

const TRUST_PROXY = process.env.TRUST_PROXY_HEADERS === 'true';

export function getClientIp(req: Request): string {
  const proxied = proxyClientIp(req.headers);
  if (proxied) return proxied;

  if (TRUST_PROXY) {
    const cfIp = req.headers['cf-connecting-ip'];
    if (cfIp) {
      const ip = Array.isArray(cfIp) ? cfIp[0] : cfIp;
      if (ip) return ip;
    }

    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ip = Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded.split(',')[0];
      if (ip) return ip.trim();
    }
  }

  return req.socket.remoteAddress || req.ip || 'unknown';
}
