// StripLink branding. Set these in .env.vite.* (VITE_ prefix) to show your own links;
// anything left empty is hidden in the UI (legal links default to the built-in pages).
const env = import.meta.env;

export const BRAND = {
  name: 'StripLink',
  owner: env.VITE_BRAND_OWNER || '',
  ownerUrl: env.VITE_BRAND_OWNER_URL || '',
  supportEmail: env.VITE_SUPPORT_EMAIL || '',
  discordUrl: env.VITE_DISCORD_URL || '',
  githubUrl: env.VITE_GITHUB_URL || '',
  // Built-in pages (src/pages/Legal.tsx); point these elsewhere to use your own
  termsUrl: env.VITE_TERMS_URL || '/terms',
  privacyUrl: env.VITE_PRIVACY_URL || '/privacy',
  cookiesUrl: env.VITE_COOKIES_URL || '/cookies',
} as const;

// AGPL-3.0: StripLink is a modified version of PFControl, keep this credit.
export const UPSTREAM = {
  name: 'PFControl',
  author: 'Cephie Studios',
  url: 'https://github.com/cephie-studios/pfcontrol-2',
} as const;

export const hasLegalLinks = Boolean(BRAND.termsUrl || BRAND.privacyUrl || BRAND.cookiesUrl);
