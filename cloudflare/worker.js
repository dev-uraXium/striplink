/**
 * StripLink edge Worker (Cloudflare Workers free plan).
 *
 * - Serves the whole app on one domain (so the strict auth cookies keep working),
 *   proxying every request, including Socket.io WebSockets, to the Render origin.
 * - Caches hashed static bundles (/assets, /_astro) at Cloudflare's edge.
 * - Pings the origin every 10 minutes (cron trigger) so Render's free instance
 *   never spins down.
 *
 * Variables (Worker → Settings → Variables and Secrets):
 *   ORIGIN        e.g. https://striplink.onrender.com   (plain text)
 *   PROXY_SECRET  same value as PROXY_SECRET on Render   (secret)
 */
const IMMUTABLE = /^\/(assets|_astro)\//;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = new URL(env.ORIGIN);
    const target = new URL(url.pathname + url.search, origin);

    const headers = new Headers(request.headers);
    headers.set('X-Forwarded-Host', url.host);
    headers.set('X-Forwarded-Proto', 'https');
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip && env.PROXY_SECRET) {
      headers.set('X-StripLink-Client-IP', ip);
      headers.set('X-StripLink-Proxy-Secret', env.PROXY_SECRET);
    }

    // WebSocket upgrades are passed straight through.
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      return fetch(target, { method: request.method, headers });
    }

    const init = {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
    };
    if (request.method === 'GET' && IMMUTABLE.test(url.pathname)) {
      init.cf = { cacheEverything: true, cacheTtl: 31536000 };
    }

    try {
      const res = await fetch(target, init);
      // Rewrite absolute redirects that point at the origin back to this host.
      const loc = res.headers.get('Location');
      if (loc && loc.startsWith(origin.origin)) {
        const out = new Response(res.body, res);
        out.headers.set('Location', url.origin + loc.slice(origin.origin.length));
        return out;
      }
      return res;
    } catch {
      return new Response(
        '<!doctype html><meta charset=utf-8><meta http-equiv=refresh content=10><title>StripLink</title>' +
          '<body style="font-family:system-ui;background:#0b1220;color:#cbd5e1;display:grid;place-items:center;height:100vh;margin:0">' +
          '<p>StripLink is starting up — this page refreshes in a few seconds.</p>',
        { status: 503, headers: { 'Content-Type': 'text/html', 'Retry-After': '10' } }
      );
    }
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(fetch(new URL('/health', env.ORIGIN), { headers: { 'User-Agent': 'striplink-keepalive' } }));
  },
};
