import type { PaidPlan, SupporterRing } from './plans.js';

export interface SupporterBadge {
  plan: PaidPlan;
  months: number;
  since: string | null;
  ring: SupporterRing;
}

export interface AvatarRing {
  plan: PaidPlan;
  ring: SupporterRing;
  colors?: string[];
}

export const SUPPORTER_COLORS: Record<PaidPlan, string> = {
  supporter: '#F59E0B',
};

// No billing in StripLink, so there are no supporter badges or avatar rings.
export async function getSupporterBadge(
  _userId: string
): Promise<SupporterBadge | null> {
  return null;
}

export async function getAvatarRing(_userId: string): Promise<AvatarRing | null> {
  return null;
}

export function supporterRole(_badge: SupporterBadge | null): {
  id: number;
  name: string;
  color: string;
  icon: string;
  priority: number;
} | null {
  return null;
}
