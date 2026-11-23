// StripLink: Google Form response -> flight on a session's board.
import {
  fetchPfTrackerPlan,
  mergeAnswers,
  planToAnswers,
  wantsPfTrackerImport,
  withoutImportQuestion,
} from './pftracker.js';
import crypto from 'node:crypto';
import { mainDb, redisConnection } from '../db/connection.js';
import { prefixKey } from '../utils/cacheTtl.js';
import { submitFlightAndBroadcast } from '../services/submitFlight.js';
import {
  answersToFlight,
  fieldForTitle,
  type FormAnswers,
} from './fieldMap.js';

const DEDUPE_TTL_SEC = 30 * 24 * 60 * 60;

export class FormIntakeError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export async function getFormSettings(sessionId: string) {
  return mainDb
    .selectFrom('sessions')
    .select(['session_id', 'form_webhook_secret', 'google_form_id'])
    .where('session_id', '=', sessionId)
    .executeTakeFirst();
}

export function newFormSecret() {
  return crypto.randomBytes(24).toString('base64url');
}

export function secretsMatch(
  given: unknown,
  expected: string | null | undefined
) {
  if (typeof given !== 'string' || !given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Files one form response as a flight. Returns null when the same response
 * was already filed (the webhook and the poller can both deliver it).
 */
export async function fileFormResponse(
  sessionId: string,
  answers: FormAnswers,
  responseId?: string | null
) {
  if (responseId) {
    const key = prefixKey(`forms:response:${sessionId}:${responseId}`);
    const fresh = await redisConnection.set(
      key,
      '1',
      'EX',
      DEDUPE_TTL_SEC,
      'NX'
    );
    if (fresh !== 'OK') return null;
  }

  // Opt-in: the pilot asked us to pull their own PFTracker plan
  if (wantsPfTrackerImport(answers)) {
    const own = withoutImportQuestion(answers);
    const username = Object.entries(own).find(
      ([t]) => fieldForTitle(t) === 'roblox_username'
    )?.[1];
    const plan =
      typeof username === 'string' ? await fetchPfTrackerPlan(username) : null;
    if (plan) {
      answers = mergeAnswers(planToAnswers(plan), own);
    } else {
      answers = own;
      const { flight: partial } = answersToFlight(own);
      if (!partial.callsign) {
        if (responseId)
          await redisConnection
            .del(prefixKey(`forms:response:${sessionId}:${responseId}`))
            .catch(() => {});
        throw new FormIntakeError(
          `No active PFTracker flight plan found for "${String(username ?? '')}". File one on PFTracker first, or fill the form in.`,
          422
        );
      }
    }
  }

  const { flight } = answersToFlight(answers);
  if (!flight.callsign) {
    throw new FormIntakeError(
      'The form response has no callsign. Add a "Callsign" question.',
      400
    );
  }

  try {
    const { flight: created } = await submitFlightAndBroadcast(
      sessionId,
      flight
    );
    return created;
  } catch (err) {
    // Let a corrected resubmission of the same response through
    if (responseId) {
      await redisConnection
        .del(prefixKey(`forms:response:${sessionId}:${responseId}`))
        .catch(() => {});
    }
    const message = err instanceof Error ? err.message : '';
    if (
      message.startsWith('Callsign') ||
      message.startsWith('Route error') ||
      message.startsWith('Invalid session')
    ) {
      throw new FormIntakeError(message, 400);
    }
    throw err;
  }
}
