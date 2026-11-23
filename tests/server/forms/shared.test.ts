import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../server/db/connection.js', () => ({ mainDb: {} }));

const { splitSessionAnswer, validPrefillTemplate, sharedFormLink, SESSION_PLACEHOLDER, buildPrefilledLink, parseFormFields } = await import(
  '../../../server/forms/shared.js'
);

describe('shared Google Form', () => {
  it('pulls the session answer out and keeps the rest', () => {
    const { sessionId, rest } = splitSessionAnswer({
      'StripLink session': ' abc12345 ',
      Callsign: 'BAW123',
      Route: 'DCT',
    });
    expect(sessionId).toBe('abc12345');
    expect(rest).toEqual({ Callsign: 'BAW123', Route: 'DCT' });
  });

  it('accepts other session titles and reports a missing one', () => {
    expect(splitSessionAnswer({ 'Session ID:': 'xyz' }).sessionId).toBe('xyz');
    expect(splitSessionAnswer({ Callsign: 'BAW1' }).sessionId).toBeNull();
  });

  it('only accepts Google Forms pre-filled links with the placeholder', () => {
    const good = `https://docs.google.com/forms/d/e/1FAIpQL/viewform?usp=pp_url&entry.123=${SESSION_PLACEHOLDER}`;
    expect(validPrefillTemplate(good)).toBe(good);
    expect(validPrefillTemplate('https://docs.google.com/forms/d/e/1FAIpQL/viewform')).toBeNull();
    expect(validPrefillTemplate(`https://evil.example/forms/?x=${SESSION_PLACEHOLDER}`)).toBeNull();
    expect(validPrefillTemplate(`http://docs.google.com/forms/?x=${SESSION_PLACEHOLDER}`)).toBeNull();
  });

  it('builds each session its own link', () => {
    const config = {
      prefillTemplate: `https://docs.google.com/forms/d/e/X/viewform?usp=pp_url&entry.1=${SESSION_PLACEHOLDER}`,
      editUrl: null,
      title: null,
      registeredAt: '',
    };
    expect(sharedFormLink(config, 'abc12345')).toBe(
      'https://docs.google.com/forms/d/e/X/viewform?usp=pp_url&entry.1=abc12345'
    );
    expect(sharedFormLink(null, 'abc12345')).toBeNull();
  });

  it('pre-fills a pilot\'s details, matching dropdown choices by ICAO', () => {
    const fields = parseFormFields([
      { title: 'Roblox username', entry: 'entry.2', type: 'TEXT' },
      { title: 'Callsign', entry: 'entry.3', type: 'TEXT' },
      { title: 'Flight rules', entry: 'entry.4', type: 'MULTIPLE_CHOICE', choices: ['IFR', 'VFR'] },
      { title: 'Departure', entry: 'entry.5', type: 'LIST', choices: ['EGKK - London Gatwick International Airport', 'LCLK - Larnaca'] },
      { title: 'Arrival', entry: 'entry.6', type: 'LIST', choices: ['EGKK - London Gatwick International Airport', 'LCLK - Larnaca'] },
      { title: 'Cruising level', entry: 'entry.7', type: 'TEXT' },
      { title: 'bad', entry: 'javascript:1', type: 'TEXT' },
    ]);
    expect(fields).toHaveLength(6);
    const link = new URL(
      buildPrefilledLink(
        {
          prefillTemplate: `https://docs.google.com/forms/d/e/X/viewform?usp=pp_url&entry.1=${SESSION_PLACEHOLDER}`,
          editUrl: null,
          title: null,
          registeredAt: '',
          fields,
        },
        'abc12345',
        { roblox: 'Pilot_1', callsign: 'AAL213', rules: 'ifr', dep: 'EGKK', arr: 'LCLK', level: '100', aircraft: 'A320' }
      )
    );
    expect(link.searchParams.get('entry.1')).toBe('abc12345');
    expect(link.searchParams.get('entry.2')).toBe('Pilot_1');
    expect(link.searchParams.get('entry.3')).toBe('AAL213');
    expect(link.searchParams.get('entry.4')).toBe('IFR');
    expect(link.searchParams.get('entry.5')).toBe('EGKK - London Gatwick International Airport');
    expect(link.searchParams.get('entry.6')).toBe('LCLK - Larnaca');
    expect(link.searchParams.get('entry.7')).toBe('100');
  });
});
