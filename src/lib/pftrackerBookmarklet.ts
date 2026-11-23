// "Import Flight Plan" bookmarklet. The pilot clicks it on PFTracker
// (canary.project-flight.com) in their own browser: it reads THEIR flight plan there and
// opens the StripLink Google Form pre-filled with it. No link to paste: the form's
// session-less responses go to the open PF Radar session. Nothing runs
// unless the pilot clicks it, and StripLink's servers never contact Project Flight.

/** Readable source, kept for review. `__STRIPLINK__` is replaced with the site URL. */
export const BOOKMARKLET_SOURCE = `(async () => {
  const STRIPLINK = '__STRIPLINK__';
  if (!/(^|\\.)project-flight\\.com$/.test(location.hostname)) {
    alert('Open PFTracker (canary.project-flight.com) and file your flight plan first, then click Import Flight Plan.');
    return;
  }
  const viewId = (location.pathname.match(/flight-plan\\/view\\/([0-9a-f-]{36})/i) || [])[1];
  let query;
  if (viewId) {
    query = 'id=' + viewId;
  } else {
    const user = prompt('Your Roblox username (to find your PFTracker flight plan):', localStorage.getItem('striplinkRoblox') || '');
    if (!user) return;
    localStorage.setItem('striplinkRoblox', user.trim());
    query = 'username=' + encodeURIComponent(user.trim());
  }
  let plan;
  try {
    const res = await fetch('https://api.project-flight.com/v4/traffic/flight-plans?' + query);
    if (!res.ok) throw new Error(String(res.status));
    plan = await res.json();
  } catch (e) {
    alert('No active PFTracker flight plan found. File one on PFTracker first.');
    return;
  }
  const d = plan.departureInfo || {}, s = plan.selections || {}, a = plan.aircraftInfo || {};
  const alt = Number(s.altitude);
  const params = new URLSearchParams({
    roblox: plan.user || '',
    callsign: a.callsign || '',
    aircraft: a.aircraftType || a.aircraft || a.type || '',
    rules: s.flightRules || '',
    dep: d.departureAirport || '',
    arr: d.arrivalAirport || '',
    level: alt > 0 ? String(Math.round(alt / 100)) : '',
    route: (plan.routeInfo || {}).route || '',
    remarks: 'From PFTracker' + (s.departureRunway ? ' (DEP RWY ' + s.departureRunway + (s.arrivalRunway ? ', ARR RWY ' + s.arrivalRunway : '') + ')' : ''),
  });
  window.open(STRIPLINK + '/api/forms/prefill?' + params.toString(), '_blank');
})();`;

/** The javascript: URL to drag to the bookmarks bar. */
export function buildBookmarklet(striplinkOrigin: string) {
  const code = BOOKMARKLET_SOURCE.replace(
    '__STRIPLINK__',
    striplinkOrigin.replace(/\/+$/, '')
  )
    .replace(/^\s+/gm, '')
    .replace(/\n/g, ' ');
  return `javascript:${encodeURIComponent(code)}`;
}
