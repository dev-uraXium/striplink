import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../server/db/connection.js', () => ({ mainDb: {} }));

const { splitSessionAnswer, validPrefillTemplate, sharedFormLink, SESSION_PLACEHOLDER } = await import(
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
});
