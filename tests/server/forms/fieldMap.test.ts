import { describe, expect, it } from 'vitest';
import { answersToFlight, fieldForTitle, normalizeLevel } from '../../../server/forms/fieldMap';

describe('fieldForTitle', () => {
  it('matches titles loosely', () => {
    expect(fieldForTitle('Callsign')).toBe('callsign');
    expect(fieldForTitle('Call sign:')).toBe('callsign');
    expect(fieldForTitle('Callsign (e.g. BAW123)')).toBe('callsign');
    expect(fieldForTitle('Roblox username')).toBe('roblox_username');
    expect(fieldForTitle('Favourite colour')).toBeNull();
  });
});

describe('normalizeLevel', () => {
  it('stores levels as 3 digits', () => {
    expect(normalizeLevel('FL350')).toBe('350');
    expect(normalizeLevel('35000')).toBe('350');
    expect(normalizeLevel('35,000 ft')).toBe('350');
    expect(normalizeLevel('50')).toBe('050');
    expect(normalizeLevel('high')).toBe('');
  });
});

describe('answersToFlight', () => {
  it('maps a typical response to the submit payload', () => {
    const { flight } = answersToFlight({
      'Callsign (e.g. BAW123)': 'baw 123',
      Aircraft: 'a320',
      'Flight rules': 'VFR',
      Departure: 'EGKK - London Gatwick',
      Arrival: 'mdpc',
      'Cruising level': '35000',
      'Roblox username': 'pilotbob',
      Pilot: 'Bob',
      'Favourite colour': 'blue',
    });
    expect(flight).toMatchObject({
      callsign: 'BAW123',
      aircraft_type: 'A320',
      flight_type: 'VFR',
      departure: 'EGKK',
      arrival: 'MDPC',
      cruisingFL: '350',
      roblox_username: 'pilotbob',
      status: 'PENDING',
      submitted_via: 'form',
    });
    expect(flight.remark).toBe('Pilot: Bob · Favourite colour: blue');
  });

  it('only outputs whitelisted fields', () => {
    const { flight } = answersToFlight({ Callsign: 'A1', user_id: 'evil', is_admin: 'true' } as never);
    expect(Object.keys(flight).sort()).toEqual(
      ['callsign', 'flight_type', 'remark', 'status', 'submitted_via'].sort()
    );
  });
});
