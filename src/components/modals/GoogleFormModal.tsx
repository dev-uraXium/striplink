// StripLink: connect a Google Form to this session. Every response becomes a
// pending departure/arrival, filed through the same path as the Submit page.
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Check,
  ClipboardList,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Send,
  X,
} from 'lucide-react';
import Button from '../common/Button';
import { useData } from '../../hooks/data/useData';
import { buildAppsScript } from '../../lib/formsAppsScript';
import {
  disableFormIntake,
  enableFormIntake,
  fetchFormSettings,
  rotateFormSecret,
  sendTestFormFlight,
  setGoogleFormId,
  type FormSettings,
} from '../../utils/fetch/forms';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  airportIcao: string;
}

const RECOGNISED =
  'Callsign, Aircraft, Flight rules, Departure, Arrival, Cruising level, Route, Stand, Gate, Remarks, Roblox username, Pilot';

export default function GoogleFormModal({ isOpen, onClose, sessionId, airportIcao }: Props) {
  const { airports } = useData();
  const [settings, setSettings] = useState<FormSettings | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [formIdInput, setFormIdInput] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!isOpen || !sessionId) return;
    setError('');
    fetchFormSettings(sessionId)
      .then((s) => {
        setSettings(s);
        setFormIdInput(s.googleFormId ?? '');
      })
      .catch((e: Error) => setError(e.message));
  }, [isOpen, sessionId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Session airport first so sendTestFlight departs from here
  const airportList = useMemo(() => {
    const list = airports.map((a) => `${a.icao} - ${a.name}`);
    const own = list.find((a) => a.startsWith(`${airportIcao} `));
    return own ? [own, ...list.filter((a) => a !== own)] : list;
  }, [airports, airportIcao]);

  if (!isOpen) return null;

  const run = async (label: string, fn: () => Promise<FormSettings | void>, done?: string) => {
    setBusy(label);
    try {
      const next = await fn();
      if (next) {
        setSettings(next);
        setFormIdInput(next.googleFormId ?? '');
      }
      if (done) toast.success(done);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    } catch {
      toast.error('Could not copy, select the text and copy it manually');
    }
  };

  const isLocal = settings ? /\/\/(localhost|127\.0\.0\.1|\[::1\])/.test(settings.webhookUrl) : false;
  const script = settings?.secret ? buildAppsScript(settings.webhookUrl, settings.secret, airportList) : '';

  const CopyButton = ({ id, text, label }: { id: string; text: string; label?: string }) => (
    <button
      type="button"
      onClick={() => copy(id, text)}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-blue-600 px-3 py-1 text-xs font-semibold text-blue-300 transition-colors hover:bg-blue-600 hover:text-white"
    >
      {copied === id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied === id ? 'Copied' : (label ?? 'Copy')}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="google-form-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border-2 border-blue-600 bg-zinc-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-2">
              <ClipboardList className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 id="google-form-title" className="text-xl font-bold text-white">
                Google Form
              </h2>
              <p className="text-sm text-zinc-400">
                Every response becomes a pending flight on this board
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6 text-sm text-zinc-300">
          {error && (
            <p className="rounded-2xl border border-red-600/40 bg-red-600/10 p-4 text-red-300">
              {error.includes('owner') ? 'Only the session owner can set up a Google Form.' : error}
            </p>
          )}

          {!settings && !error && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            </div>
          )}

          {settings && !settings.enabled && (
            <div className="space-y-4">
              <p>
                Let pilots file through a Google Form instead of (or as well as) the submit link. Turning this on
                gives the session a private webhook; you paste a short script into the form and every response
                lands here as a pending strip, with the squawk, runway and SID filled in like a normal submission.
              </p>
              <Button
                onClick={() => run('enable', () => enableFormIntake(sessionId), 'Google Form intake is on')}
                disabled={busy !== null}
              >
                {busy === 'enable' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Turn on Google Form intake
              </Button>
            </div>
          )}

          {settings?.enabled && settings.secret && (
            <>
              {isLocal && (
                <div className="flex gap-3 rounded-2xl border border-yellow-600/40 bg-yellow-600/10 p-4 text-yellow-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    This StripLink runs on your own computer, which Google can't reach. Real form responses only
                    arrive once StripLink is hosted (or behind a tunnel). <b>Send a test flight</b> below works
                    locally.
                  </p>
                </div>
              )}

              <ol className="space-y-4">
                <li className="flex gap-3">
                  <Step n={1} />
                  <div className="flex-1 space-y-2">
                    <p>
                      Open your form in Google Forms, then <b className="text-white">⋮ → Apps Script</b>. Replace
                      the code there with this script (it already contains this session's link and secret):
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <CopyButton id="script" text={script} label="Copy Apps Script" />
                      <span className="text-xs text-zinc-500">Keep it private, the secret lets anyone file flights here.</span>
                    </div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Step n={2} />
                  <p className="flex-1">
                    Optional, on an empty form: run <Code>buildFlightPlanForm</Code> to add the questions with
                    airport dropdowns.
                  </p>
                </li>
                <li className="flex gap-3">
                  <Step n={3} />
                  <p className="flex-1">
                    Run <Code>installTrigger</Code> once and approve Google's permission prompt. Then run{' '}
                    <Code>sendTestFlight</Code>; a TEST strip should appear here.
                  </p>
                </li>
              </ol>

              <div className="space-y-2 rounded-2xl border border-zinc-800 bg-black/30 p-4">
                <Row label="Webhook URL">
                  <code className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-200">{settings.webhookUrl}</code>
                  <CopyButton id="url" text={settings.webhookUrl} />
                </Row>
                <Row label="Secret">
                  <code className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-200">
                    {showSecret ? settings.secret : '•'.repeat(24)}
                  </code>
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    aria-label={showSecret ? 'Hide secret' : 'Show secret'}
                    className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <CopyButton id="secret" text={settings.secret} />
                </Row>
                <p className="pt-1 text-xs text-zinc-500">
                  Recognised question titles: {RECOGNISED}. Anything else is added to the strip's remarks.
                </p>
              </div>

              {settings.poller.available && (
                <div className="space-y-2 rounded-2xl border border-zinc-800 p-4">
                  <p className="font-semibold text-white">Can't add a script to the form?</p>
                  <p className="text-zinc-400">
                    Share the form with <Code>{settings.poller.serviceAccountEmail}</Code> (as editor) and paste
                    its editor link below. StripLink will check it for new responses every few seconds.
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={formIdInput}
                      onChange={(e) => setFormIdInput(e.target.value)}
                      placeholder="https://docs.google.com/forms/d/…/edit"
                      className="min-w-0 flex-1 rounded-full border-2 border-blue-600 bg-gray-800 px-4 py-1.5 text-white outline-none focus:border-blue-400"
                    />
                    <Button
                      size="sm"
                      disabled={busy !== null}
                      onClick={() =>
                        run(
                          'link',
                          () => setGoogleFormId(sessionId, formIdInput.trim()),
                          formIdInput.trim() ? 'Form linked' : 'Form unlinked'
                        )
                      }
                    >
                      {formIdInput.trim() ? 'Link form' : 'Unlink'}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-5">
                <Button
                  size="sm"
                  disabled={busy !== null}
                  onClick={() =>
                    run('test', async () => {
                      const r = await sendTestFormFlight(sessionId);
                      toast.success(`Test flight ${r.callsign} filed`);
                    })
                  }
                >
                  {busy === 'test' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send a test flight
                </Button>
                <span className="flex-1" />
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy !== null}
                  onClick={() => {
                    if (!confirmReset) return setConfirmReset(true);
                    setConfirmReset(false);
                    void run('rotate', () => rotateFormSecret(sessionId), 'New secret made, paste the script again');
                  }}
                >
                  {confirmReset ? 'Click again: the old script will stop working' : 'Reset secret'}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={busy !== null}
                  onClick={() => run('disable', () => disableFormIntake(sessionId), 'Google Form intake is off')}
                >
                  Turn off
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
      {n}
    </span>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-blue-200">{children}</code>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-xs font-medium text-zinc-500">{label}</span>
      {children}
    </div>
  );
}
