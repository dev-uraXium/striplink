export type DeploymentChannel = 'production' | 'canary';

export function resolveChannelFromHostname(
  hostname: string
): DeploymentChannel | null {
  const normalized = hostname.trim().toLowerCase();

  // StripLink: production is the host the API lives on (VITE_SERVER_URL)
  let productionHost = '';
  try {
    productionHost = new URL(import.meta.env.VITE_SERVER_URL ?? '').hostname.toLowerCase();
  } catch {
    productionHost = '';
  }
  if (
    import.meta.env.PROD &&
    productionHost &&
    (normalized === productionHost || normalized === `www.${productionHost}`)
  ) {
    return 'production';
  }
  if (normalized.startsWith('canary.')) {
    return 'canary';
  }

  return null;
}

export function getCurrentDeploymentChannel(): DeploymentChannel | null {
  if (typeof window === 'undefined') return null;
  return resolveChannelFromHostname(window.location.hostname);
}
