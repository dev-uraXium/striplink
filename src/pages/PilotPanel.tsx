// /pilot: after filing through the Google Form, pilots open their ACARS panel here
// (squawk, PDC, ATIS) with the callsign + Roblox username they filed with.
import { useState } from 'react';
import { Loader2, Plane } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { findPilotPanel } from '../utils/fetch/forms';

export default function PilotPanel() {
  const [callsign, setCallsign] = useState('');
  const [roblox, setRoblox] = useState(() => {
    try {
      return localStorage.getItem('striplinkRoblox') ?? '';
    } catch {
      return '';
    }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const path = await findPilotPanel(callsign, roblox);
      try {
        localStorage.setItem('striplinkRoblox', roblox.trim());
      } catch {
        /* ignore */
      }
      window.location.assign(path);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not find your flight'
      );
      setBusy(false);
    }
  };

  const input =
    'w-full rounded-xl border-2 border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-blue-600';

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="mx-auto max-w-md px-4 py-32">
        <div className="mb-6 flex items-center gap-3">
          <span className="rounded-2xl bg-blue-600/20 p-3 text-blue-400">
            <Plane className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold">Pilot panel</h1>
            <p className="text-sm text-zinc-400">
              Your squawk, PDC and controller messages.
            </p>
          </div>
        </div>
        <form
          onSubmit={open}
          className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
        >
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Callsign</span>
            <input
              value={callsign}
              onChange={(e) => setCallsign(e.target.value.toUpperCase())}
              placeholder="BAW123"
              autoComplete="off"
              className={`${input} font-mono uppercase`}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Roblox username</span>
            <input
              value={roblox}
              onChange={(e) => setRoblox(e.target.value)}
              placeholder="As you entered it in the form"
              autoComplete="off"
              className={input}
              required
            />
          </label>
          {error && (
            <p className="rounded-xl bg-red-900/30 p-3 text-sm text-red-300">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Open my pilot panel
          </button>
        </form>
        <p className="mt-4 text-xs text-zinc-500">
          Works for flight plans filed through the StripLink Google Form in the
          last 6 hours. Use the same callsign and Roblox username you put in the
          form.
        </p>
      </main>
      <Footer />
    </div>
  );
}
