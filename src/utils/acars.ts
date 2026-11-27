import type { Settings } from '../types/settings';
import { linearToLogVolume, playAudioWithGain } from './playSound';

export interface AcarsMessage {
  id: string;
  timestamp: string;
  station: string;
  text: string;
  type: 'system' | 'pdc' | 'atis' | 'contact' | 'warning' | 'Success';
  link?: {
    text: string;
    url: string;
  };
}

export interface BundledChart {
  name: string;
  path: string;
  type: string;
  credits?: string;
  procedures?: string[];
  source?: 'cephie';
}

const BUNDLED_CHART_BASE_URL = '/assets/app/charts';

// PFATC/PFControl's bundled charts were removed: StripLink uses openCharts only.
const availableCharts: Record<
  string,
  {
    file: string;
    name: string;
    type: string;
    credits?: string;
    procedures?: string[];
    source?: 'cephie';
  }[]
> = {};

export const getChartsForAirport = (icao: string): BundledChart[] => {
  const code = icao.toUpperCase();
  return (availableCharts[code] ?? []).map(
    ({ file, name, type, credits, procedures, source }) => ({
      name,
      path: `${BUNDLED_CHART_BASE_URL}/${code}/${file}`,
      type,
      credits,
      procedures,
      source,
    })
  );
};

export const formatTimestamp = (isoTimestamp: string): string => {
  return (
    new Date(isoTimestamp).getUTCHours().toString().padStart(2, '0') +
    ':' +
    new Date(isoTimestamp).getUTCMinutes().toString().padStart(2, '0') +
    'Z'
  );
};

export const playNotificationSound = (
  messageType: AcarsMessage['type'],
  settings: Settings
) => {
  if (!settings?.sounds) return;

  if (
    messageType === 'warning' ||
    messageType === 'pdc' ||
    messageType === 'contact'
  ) {
    const beepSettings = settings.sounds.acarsBeep;
    if (beepSettings?.enabled) {
      const audio = new Audio('/assets/app/sounds/ACARSBeep.wav');
      const logVolume = linearToLogVolume(beepSettings.volume || 100);
      const onCanPlay = () => {
        audio.removeEventListener('canplaythrough', onCanPlay);
        audio.removeEventListener('error', onError);
        playAudioWithGain(audio, logVolume);
      };
      const onError = () => {
        audio.removeEventListener('canplaythrough', onCanPlay);
        audio.removeEventListener('error', onError);
      };
      audio.addEventListener('canplaythrough', onCanPlay);
      audio.addEventListener('error', onError);
      audio.load();
    }
  } else if (messageType === 'system' || messageType === 'atis') {
    const chatPopSettings = settings.sounds.acarsChatPop;
    if (chatPopSettings?.enabled) {
      const audio = new Audio('/assets/app/sounds/ACARSChatPop.mp3');
      const logVolume = linearToLogVolume(chatPopSettings.volume || 100);
      const onCanPlay = () => {
        audio.removeEventListener('canplaythrough', onCanPlay);
        audio.removeEventListener('error', onError);
        playAudioWithGain(audio, logVolume);
      };
      const onError = () => {
        audio.removeEventListener('canplaythrough', onCanPlay);
        audio.removeEventListener('error', onError);
      };
      audio.addEventListener('canplaythrough', onCanPlay);
      audio.addEventListener('error', onError);
      audio.load();
    }
  }
};
