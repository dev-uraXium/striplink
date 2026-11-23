import { describe, expect, it } from 'vitest';
import {
  planToAnswers,
  wantsPfTrackerImport,
  withoutImportQuestion,
  mergeAnswers,
} from '../../../server/forms/pftracker.js';
import { answersToFlight } from '../../../server/forms/fieldMap.js';

const plan = {
  id: '01a208a3',
  user: 'Indian_GamerTamilan',
  departureInfo: {
    departureAirport: 'EGKK',
    arrivalAirport: 'LCLK',
    alternateAirport: 'LCRA',
  },
  selections: {
    flightRules: 'IFR',
    departureRunway: '26L',
    arrivalRunway: '22',
    altitude: 10000,
  },
  routeInfo: { route: 'EGKK/26L BOGNA1X BOGNA BONEK BONEK1R LCLK/22' },
  aircraftInfo: { callsign: 'AAL213' },
  active: true,
};

describe('PFTracker import', () => {
  it('only imports when the pilot says yes', () => {
    expect(
      wantsPfTrackerImport({
        'Import my PFTracker flight plan?': 'Yes, use my PFTracker plan',
      })
    ).toBe(true);
    expect(
      wantsPfTrackerImport({
        'Import my PFTracker flight plan?': 'No, I will fill it in',
      })
    ).toBe(false);
    expect(wantsPfTrackerImport({ Callsign: 'BAW1' })).toBe(false);
  });

  it("turns a plan into a strip, with the pilot's own answers winning", () => {
    const own = withoutImportQuestion({
      'Import my PFTracker flight plan?': 'Yes',
      'Roblox username': 'Indian_GamerTamilan',
      Aircraft: 'A320',
    });
    const { flight } = answersToFlight(mergeAnswers(planToAnswers(plan), own));
    expect(flight).toMatchObject({
      callsign: 'AAL213',
      aircraft_type: 'A320',
      flight_type: 'IFR',
      departure: 'EGKK',
      arrival: 'LCLK',
      alternate: 'LCRA',
      cruisingFL: '100',
      roblox_username: 'Indian_GamerTamilan',
    });
    expect(flight.route).toContain('BOGNA1X');
    expect(String(flight.remark)).toContain('PFTracker plan');
    expect(String(flight.remark)).not.toContain('Import');
  });
});
