import { useEffect, useState } from 'react';
import { ExternalLink, Megaphone, Vote, X } from 'lucide-react';
import { fetchLivePopup, votePopup, type Popup } from '../utils/fetch/popups';

// Remembers which popups this browser closed or voted on.
const KEY = 'striplink:popups';

function seen(): Record<string, 'closed' | number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

function remember(id: number, value: 'closed' | number) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...seen(), [id]: value }));
  } catch {
    // storage unavailable: it just shows again next visit
  }
}

/** The popup an admin published, as a card at the bottom of the site. */
export function PopupCard({
  popup,
  onClose,
  preview = false,
}: {
  popup: Popup;
  onClose?: () => void;
  preview?: boolean;
}) {
  const [results, setResults] = useState<number[] | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = results?.reduce((a, b) => a + b, 0) ?? 0;

  const vote = async (i: number) => {
    if (preview) {
      setPicked(i);
      setResults(popup.options.map((_, j) => (j === i ? 1 : 0)));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setResults(await votePopup(popup.id, i));
      setPicked(i);
      remember(popup.id, i);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vote failed');
    } finally {
      setBusy(false);
    }
  };

  const Icon = popup.kind === 'poll' ? Vote : Megaphone;

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900/95 p-4 text-left text-white shadow-2xl backdrop-blur">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold break-words">{popup.title}</p>
          {popup.body && (
            <p className="mt-1 text-sm break-words whitespace-pre-wrap text-zinc-300">
              {popup.body}
            </p>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {popup.kind === 'poll' && (
        <div className="mt-3 space-y-2">
          {popup.options.map((opt, i) =>
            results ? (
              <div
                key={i}
                className="relative overflow-hidden rounded-lg border border-zinc-700 px-3 py-2 text-sm"
              >
                <div
                  className="absolute inset-y-0 left-0 bg-blue-600/30"
                  style={{
                    width: `${total ? (results[i] / total) * 100 : 0}%`,
                  }}
                />
                <div className="relative flex justify-between gap-2">
                  <span className={picked === i ? 'font-semibold' : ''}>
                    {opt}
                  </span>
                  <span className="text-zinc-400">
                    {total ? Math.round((results[i] / total) * 100) : 0}%
                  </span>
                </div>
              </div>
            ) : (
              <button
                key={i}
                type="button"
                disabled={busy}
                onClick={() => void vote(i)}
                className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-left text-sm hover:border-blue-500 hover:bg-zinc-800 disabled:opacity-50"
              >
                {opt}
              </button>
            )
          )}
          {results && (
            <p className="text-xs text-zinc-500">
              Thanks for voting · {total} {total === 1 ? 'vote' : 'votes'}
            </p>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}

      {popup.buttonUrl && (
        <a
          href={popup.buttonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold hover:bg-blue-500"
        >
          {popup.buttonLabel || 'Open'}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

export default function BottomPopup() {
  const [popup, setPopup] = useState<Popup | null>(null);

  useEffect(() => {
    // Not on the admin panel: the Popups page has its own preview
    if (window.location.pathname.startsWith('/admin')) return;
    let cancelled = false;
    // Wait a moment so the popup doesn't land on top of the page loading
    const t = setTimeout(() => {
      fetchLivePopup()
        .then((p) => {
          if (!cancelled && p && seen()[p.id] === undefined) setPopup(p);
        })
        .catch(() => {});
    }, 1500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  if (!popup) return null;

  const close = () => {
    remember(popup.id, 'closed');
    setPopup(null);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-md animate-in fade-in slide-in-from-bottom-4">
        <PopupCard key={popup.id} popup={popup} onClose={close} />
      </div>
    </div>
  );
}
