import crypto from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';

/**
 * When the app runs behind the StripLink Cloudflare Worker (cloudflare/worker.js),
 * every request reaches the server from Cloudflare's egress IPs. The Worker
 * forwards the real visitor IP in `x-striplink-client-ip`, signed with a shared
 * secret so nobody can spoof it by calling the origin directly.
 */
export function proxyClientIp(headers: IncomingHttpHeaders): string | null {
  const expected = process.env.PROXY_SECRET;
  if (!expected) return null;
  const given = headers['x-striplink-proxy-secret'];
  const ip = headers['x-striplink-client-ip'];
  if (typeof given !== 'string' || typeof ip !== 'string' || !ip.trim())
    return null;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return ip.trim();
}
