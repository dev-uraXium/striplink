// StripLink legal pages: Terms of Use, Privacy Policy, Cookies Policy.
// Rendered by the Astro pages /terms, /privacy and /cookies (and the SPA routes).
// Operator name and contact come from src/brand.ts (VITE_BRAND_OWNER, VITE_SUPPORT_EMAIL, VITE_DISCORD_URL).
import type { ReactNode } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { BRAND, UPSTREAM } from '../brand';

export type LegalDoc = 'terms' | 'privacy' | 'cookies';

const UPDATED = '23 November 2026';
const OPERATOR = BRAND.owner || 'the StripLink team';

const TITLES: Record<LegalDoc, string> = {
  terms: 'Terms of Use',
  privacy: 'Privacy Policy',
  cookies: 'Cookies Policy',
};

function Contact() {
  return (
    <>
      {BRAND.supportEmail && (
        <>
          email <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>
        </>
      )}
      {BRAND.supportEmail && BRAND.discordUrl && ' or '}
      {BRAND.discordUrl && (
        <>
          message us on <a href={BRAND.discordUrl}>our Discord server</a>
        </>
      )}
      {!BRAND.supportEmail && !BRAND.discordUrl && 'contact the site operator'}
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Terms() {
  return (
    <>
      <p>
        StripLink is a free flight strip and air traffic control tool for the Roblox game Project Flight, run by{' '}
        {OPERATOR}. By using it you agree to these terms. If you don&apos;t agree, please don&apos;t use StripLink.
      </p>

      <Section title="Who can use StripLink">
        <p>
          You must be at least 13 years old, the minimum age for Discord, which we use for sign-in. If the law where
          you live requires a parent&apos;s permission at your age, you need it. You&apos;re responsible for what
          happens on your account, so keep your Discord account secure.
        </p>
      </Section>

      <Section title="What StripLink is (and isn't)">
        <ul>
          <li>A hobby tool for flight simulation. It is not real air traffic control and must never be used for real aviation.</li>
          <li>Free, with no ads and no paid plans.</li>
          <li>
            Not affiliated with or endorsed by Project Flight, Roblox, Discord, Google, VATSIM or {UPSTREAM.author}.
            StripLink is based on <a href={UPSTREAM.url}>{UPSTREAM.name}</a> by {UPSTREAM.author}, used under the GNU
            AGPL-3.0 licence.
          </li>
        </ul>
      </Section>

      <Section title="Be decent">
        <p>When you use StripLink, including sessions, chat, flight plans, profiles and Google Form responses, don&apos;t:</p>
        <ul>
          <li>harass, threaten, impersonate or discriminate against anyone, or post hateful, sexual or illegal content;</li>
          <li>spam sessions or forms, file fake flight plans to disrupt a session, or abuse another session&apos;s link;</li>
          <li>try to break, overload, scrape at scale or get unauthorised access to StripLink or other people&apos;s accounts;</li>
          <li>get around a ban, a rate limit or any other restriction.</li>
        </ul>
        <p>
          Session owners can remove flights and users from their sessions. We can remove content, suspend or ban
          accounts that break these rules, and we may report illegal content to the authorities.
        </p>
      </Section>

      <Section title="Your content">
        <p>
          You keep ownership of what you submit (flight plans, chat messages, your bio). You let us store and show it
          to the people it&apos;s meant for, such as the controllers of a session you file with, so that StripLink can
          work. Flight plans and public profiles may be visible to other users. Don&apos;t submit anything you
          don&apos;t have the right to share.
        </p>
      </Section>

      <Section title="Google Forms">
        <p>
          If you file through a Google Form, Google hosts the form and its responses under Google&apos;s own terms
          and privacy policy. Your answers are sent to StripLink to create your flight strip. Session owners who
          connect their own form are responsible for that form.
        </p>
      </Section>

      <Section title="Source code">
        <p>
          StripLink is open source under the GNU Affero General Public License v3.0.
          {BRAND.githubUrl && (
            <>
              {' '}
              You can get the source code at <a href={BRAND.githubUrl}>{BRAND.githubUrl}</a>.
            </>
          )}{' '}
          The licence, not these terms, governs your use of the code.
        </p>
      </Section>

      <Section title="No guarantees">
        <p>
          StripLink is provided &quot;as is&quot;, for free. We try to keep it running and accurate but can&apos;t
          promise it will always be available, error-free or that data won&apos;t be lost. Features may change or be
          removed at any time. To the extent the law allows, {OPERATOR} is not liable for indirect or consequential
          losses from using StripLink. Nothing in these terms limits rights you have under consumer law that
          can&apos;t be limited.
        </p>
      </Section>

      <Section title="Ending">
        <p>
          You can stop using StripLink and delete your account at any time from Settings. We may suspend or end
          access for anyone who breaks these terms, or shut StripLink down, ideally with notice.
        </p>
      </Section>

      <Section title="Changes and law">
        <p>
          We may update these terms. We&apos;ll change the date above, and for big changes we&apos;ll show a notice in
          the app. These terms are governed by Belgian law, without depriving you of protections given by the law
          of the country you live in.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions? <Contact />.
        </p>
      </Section>
    </>
  );
}

function Privacy() {
  return (
    <>
      <p>
        This policy explains what personal data StripLink collects, why, and what you can do about it. StripLink is
        run by {OPERATOR}, the data controller for the data described here. We don&apos;t sell your data, show ads or
        use analytics trackers.
      </p>

      <Section title="What we collect">
        <ul>
          <li>
            <b>Your Discord account</b> when you sign in: Discord user ID, username and avatar, plus the sign-in tokens
            Discord gives us (stored encrypted). We never see your Discord password or email.
          </li>
          <li>
            <b>Linked accounts</b>, only if you link them: your Roblox username and VATSIM ID and rating.
          </li>
          <li>
            <b>Profile and settings</b>: your bio, display preferences and privacy choices, and statistics such as
            flights filed and time spent controlling.
          </li>
          <li>
            <b>Flight plans</b>, whether filed on StripLink or through a Google Form: callsign, aircraft, departure,
            arrival, route, level, stand, remarks and the session it was filed to. Controllers of that session can see
            them.
          </li>
          <li>
            <b>Session activity</b>: sessions you create or join, chat messages you send in them, and controller
            ratings and feedback you give.
          </li>
          <li>
            <b>Security data</b>: your IP address (stored encrypted, plus a keyed hash and a short history so we can
            spot ban evasion), a browser identifier computed on your device by the open-source FingerprintJS
            library, and server logs of requests.
          </li>
        </ul>
      </Section>

      <Section title="Why we use it (and the legal basis)">
        <ul>
          <li>
            <b>To run StripLink for you</b> (performance of our terms): sign-in, sessions, flight strips, profiles,
            Google Form intake.
          </li>
          <li>
            <b>To keep it safe and working</b> (our legitimate interest): preventing spam, abuse and ban evasion,
            rate limiting, debugging and fixing problems.
          </li>
          <li>
            <b>To meet legal obligations</b>, such as responding to lawful requests.
          </li>
        </ul>
      </Section>

      <Section title="Who else handles your data">
        <p>We use these services to run StripLink. They process data only to provide their service to us:</p>
        <ul>
          <li><b>Cloudflare</b>: network, security and delivery of the website (global network).</li>
          <li><b>Render</b>: hosts the StripLink server and its cache (Frankfurt, Germany).</li>
          <li><b>Neon</b>: hosts the StripLink database (Frankfurt, Germany).</li>
          <li><b>Discord</b>: sign-in.</li>
          <li><b>Google</b>: only if you use a Google Form; Google&apos;s privacy policy applies to the form itself.</li>
        </ul>
        <p>
          Some of these companies are based in the United States. Where data leaves the EU, they rely on the EU-US
          Data Privacy Framework or the European Commission&apos;s standard contractual clauses.
        </p>
      </Section>

      <Section title="How long we keep it">
        <ul>
          <li>Your account and profile: until you delete your account.</li>
          <li>Flight plans and sessions: while the session exists; flight history logs for up to 365 days.</li>
          <li>Request logs: about 1 day. Admin audit logs: 14 days.</li>
          <li>Security data linked to a ban: as long as the ban applies.</li>
        </ul>
      </Section>

      <Section title="Your rights">
        <p>
          Under the GDPR you can ask to access, correct, delete or export your data, and object to or restrict how we
          use it. You can delete your account yourself in Settings, which removes your account data. For anything
          else, <Contact /> and we&apos;ll reply within one month. If you&apos;re unhappy with how we handle your
          data, you can complain to the Belgian Data Protection Authority (
          <a href="https://www.dataprotectionauthority.be">dataprotectionauthority.be</a>) or the authority where you
          live.
        </p>
      </Section>

      <Section title="Children">
        <p>
          StripLink is not meant for children under 13. If you believe a child under 13 has an account, contact us
          and we&apos;ll delete it.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We&apos;ll update the date above when this policy changes, and show a notice in the app for important
          changes.
        </p>
      </Section>
    </>
  );
}

function Cookies() {
  return (
    <>
      <p>
        StripLink only uses cookies and browser storage that it needs to work. There are no advertising or analytics
        cookies, so there&apos;s nothing to opt in to.
      </p>

      <Section title="Cookies">
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>What it does</th>
                <th>Lasts</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>auth_token</code></td>
                <td>Keeps you signed in.</td>
                <td>Up to 7 days</td>
              </tr>
              <tr>
                <td><code>platform_token</code></td>
                <td>Keeps you signed in across StripLink pages and tools.</td>
                <td>Up to 7 days</td>
              </tr>
              <tr>
                <td><code>fp_token</code></td>
                <td>Security: links your browser identifier to your session to enforce bans.</td>
                <td>7 days</td>
              </tr>
              <tr>
                <td><code>vatsim_force</code></td>
                <td>Only while you link a VATSIM account.</td>
                <td>Minutes</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          All of these are first-party, strictly necessary cookies. Cloudflare, which delivers the site, may also set
          short-lived security cookies to protect it from bots and attacks.
        </p>
      </Section>

      <Section title="Local storage">
        <p>
          StripLink also saves some preferences in your browser&apos;s local storage, such as strip order, notes,
          voice chat settings and which pop-ups you&apos;ve dismissed. This data stays on your device.
        </p>
      </Section>

      <Section title="Managing them">
        <p>
          You can delete cookies and site data in your browser settings at any time. Blocking StripLink&apos;s cookies
          will sign you out and stop sign-in from working.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions? <Contact />. See also our <a href="/privacy">Privacy Policy</a>.
        </p>
      </Section>
    </>
  );
}

const DOCS: Record<LegalDoc, () => ReactNode> = { terms: Terms, privacy: Privacy, cookies: Cookies };

export default function Legal({ doc }: { doc: LegalDoc }) {
  const Doc = DOCS[doc];
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-32 sm:px-6 lg:px-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-400">Legal</p>
        <h1 className="mb-2 text-3xl font-extrabold text-white sm:text-4xl">{TITLES[doc]}</h1>
        <p className="mb-6 text-sm text-zinc-500">Last updated {UPDATED}</p>
        <nav aria-label="Legal pages" className="mb-10 flex flex-wrap gap-2 text-sm">
          {(Object.keys(TITLES) as LegalDoc[]).map((d) => (
            <a
              key={d}
              href={`/${d}`}
              aria-current={d === doc ? 'page' : undefined}
              className={`rounded-full border-2 px-3 py-1 font-semibold transition-colors ${
                d === doc
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-zinc-700 text-zinc-300 hover:border-blue-600 hover:text-white'
              }`}
            >
              {TITLES[d]}
            </a>
          ))}
        </nav>
        <article className="space-y-4 leading-relaxed text-zinc-300 [&_a]:text-blue-400 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-blue-300 [&_b]:text-white [&_code]:rounded [&_code]:bg-zinc-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_code]:text-blue-200 [&_h2]:mb-2 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_li]:mt-2 [&_section_p]:mt-2 [&_table]:mt-3 [&_table]:w-full [&_table]:text-left [&_table]:text-sm [&_td]:border-t [&_td]:border-zinc-800 [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top [&_th]:pb-2 [&_th]:pr-4 [&_th]:text-zinc-400 [&_ul]:list-disc [&_ul]:pl-5">
          <Doc />
        </article>
      </main>
      <Footer />
    </div>
  );
}
