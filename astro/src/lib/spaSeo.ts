// StripLink: the `site` from astro.config (PUBLIC_SITE_URL)
export const SPA_SITE_URL = String(
  (import.meta as ImportMeta & { env?: { SITE?: string } }).env?.SITE ?? ''
).replace(/\/+$/, '');

export const SPA_DEFAULT_TITLE = 'StripLink';

export const SPA_META_DESCRIPTION =
  'StripLink is the next-generation flight strip platform for real-time coordination between air traffic controllers. Secure, reliable, and collaborative.';

export const SPA_DEFAULT_KEYWORDS =
  'StripLink, Project Flight, PTFS, Pilot Training Flight Simulator, Roblox aviation, flight strips, air traffic control, ATC, real-time, aviation games, collaborative, sessions, pilots, controllers, Roblox ATC, Project Flight ATC, aviation simulator, flight control, tower control';

export const SPA_OG_TITLE =
  'StripLink - Flight Strips for Project Flight & Roblox Aviation';

export const SPA_OG_DESCRIPTION =
  'The next-generation flight strip platform built for real-time coordination between air traffic controllers in Project Flight, PTFS, and Roblox aviation games with outstanding reliability.';

export const SPA_TWITTER_TITLE =
  'StripLink - Flight Strips for Project Flight & Roblox Aviation';

export const SPA_TWITTER_DESCRIPTION =
  'Professional flight strip platform for Project Flight, PTFS, and other Roblox aviation games. Real-time ATC coordination made easy.';

export const SPA_WEBSITE_SEARCH_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'StripLink',
  url: SPA_SITE_URL,
  description:
    'The next-generation flight strip platform built for real-time coordination between air traffic controllers.',
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SPA_SITE_URL}/user/{search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
} as const;

export const SPA_WEB_APPLICATION_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'StripLink',
  description: SPA_META_DESCRIPTION,
  url: `${SPA_SITE_URL}/`,
  applicationCategory: 'GameApplication',
  operatingSystem: 'Web',
  inLanguage: 'en-US',
  image: `${SPA_SITE_URL}/assets/images/hero.webp`,
  keywords: SPA_DEFAULT_KEYWORDS,
  author: {
    '@type': 'Organization',
    name: 'Coral Reef Studios',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Coral Reef Studios',
    url: SPA_SITE_URL,
  },
};
