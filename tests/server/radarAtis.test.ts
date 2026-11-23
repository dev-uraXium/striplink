import { describe, expect, it, vi } from 'vitest';

vi.mock('../../server/utils/metarAviationWeather.js', () => ({ resolveAviationMetar: vi.fn() }));
const { runwayForWind, radarAirports } = await import('../../server/utils/radarAtis.js');

describe('PF Radar ATIS', () => {
  it('picks the runway most into the wind', () => {
    expect(runwayForWind(['08R', '26L'], 'EGKK 231350Z 25012KT 9999 FEW030 12/06 Q1021')).toBe('26L');
    expect(runwayForWind(['08R', '26L'], 'EGKK 231350Z 07010KT CAVOK 12/06 Q1021')).toBe('08R');
    expect(runwayForWind(['08R', '26L'], 'EGKK 231350Z 00000KT CAVOK 12/06 Q1021')).toBe('08R');
    expect(runwayForWind(['08R', '26L'], 'EGKK 231350Z VRB02KT CAVOK 12/06 Q1021')).toBe('08R');
  });

  it('covers every real airport but not the Center entries', () => {
    const icaos = radarAirports().map((a) => a.icao);
    expect(icaos).toContain('EGKK');
    expect(icaos).toContain('PAFA');
    expect(icaos).not.toContain('EGTT');
    expect(icaos).not.toContain('LCCC');
    expect(icaos.length).toBeGreaterThanOrEqual(15);
  });
});
