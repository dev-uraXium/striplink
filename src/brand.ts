// StripLink branding. Set these in .env.vite.* (VITE_ prefix) to show your own links;
// anything left empty is hidden in the UI.
const env = import.meta.env;

export const BRAND = {
  name: 'StripLink',
  owner: env.VITE_BRAND_OWNER || '',
  ownerUrl: env.VITE_BRAND_OWNER_URL || '',
  supportEmail: env.VITE_SUPPORT_EMAIL || '',
  discordUrl: env.VITE_DISCORD_URL || '',
  githubUrl: env.VITE_GITHUB_URL || '',
  termsUrl: env.VITE_TERMS_URL || '',
  privacyUrl: env.VITE_PRIVACY_URL || '',
  cookiesUrl: env.VITE_COOKIES_URL || '',
} as const;

// AGPL-3.0: StripLink is a modified version of PFControl, keep this credit.
export const UPSTREAM = {
  name: 'PFControl',
  author: 'Cephie Studios',
  url: 'https://github.com/cephie-studios/pfcontrol-2',
} as const;

export const hasLegalLinks = Boolean(BRAND.termsUrl || BRAND.privacyUrl || BRAND.cookiesUrl);
