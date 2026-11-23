// Shared "a pilot filed a flight plan" path: used by the public submit endpoint
// and by StripLink's Google Forms intake, so both behave identically
// (validation, squawk/SID defaults, live broadcast, arrival boards, ACARS).
import { addFlight, type AddFlightData } from '../db/flights.js';
import { getSessionById } from '../db/sessions.js';
import { recordNewFlight } from '../db/statistics.js';
import { redisConnection } from '../db/connection.js';
import { keys } from '../realtime/keys.js';
import { getNetworkKind } from '../utils/advancedNetworkSession.js';
import { resolveExternalAcarsRedirectUrl } from '../utils/externalAcarsPanel.js';
import {
  broadcastFlightEvent,
  broadcastToArrivalSessions,
} from '../websockets/flightsWebsocket.js';

export async function submitFlightAndBroadcast(
  sessionId: string,
  flightData: AddFlightData,
  options: { submitterUserId?: string } = {}
) {
  const flight = await addFlight(sessionId, flightData, {
    submitterUserId: options.submitterUserId,
  });

  await recordNewFlight();

  const sanitizedFlight = flight
    ? Object.fromEntries(
        Object.entries(flight).filter(
          ([k]) => !['acars_token', 'user_id', 'ip_address'].includes(k)
        )
      )
    : {};
  broadcastFlightEvent(sessionId, 'flightAdded', sanitizedFlight);

  const session = await getSessionById(sessionId);
  const acarsRedirectUrl = await resolveExternalAcarsRedirectUrl(session, flight);

  if (session) {
    if (session.created_by) {
      redisConnection.del(keys.userSessions(session.created_by)).catch(() => {});
    }
    broadcastToArrivalSessions(flight, getNetworkKind(session), sessionId).catch(
      (err) => {
        console.error('Failed to broadcast to arrival sessions:', err);
      }
    );
  }

  return { flight, acarsRedirectUrl };
}
