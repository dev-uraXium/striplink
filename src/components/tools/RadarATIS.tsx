// StripLink PF Radar: generate one ATIS per airport and the network post for all of them.
import { useEffect, useMemo, useState } from 'react';
import { Copy, Loader, MessageSquare, Radar } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import { Checkbox } from '@/components/ui/checkbox';
import Button from '../common/Button';
import {
  PanelBody,
  PanelFooter,
  PanelHeader,
  PanelSection,
  SidePanel,
} from '../common/SidePanel';
import {
  generateRadarATIS,
  type RadarAirportAtis,
} from '../../utils/fetch/atis';
import { fetchPilotLinks } from '../../utils/fetch/forms';
import {
  bestRadarStyle,
  buildRadarNetworkAtis,
  DISCORD_LIMIT,
  PF_RADAR,
  PFTRACKER_FILE_URL,
  type RadarAtisStyle,
} from '../../lib/networkAtis';
import type { SessionUser } from '../../types/session';

interface Props {
  sessionId?: string;
  open: boolean;
  onClose: () => void;
  /** Unused: the radar ATIS is saved by the REST endpoint, not the single-airport socket flow. */
  socket?: Socket;
  sessionUsers?: SessionUser[];
  onAtisUpdate?: (atis: {
    letter: string;
    text: string;
    timestamp?: number;
  }) => void;
}

export default function RadarATIS({
  sessionId,
  open,
  onClose,
  sessionUsers = [],
  onAtisUpdate,
}: Props) {
  const [ident, setIdent] = useState('A');
  const [airports, setAirports] = useState<RadarAirportAtis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [links, setLinks] = useState<{
    url: string | null;
    shortUrl: string | null;
  }>({ url: null, shortUrl: null });
  const [style, setStyle] = useState<RadarAtisStyle | 'auto'>('auto');
  const [includeLinks, setIncludeLinks] = useState(true);

  useEffect(() => {
    if (!open || !sessionId) return;
    let cancelled = false;
    fetchPilotLinks(sessionId).then((l) => !cancelled && setLinks(l));
    return () => {
      cancelled = true;
    };
  }, [open, sessionId]);

  const generate = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await generateRadarATIS(sessionId, ident);
      setAirports(data.airports);
      onAtisUpdate?.({
        letter: data.letter,
        text: data.atisText,
        timestamp: Date.parse(data.timestamp),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate the ATIS');
    } finally {
      setLoading(false);
    }
  };

  const formLink = links.shortUrl ?? links.url;
  const baseInput = useMemo(
    () => ({
      controllers: sessionUsers.map((u) => ({
        id: u.id,
        position: u.position,
      })),
      airports,
      ident,
      links: includeLinks
        ? [formLink ?? '', PFTRACKER_FILE_URL].filter(Boolean)
        : [],
    }),
    [sessionUsers, airports, ident, includeLinks, formLink]
  );
  const effectiveStyle: RadarAtisStyle =
    style === 'auto' ? bestRadarStyle(baseInput) : style;
  const post = useMemo(
    () =>
      airports.some((a) => a.text)
        ? buildRadarNetworkAtis({ ...baseInput, style: effectiveStyle })
        : '',
    [airports, baseInput, effectiveStyle]
  );

  const copy = async () => {
    await navigator.clipboard.writeText(post);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const failed = airports.filter((a) => !a.text);

  return (
    <SidePanel open={open}>
      <PanelHeader icon={Radar} title="PF Radar ATIS" onClose={onClose}>
        <span className="rounded-full bg-zinc-800 px-2.5 py-1 font-mono text-xs text-zinc-300">
          {PF_RADAR.position} {PF_RADAR.frequency}
        </span>
      </PanelHeader>

      <PanelBody>
        <p className="text-sm text-zinc-400">
          One ATIS for every airport, from its live METAR. Each airport gets the
          runway most into the wind.
        </p>

        <PanelSection title="ATIS Identifier">
          <div className="grid grid-cols-9 gap-1.5">
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => setIdent(letter)}
                className={`rounded-lg border-2 py-1 font-mono text-sm font-bold ${
                  ident === letter
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-zinc-800 text-zinc-300 hover:border-zinc-600'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </PanelSection>

        {error && (
          <div className="rounded-2xl border border-red-700 bg-red-900/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {airports.length > 0 && (
          <PanelSection
            title={`Airports (${airports.length - failed.length}/${airports.length})`}
          >
            <ul className="space-y-1 text-xs">
              {airports.map((a) => (
                <li
                  key={a.icao}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="font-mono text-zinc-300">
                    {a.icao}{' '}
                    <span className="font-sans text-zinc-500">{a.name}</span>
                  </span>
                  {a.text ? (
                    <span className="font-mono text-green-400">
                      RWY {a.runway}
                    </span>
                  ) : (
                    <span className="text-amber-400">
                      {a.error ?? 'skipped'}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </PanelSection>
        )}

        {post && (
          <PanelSection
            title="Network format (Discord)"
            actions={
              <Button
                onClick={copy}
                size="xs"
                variant={copied ? 'success' : 'primary'}
                className="h-8 gap-1.5"
              >
                {copied ? (
                  <Copy className="h-3.5 w-3.5" />
                ) : (
                  <MessageSquare className="h-3.5 w-3.5" />
                )}
                {copied ? 'Copied!' : 'Copy for Discord'}
              </Button>
            }
          >
            <div className="max-h-80 overflow-y-auto whitespace-pre-wrap break-words rounded-2xl border border-zinc-800 bg-black p-4 font-mono text-xs text-zinc-300">
              {post}
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
              <Checkbox
                checked={includeLinks}
                onCheckedChange={(c) => setIncludeLinks(c === true)}
              />
              Add flight plan links (
              {links.shortUrl ? 'short form link' : 'form link'} and PFTracker)
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="mr-1 text-zinc-400">ATIS style</span>
              {(['auto', 'full', 'compact', 'short'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={`rounded-full border-2 px-2.5 py-0.5 font-semibold capitalize ${
                    style === s
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
                  }`}
                >
                  {s === 'auto' ? `Auto (${effectiveStyle})` : s}
                </button>
              ))}
            </div>
            <p
              className={`mt-2 text-xs ${post.length > DISCORD_LIMIT ? 'text-amber-400' : 'text-zinc-500'}`}
            >
              {post.length}/{DISCORD_LIMIT} characters
              {post.length > DISCORD_LIMIT &&
                ': too long for one Discord message, pick a shorter style or post it in two.'}
            </p>
          </PanelSection>
        )}
      </PanelBody>

      <PanelFooter>
        <Button onClick={onClose} variant="outline" size="sm">
          Close
        </Button>
        <Button
          onClick={generate}
          disabled={loading || !sessionId}
          size="sm"
          className="gap-2"
        >
          {loading && <Loader className="h-4 w-4 animate-spin" />}
          {airports.length
            ? 'Regenerate all airports'
            : 'Generate for all airports'}
        </Button>
      </PanelFooter>
    </SidePanel>
  );
}
