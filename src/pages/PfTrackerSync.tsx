// /pftracker: pilots grab the opt-in "Import Flight Plan" bookmarklet here.
import { useEffect, useRef, useState } from 'react';
import { Bookmark, Copy, Check } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { buildBookmarklet } from '../lib/pftrackerBookmarklet';

export default function PfTrackerSync() {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const url = buildBookmarklet(window.location.origin);
    setCode(url);
    // React refuses javascript: hrefs, so set it directly on the element.
    linkRef.current?.setAttribute('href', url);
  }, []);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-32 sm:px-6 lg:px-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-400">
          For pilots
        </p>
        <h1 className="mb-4 text-3xl font-extrabold sm:text-4xl">
          Send your PFTracker plan to StripLink
        </h1>
        <p className="mb-10 leading-relaxed text-zinc-300">
          Already filed your flight plan on PFTracker? One click copies it into
          your controller&apos;s StripLink flight plan form, so you don&apos;t
          type it twice. It&apos;s optional: it only runs when you click it, and
          you still check the form before you submit.
        </p>

        <ol className="space-y-8">
          <li className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="mb-2 font-bold">
              1. Add the button to your bookmarks (once)
            </h2>
            <p className="mb-4 text-sm text-zinc-400">
              Show your bookmarks bar (Ctrl+Shift+B, or Cmd+Shift+B on Mac),
              then drag this button onto it.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                ref={linkRef}
                onClick={(e) => {
                  e.preventDefault();
                  alert(
                    'Drag this button to your bookmarks bar, then click it on PFTracker.'
                  );
                }}
                className="inline-flex cursor-grab items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500"
              >
                <Bookmark className="h-4 w-4" /> Import Flight Plan
              </a>
              <button
                type="button"
                onClick={copy}
                disabled={!code}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-blue-600 hover:text-white"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? 'Copied' : 'Copy code instead'}
              </button>
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Can&apos;t drag? Click &quot;Copy code instead&quot;, add a new
              bookmark named Import Flight Plan, and paste the code as its URL.
            </p>
          </li>

          <li className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="mb-2 font-bold">2. File your plan on PFTracker</h2>
            <p className="text-sm text-zinc-400">
              Use the{' '}
              <a
                href="https://canary.project-flight.com/flight-plan/create"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 underline underline-offset-2"
              >
                PFTracker flight plan generator
              </a>{' '}
              as usual and press Generate Flight.
            </p>
          </li>

          <li className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="mb-2 font-bold">3. Click Import Flight Plan</h2>
            <p className="text-sm text-zinc-400">
              While you&apos;re on PFTracker, click the bookmark. The StripLink
              flight plan form opens with your callsign, airports, route and
              level filled in. Check it, add your aircraft if it&apos;s missing,
              and press Submit.
            </p>
          </li>
        </ol>

        <p className="mt-10 text-xs leading-relaxed text-zinc-500">
          The button runs in your own browser and only reads your own PFTracker
          flight plan. StripLink doesn&apos;t receive anything until you submit
          the form. Doesn&apos;t work on phones, since mobile browsers
          don&apos;t run bookmark buttons. PFTracker is run by Project Flight;
          StripLink isn&apos;t affiliated with it, and if PFTracker changes,
          this button may need an update.
        </p>
      </main>
      <Footer />
    </div>
  );
}
