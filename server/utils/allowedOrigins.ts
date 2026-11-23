// Origins allowed to call the API and open sockets.
// StripLink: driven by FRONTEND_URL (+ optional EXTRA_ORIGINS) instead of a hardcoded domain.
const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:4321', 'http://localhost:9901'];

export function allowedOrigins(): string[] {
  const configured = [process.env.FRONTEND_URL, ...(process.env.EXTRA_ORIGINS ?? '').split(',')]
    .map((o) => o?.trim().replace(/\/+$/, ''))
    .filter((o): o is string => Boolean(o));
  const list = process.env.NODE_ENV === 'production' ? configured : [...DEV_ORIGINS, ...configured];
  return [...new Set(list)];
}
