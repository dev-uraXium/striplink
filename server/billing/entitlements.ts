// StripLink is free: every user gets every feature. This keeps the old
// plan API (used across the server) but no longer reads billing data.
import type { BillingInterval, PaidPlan, Plan } from './plans.js';
import { planAtLeast } from './plans.js';

export interface PlanState {
  plan: Plan;
  supporterPlan: Plan;
  staffAccess: boolean;
  supporterMonths: number;
  supporterSince: string | null;
  subscription: {
    plan: PaidPlan;
    status: string;
    interval: BillingInterval | null;
    renewsAt: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  passEndsAt: string | null;
}

const FREE_FOR_ALL: PlanState = {
  plan: 'supporter', // feature level: everything unlocked
  supporterPlan: 'free', // nobody shows a supporter badge
  staffAccess: false,
  supporterMonths: 0,
  supporterSince: null,
  subscription: null,
  passEndsAt: null,
};

export async function getPlanState(_userId: string): Promise<PlanState> {
  return FREE_FOR_ALL;
}

export async function getUserPlan(_userId: string): Promise<Plan> {
  return FREE_FOR_ALL.plan;
}

export async function hasPlan(_userId: string, required: Plan) {
  return planAtLeast(FREE_FOR_ALL.plan, required);
}

export async function invalidatePlan(_userId: string): Promise<void> {}
