import {
  ArrowUpRight,
  BookA,
  BookOpen,
  BookPlus,
  Cookie,
  FolderOpen,
  Home,
  Mail,
  Map,
  ScrollText,
  Settings,
  Shield,
  TowerControl,
  type LucideIcon,
} from 'lucide-react';
import { FaDiscord } from 'react-icons/fa';
import { BRAND, UPSTREAM } from '../brand';
import BrandMark from './BrandMark';
import { SiGithub } from 'react-icons/si';
import type { IconType } from 'react-icons';
import { useAuth } from '../hooks/auth/useAuth';
import { useState, useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface VersionData {
  version: string;
  updated_at: string | null;
  updated_by: string;
}

type FooterLink = {
  href: string;
  label: string;
  icon: LucideIcon | IconType;
  external?: boolean;
};

const quickLinks: FooterLink[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/create', label: 'Create Session', icon: BookPlus },
  { href: '/sessions', label: 'My Sessions', icon: FolderOpen },
  { href: '/pfatc', label: 'PFATC Overview', icon: TowerControl },
  { href: '/charts', label: 'Charts', icon: Map },
];

const resourceLinks: FooterLink[] = [
  { href: '/howToUsePFControl', label: 'Guide', icon: BookOpen },
  { href: '/glossary', label: 'Glossary', icon: BookA },
  { href: '/pftracker', label: 'PFTracker → StripLink', icon: BookOpen },
  ...(BRAND.supportEmail
    ? [{ href: `mailto:${BRAND.supportEmail}`, label: BRAND.supportEmail, icon: Mail }]
    : []),
  ...(BRAND.discordUrl
    ? [{ href: BRAND.discordUrl, label: 'Join our Discord', icon: FaDiscord, external: true }]
    : []),
];

const legalLinks: FooterLink[] = [
  ...(BRAND.termsUrl
    ? [{ href: BRAND.termsUrl, label: 'Terms of Use', external: /^https?:/.test(BRAND.termsUrl), icon: ScrollText }]
    : []),
  ...(BRAND.privacyUrl
    ? [{ href: BRAND.privacyUrl, label: 'Privacy Policy', external: /^https?:/.test(BRAND.privacyUrl), icon: Shield }]
    : []),
  ...(BRAND.cookiesUrl
    ? [{ href: BRAND.cookiesUrl, label: 'Cookies Policy', external: /^https?:/.test(BRAND.cookiesUrl), icon: Cookie }]
    : []),
];

const socialLinks: (FooterLink & { hover: string })[] = [
  ...(BRAND.githubUrl
    ? [
        {
          href: BRAND.githubUrl,
          label: 'GitHub',
          icon: SiGithub,
          hover: 'hover:text-white focus-visible:text-white',
        },
      ]
    : []),
  ...(BRAND.discordUrl
    ? [
        {
          href: BRAND.discordUrl,
          label: 'Discord',
          icon: FaDiscord,
          hover: 'hover:text-[#5865F2] focus-visible:text-[#5865F2]',
        },
      ]
    : []),
];

const externalProps = { target: '_blank', rel: 'noopener noreferrer' };

function LinkColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <nav aria-label={title} className="flex flex-col gap-5">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <ul className="flex flex-col gap-4">
        {links.map(({ href, label, icon: Icon, external }) => (
          <li key={href}>
            <a
              href={href}
              {...(external ? externalProps : {})}
              className="group inline-flex cursor-pointer items-center gap-3 rounded-md text-base text-zinc-300 transition-colors outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className="size-[18px] shrink-0 text-zinc-500 transition-colors group-hover:text-blue-400" />
              {label}
              {external && (
                <ArrowUpRight className="size-3.5 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Credit({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      {...externalProps}
      className="cursor-pointer font-medium text-zinc-300 transition-colors hover:text-blue-400"
    >
      {children}
    </a>
  );
}

export default function Footer() {
  const { user } = useAuth();
  const year = new Date().getFullYear();
  const [versionData, setVersionData] = useState<VersionData>({
    version: '2.0.0.3',
    updated_at: null,
    updated_by: 'system',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SERVER_URL || ''}/api/version`
        );
        if (response.ok) {
          const data: VersionData = await response.json();
          setVersionData(data);
        }
      } catch (error) {
        console.error('Failed to fetch version:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVersion();
  }, []);

  const navLinks: FooterLink[] = user
    ? [...quickLinks, { href: '/settings', label: 'Settings', icon: Settings }]
    : quickLinks;

  return (
    <footer className="shadcn-scope border-t border-zinc-800 bg-background text-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-20 px-4 pt-20 pb-16 sm:px-6 md:pt-28 lg:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-3">
            <BrandMark className="size-9" />
            <span className="text-3xl font-semibold tracking-tight">
              StripLink
            </span>
          </div>
        </div>

        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <LinkColumn title="Product" links={navLinks} />
          <LinkColumn title="Resources" links={resourceLinks} />
          {legalLinks.length > 0 && <LinkColumn title="Legal" links={legalLinks} />}
          <div className="flex flex-col gap-5">
            {socialLinks.length > 0 && (
              <h3 className="text-base font-semibold text-white">Follow</h3>
            )}
            <div className="flex flex-wrap items-center gap-6">
              {socialLinks.map(({ href, label, icon: Icon, hover }) => (
                <a
                  key={href}
                  href={href}
                  {...externalProps}
                  aria-label={label}
                  title={label}
                  className={cn(
                    'cursor-pointer rounded-md text-zinc-400 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    hover
                  )}
                >
                  <Icon className="size-8" />
                </a>
              ))}
            </div>
            <div className="mt-auto flex flex-col gap-1.5 pt-4 text-sm text-zinc-500">
              <span className="font-mono text-zinc-400 tabular-nums">
                v{isLoading ? '…' : versionData.version}
              </span>
              <p>
                Charts by <Credit href="https://discord.gg/pfatc">PFATC</Credit>
              </p>
              <p>
                ATIS by{' '}
                <Credit href="https://atisgenerator.com">
                  atisgenerator.com
                </Credit>
              </p>
              <p>
                METAR by{' '}
                <Credit href="https://aviationweather.gov">
                  aviationweather.gov
                </Credit>
              </p>
              <span>
                &copy; {year} StripLink
                {BRAND.owner && (
                  <>
                    {' '}by{' '}
                    {BRAND.ownerUrl ? (
                      <Credit href={BRAND.ownerUrl}>{BRAND.owner}</Credit>
                    ) : (
                      BRAND.owner
                    )}
                  </>
                )}
              </span>
              <span>
                Based on <Credit href={UPSTREAM.url}>{UPSTREAM.name}</Credit> by{' '}
                {UPSTREAM.author} · AGPL-3.0
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
