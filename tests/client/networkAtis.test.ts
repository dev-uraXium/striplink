import { describe, expect, it } from 'vitest';
import {
  bestRadarStyle,
  buildNetworkAtis,
  buildRadarNetworkAtis,
  networkAirportName,
  cleanAtisBody,
} from '../../src/lib/networkAtis';

const gatwick = {
  icao: 'EGKK',
  airportName: 'London Gatwick International Airport',
  controlName: 'Gatwick',
  frequencies: {
    APP: '126.825',
    TWR: '124.230',
    N_GND: '121.540',
    S_GND: '121.805',
    DEL: '121.955',
  },
};
const atis =
  'GATWICK INFORMATION J... 2020Z... WIND 130 AT 4 KNOTS... CAVOK... QNH 1021... ADVISE CONTROLLER ON INITIAL CONTACT THAT YOU HAVE INFORMATION J...';

describe('network ATIS format', () => {
  it('builds the PFATC message with one line per staffed position', () => {
    const out = buildNetworkAtis({
      ...gatwick,
      atisText: atis,
      controllers: [
        { id: '716944317448585216', position: 'APP' },
        { id: '727238663951351868', position: 'TWR' },
        { id: '303875810350202880', position: 'GND' },
        { id: '867141081879412746', position: 'DEL' },
      ],
    });
    expect(out).toBe(
      [
        'LONDON GATWICK EGKK',
        '',
        'EGKK_APP "Gatwick Approach" (126.825): <@716944317448585216>',
        'EGKK_TWR "Gatwick Tower" (124.230): <@727238663951351868>',
        'EGKK_GND "Gatwick Ground" (121.540): <@303875810350202880>',
        'EGKK_DEL "Gatwick Delivery" (121.955): <@867141081879412746>',
        '',
        '```' + atis + '```',
      ].join('\n')
    );
  });

  it('gives a controller on ALL every unstaffed position', () => {
    const out = buildNetworkAtis({
      ...gatwick,
      atisText: atis,
      controllers: [
        { id: '111111111111111111', position: 'ALL' },
        { id: '222222222222222222', position: 'TWR' },
      ],
    });
    expect(out).toContain(
      'EGKK_APP "Gatwick Approach" (126.825): <@111111111111111111>'
    );
    expect(out).toContain(
      'EGKK_TWR "Gatwick Tower" (124.230): <@222222222222222222>'
    );
    expect(out).toContain(
      'EGKK_DEL "Gatwick Delivery" (121.955): <@111111111111111111>'
    );
  });

  it('cleans names and banned content', () => {
    expect(
      networkAirportName('London Gatwick International Airport', 'EGKK')
    ).toBe('LONDON GATWICK');
    expect(networkAirportName('Cardiff Airport', 'EGFF')).toBe('CARDIFF');
    expect(cleanAtisBody('qnh 1021 **bold** ✈️ see https://x.com/y')).toBe(
      'QNH 1021 BOLD SEE'
    );
  });

  it('adds filing links (only those) below the ATIS when asked', () => {
    const out = buildNetworkAtis({
      ...gatwick,
      atisText: atis,
      controllers: [{ id: '111111111111111111', position: 'TWR' }],
      formLink:
        'https://docs.google.com/forms/d/e/X/viewform?usp=pp_url&entry.1=abc12345',
      includePfTracker: true,
    });
    expect(
      out.endsWith(
        '```\n\nFILE YOUR FLIGHT PLAN: <https://docs.google.com/forms/d/e/X/viewform?usp=pp_url&entry.1=abc12345>\nOR PLAN ON PFTRACKER: <https://canary.project-flight.com/flight-plan/create>'
      )
    ).toBe(true);
    const plain = buildNetworkAtis({
      ...gatwick,
      atisText: atis,
      controllers: [],
    });
    expect(plain.endsWith('```')).toBe(true);
  });

  it('builds the PF Radar post like the network FIR format', () => {
    const airports = [
      {
        icao: 'EGKK',
        name: 'Gatwick',
        runway: '08R',
        text: 'gatwick information a... qnh 1024...',
        metar: 'EGKK 231450Z 14004KT 110V170 9999 FEW027 07/M00 Q1024 NOSIG',
      },
      { icao: 'X2BH', name: 'Bolt Head', runway: null, text: null },
    ];
    const input = {
      controllers: [{ id: '111111111111111111', position: 'ALL' }],
      airports,
      ident: 'A',
      links: [
        'https://forms.gle/8EVJnn5drAE32Pbg6',
        'https://canary.project-flight.com/flight-plan/create',
      ],
    };
    expect(buildRadarNetworkAtis({ ...input, style: 'compact' })).toBe(
      [
        'PF Radar',
        '',
        'PF_RDR "PF Radar" (132.555): <@111111111111111111>',
        '',
        '```GATWICK ARRIVAL AND DEPARTURE INFORMATION A. TIME 1450Z. RWY IN USE 08R. 14004KT 110V170. 9999 FEW027. 7. M0. QNH1024. CONFIRM INFORMATION A ON FIRST CONTACT.```',
        '',
        'https://forms.gle/8EVJnn5drAE32Pbg6',
        'OR',
        'https://canary.project-flight.com/flight-plan/create',
      ].join('\n')
    );
    expect(buildRadarNetworkAtis({ ...input, style: 'full' })).toContain(
      '```GATWICK INFORMATION A... QNH 1024...```'
    );
  });

  it('shrinks the ATIS style to fit one Discord message', () => {
    const airport = (i: number) => ({
      icao: `T${i}`,
      name: `Test field ${i}`,
      runway: '09',
      text: 'X'.repeat(200),
      metar: 'TEST 231450Z 27010KT 9999 FEW020 10/05 Q1015',
    });
    const few = { controllers: [], ident: 'A', airports: [airport(1)] };
    expect(bestRadarStyle(few)).toBe('full');
    const many = {
      controllers: [],
      ident: 'A',
      airports: Array.from({ length: 16 }, (_, i) => airport(i)),
    };
    expect(bestRadarStyle(many)).not.toBe('full');
    expect(
      buildRadarNetworkAtis({ ...many, style: bestRadarStyle(many) }).length
    ).toBeLessThanOrEqual(2000);
  });
});
