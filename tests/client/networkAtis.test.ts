import { describe, expect, it } from 'vitest';
import { buildNetworkAtis, networkAirportName, cleanAtisBody } from '../../src/lib/networkAtis';

const gatwick = {
  icao: 'EGKK',
  airportName: 'London Gatwick International Airport',
  controlName: 'Gatwick',
  frequencies: { APP: '126.825', TWR: '124.230', N_GND: '121.540', S_GND: '121.805', DEL: '121.955' },
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
    expect(out).toContain('EGKK_APP "Gatwick Approach" (126.825): <@111111111111111111>');
    expect(out).toContain('EGKK_TWR "Gatwick Tower" (124.230): <@222222222222222222>');
    expect(out).toContain('EGKK_DEL "Gatwick Delivery" (121.955): <@111111111111111111>');
  });

  it('cleans names and banned content', () => {
    expect(networkAirportName('London Gatwick International Airport', 'EGKK')).toBe('LONDON GATWICK');
    expect(networkAirportName('Cardiff Airport', 'EGFF')).toBe('CARDIFF');
    expect(cleanAtisBody('qnh 1021 **bold** ✈️ see https://x.com/y')).toBe('QNH 1021 BOLD SEE');
  });
});
