import type { Settings } from '../db/types/Settings.js';
import type { Plan } from './plans.js';

export interface PlanLimits {
  maxSessions: number;
  featuredFlights: number;
  snapsPerFlight: number;
  animatedBackgrounds: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxSessions: 50,
    featuredFlights: 3,
    snapsPerFlight: 12,
    animatedBackgrounds: false,
  },
  supporter: {
    maxSessions: 100,
    featuredFlights: 10,
    snapsPerFlight: 30,
    animatedBackgrounds: true,
  },
};

export async function getPlanLimits(_userId: string): Promise<PlanLimits> {
  // StripLink is free: everyone gets the highest limits.
  return PLAN_LIMITS.supporter;
}

export function hasLapsedAnimatedBackground(
  settings: Partial<Settings> | null | undefined,
  limits: PlanLimits
): boolean {
  const animated = settings?.animatedBackground;
  return (
    !limits.animatedBackgrounds &&
    !!animated &&
    settings?.backgroundImage?.selectedImage === animated
  );
}
