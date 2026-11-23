import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { BRAND } from '../brand';

const SECTIONS = [
  { id: 'what-is-pfcontrol', label: 'What is StripLink?' },
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'creating-a-session', label: 'Creating a Session' },
  { id: 'flight-strips', label: 'Managing Flight Strips' },
  { id: 'submitting-a-flight-plan', label: 'Filing a Flight Plan' },
  { id: 'acars-and-pdc', label: 'Pilot Panel, ACARS & PDC' },
  { id: 'charts', label: 'Charts & Airport Diagrams' },
  { id: 'network-overview', label: 'The Network Overview' },
  { id: 'public-profiles', label: 'Public Profiles' },
  { id: 'ratings-and-feedback', label: 'Ratings & Feedback' },
  { id: 'settings', label: 'Settings & Personalization' },
  { id: 'faq', label: 'FAQ' },
];

function SidebarNav({
  className = '',
  activeSection,
}: {
  className?: string;
  activeSection: string;
}) {
  return (
    <nav aria-label="Guide sections" className={className}>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 px-2.5 mb-2">
        On this page
      </p>
      <ul className="space-y-0.5">
        {SECTIONS.map((s) => {
          const isActive = s.id === activeSection;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={isActive ? 'true' : undefined}
                className={`block rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-zinc-800/40 text-zinc-200'
                    : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100'
                }`}
              >
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Tracks which section's heading is nearest the top of the viewport, so the
 * sidebar can highlight it — the detection line sits near the top (not the
 * literal viewport top) so a section activates as soon as it's the one
 * actually being read, not only once fully scrolled past.
 */
function useActiveSection(): string {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const topMost = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b
        );
        setActiveSection(topMost.target.id);
      },
      { rootMargin: '-100px 0px -70% 0px', threshold: 0 }
    );

    const elements = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null
    );
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return activeSection;
}

export default function HowToUsePFControl() {
  const activeSection = useActiveSection();

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-32">
        <div className="mb-10 max-w-3xl">
          <p className="text-blue-400 text-sm font-semibold uppercase tracking-wide mb-2">
            Guide
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            How to Use StripLink
          </h1>
          <p className="text-zinc-400 text-base sm:text-lg leading-relaxed">
            StripLink is a free, real-time flight strip and ATC coordination
            platform built for Project Flight. This guide walks through
            everything a controller or pilot needs to know — from creating your
            first session to requesting a pre-departure clearance over ACARS.
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-[16rem_1fr] lg:gap-10">
          <aside className="hidden lg:block sticky top-32 self-start max-h-[calc(100vh-4rem)] overflow-y-auto pb-10">
            <SidebarNav activeSection={activeSection} />
          </aside>

          <details className="lg:hidden mb-8 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-zinc-200">
              On this page
            </summary>
            <SidebarNav className="mt-32" activeSection={activeSection} />
          </details>

          <article className="min-w-0 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:text-white [&_h2]:mt-12 [&_h2]:mb-4 [&_h2:first-of-type]:mt-0 [&_h2]:scroll-mt-8 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-white [&_h3]:mt-7 [&_h3]:mb-2 [&_h3]:scroll-mt-8 [&_p]:text-zinc-300 [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:text-zinc-300 [&_ul]:leading-relaxed [&_ul]:mb-4 [&_ul]:pl-5 [&_ul]:list-disc [&_li]:mb-1.5 [&_strong]:text-zinc-100 [&_strong]:font-semibold [&_code]:bg-zinc-800 [&_code]:text-blue-300 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.875em] [&_a]:text-blue-400 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-blue-300">
            <section id="what-is-pfcontrol">
              <h2>What is StripLink?</h2>
              <p>
                StripLink is a live flight strip board for Project Flight. It's
                a fork of{' '}
                <a
                  href="https://github.com/cephie-studios/pfcontrol-2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  PFControl
                </a>{' '}
                by Cephie Studios, so the board itself works the same way: every
                controller in a session sees clearances, runways, squawks and
                statuses update in real time.
              </p>
              <p>
                What StripLink adds is <strong>Google Form intake</strong>.
                Pilots file through a normal Google Form, and each response
                lands on the controller's board as a strip with the squawk,
                runway and SID already filled in. On top of that there's
                network-format ATIS for Discord, PF Radar for covering the whole
                map, and openCharts charts on the board.
              </p>
            </section>

            <section id="getting-started">
              <h2>Getting Started</h2>
              <p>
                Controllers sign in with <a href="/login">Discord</a> from the
                top navigation bar. There's no separate password to create.
              </p>
              <p>
                Pilots don't need an account at all. They file through the
                Google Form their controller posts, and can check their
                clearance on the <a href="/pilot">pilot panel</a> afterwards.
                Signing in is only needed if a pilot wants their flights saved
                to <a href="/my-flights">My Flights</a> or a public profile.
              </p>
            </section>

            <section id="creating-a-session">
              <h2>Creating a Session</h2>
              <p>
                Start from <a href="/create">Create Session</a>. Pick the
                airport by ICAO code, a departure runway and an arrival runway
                (left blank, it matches the departure runway). You land straight
                on the flight strip board, ready for flight plans.
              </p>
              <p>
                <strong>PF Radar</strong> is a special session for one
                controller covering every airport on the map. Strips from any
                airport land on the same board, tagged with their departure
                airport. Only StripLink admins can grant access to it.
              </p>
              <h3>Posting your ATIS</h3>
              <p>
                The ATIS panel builds the post in network format: airport name,
                position lines with each controller's Discord mention, and the
                ATIS in a code block, ready to paste with{' '}
                <strong>Copy for Discord</strong>. PF Radar sessions get one
                post with the ATIS for every airport, sized to fit a single
                Discord message.
              </p>
              <p>
                <strong>PFATC mode</strong> is on by default and keeps the post
                to the PFTracker filing link only, since PFATC doesn't allow
                Google Form or StripLink links. Turn it off in your own servers
                to post the Google Form link as well.
              </p>
              <p>
                Every session you create shows up under{' '}
                <a href="/sessions">My Sessions</a>, where you can rename it,
                jump back in, or delete it when you're done.
              </p>
            </section>

            <section id="flight-strips">
              <h2>Managing Flight Strips</h2>
              <p>
                Once you're in a session, the main view is the flight strip
                board — a live, editable table for departures and a separate one
                for arrivals, both updating for everyone. If another controller
                is editing the same field you're looking at, you'll see a small
                indicator showing who's currently working on it, so two
                controllers don't overwrite each other's changes.
              </p>
              <p>Both tables share a core set of columns:</p>
              <ul>
                <li>
                  <strong>Time</strong> — when the strip was created or last
                  updated.
                </li>
                <li>
                  <strong>Callsign</strong> — the flight's callsign, shown with
                  its parsed airline where recognized.
                </li>
                <li>
                  <strong>Aircraft type</strong> and{' '}
                  <strong>wake turbulence category</strong>.
                </li>
                <li>
                  <strong>Flight type</strong> — IFR or VFR.
                </li>
                <li>
                  <strong>Runway</strong> in use.
                </li>
                <li>
                  <strong>RFL / CFL</strong> — requested and cleared flight
                  level.
                </li>
                <li>
                  <strong>Squawk</strong> — with a one-click button to generate
                  a new random code.
                </li>
                <li>
                  <strong>Status</strong>, shown as a color-coded dropdown.
                </li>
                <li>
                  <strong>Remarks</strong>, plus per-row hide and delete
                  actions.
                </li>
              </ul>
              <p>
                The <strong>departures</strong> table additionally tracks the
                stand, destination airport (ADES), SID, route, a clearance
                checkbox, and a PDC column for pre-departure clearance status. A
                departure's status flow runs{' '}
                <strong>
                  PENDING &rarr; STUP &rarr; PUSH &rarr; TAXI &rarr; RWY &rarr;
                  DEPA
                </strong>
                . The <strong>arrivals</strong> table instead tracks the origin
                airport (ADEP), gate, and STAR, with a status flow of{' '}
                <strong>APP &rarr; RWY &rarr; TAXI &rarr; GATE</strong>.
              </p>
            </section>

            <section id="submitting-a-flight-plan">
              <h2>Filing a Flight Plan</h2>
              <p>
                Pilots file through the Google Form link their controller posts.
                The form asks for the callsign, aircraft, departure and arrival
                airports, cruising level, route and remarks, plus their Roblox
                username. Submitting it puts the flight on the controller's
                board with a <strong>PENDING</strong> status a few seconds
                later.
              </p>
              <p>
                Already filed on PFTracker? The{' '}
                <a href="/pftracker">Send to StripLink</a> button copies that
                plan into the form so there's nothing to type twice. It's
                optional and only runs when the pilot clicks it.
              </p>
              <p>
                Where only PFTracker links are allowed (like PFATC), controllers
                add strips by hand from the board instead.
              </p>
            </section>

            <section id="acars-and-pdc">
              <h2>Pilot Panel, ACARS &amp; PDC</h2>
              <p>
                After filing, the form's confirmation page links to the{' '}
                <a href="/pilot">pilot panel</a>. Enter your callsign and Roblox
                username and it opens your flight's ACARS terminal: your flight
                plan, squawk, clearances and any messages a controller sends
                you.
              </p>
              <p>
                Press <strong>Request PDC</strong> to ask the controller for a
                pre-departure clearance. Once they issue it, it shows up in your
                ACARS log. Controllers can also send a{' '}
                <strong>contact me</strong> message, for example asking you to
                switch frequency. The ACARS panel sits next to notes and airport
                charts, so you can check your SID while taxiing out.
              </p>
            </section>

            <section id="charts">
              <h2>Charts &amp; Airport Diagrams</h2>
              <p>
                The Chart Drawer is a library of airport charts available from
                the toolbar on any session's flight strip board or in the acars
                page. Opening it automatically groups charts by whichever
                airports are relevant to what you're working: the current
                session's departure and arrival airports first, followed by any
                airports tied to your assigned sector, with a full "all
                airports" list underneath for anything else.
              </p>
              <p>
                Charts can be searched by name, type, author, or procedure. If
                you prefer a simpler layout, there's a card-grid view available
                as an alternative to the default split sidebar-and-viewer
                layout, switchable from <a href="/settings">Settings</a>.
              </p>
            </section>

            <section id="network-overview">
              <h2>The Network Overview</h2>
              <p>
                <a href="/overview">Network Overview</a> is a live, network-wide
                dashboard of every open PFATC session at once, showing every
                active departure and arrival across the whole network.
              </p>
              <p>
                Controllers with the right sector permissions can edit flights
                directly from this view.
              </p>
            </section>

            <section id="public-profiles">
              <h2>Profiles</h2>
              <p>
                Every signed-in user gets a public profile page at{' '}
                <code>/user/&lt;username&gt;</code>, showing role badges, a bio,
                and controlling and flying statistics. Profile owners can
                customize their own page directly from the profile page.
              </p>
            </section>

            <section id="ratings-and-feedback">
              <h2>Ratings &amp; Feedback</h2>
              <p>
                After a session, pilots can leave a controller rating with a
                short comment, which contributes to that controller's average
                rating shown on their public profile. Ratings are meant as
                constructive feedback for controllers rather than a public
                callout tool — reports on inappropriate comments are reviewed by
                moderators, and automated checks flag reported or clearly
                inappropriate comments for review as well.
              </p>
            </section>

            <section id="settings">
              <h2>Settings &amp; Personalization</h2>
              <p>
                The Settings page covers account linking (Roblox and VATSIM),
                sound preferences for new strips, chat notifications, and ACARS
                alerts, layout options including combined departures/arrivals
                view and flight row opacity, background image selection for your
                session view, and which columns show up in your departure and
                arrival tables.
              </p>
            </section>

            <section id="faq">
              <h2>Frequently Asked Questions</h2>

              <h3>Do I need an account to use StripLink?</h3>
              <p>
                Not as a pilot: you file through the Google Form and use the
                pilot panel without signing in. You do need a Discord account to
                create sessions as a controller or to get a profile.
              </p>

              <h3>
                What's the difference between a Standard and a PFATC session?
              </h3>
              <p>
                A Standard session is private to you and anyone you share the
                link with and doesn't feature arrivals. A PFATC session
                publishes its traffic to the Network Overview so it's meant for
                organized, network-wide controlling rather than solo practice.
              </p>

              <h3>How do I get a pre-departure clearance?</h3>
              <p>
                File through the Google Form, open the pilot panel from the
                confirmation page, enter your callsign and Roblox username, and
                press Request PDC. The controller will see your request and can
                issue your clearance straight back into your ACARS terminal.
              </p>

              <h3>Is StripLink affiliated with Project Flight?</h3>
              <p>
                No. StripLink is a fork of PFControl by Cephie Studios, run by{' '}
                {BRAND.owner || 'its operator'}. It isn't affiliated with
                PFControl, Cephie Studios, Project Flight or PFATC.
              </p>

              <h3>Is StripLink free?</h3>
              <p>
                Yes — creating sessions, submitting flight plans, and using
                ACARS are all free.
              </p>
            </section>

            <div className="mt-14 pt-8 border-t border-zinc-800 text-sm text-zinc-500">
              {(BRAND.supportEmail || BRAND.discordUrl) && (
                <p>
                  Questions this guide didn't answer? Reach out
                  {BRAND.supportEmail && (
                    <>
                      {' '}
                      at{' '}
                      <a href={`mailto:${BRAND.supportEmail}`}>
                        {BRAND.supportEmail}
                      </a>
                    </>
                  )}
                  {BRAND.supportEmail && BRAND.discordUrl && ' or'}
                  {BRAND.discordUrl && (
                    <>
                      {' '}
                      on{' '}
                      <a
                        href={BRAND.discordUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Discord
                      </a>
                    </>
                  )}
                  .
                </p>
              )}
            </div>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
