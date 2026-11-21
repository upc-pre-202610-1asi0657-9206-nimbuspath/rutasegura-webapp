// Domain: pure mapping/validation, no Vue / Axios. No fabricated defaults: absent fields stay null.

const pick = (...values) => values.find((value) => value !== undefined && value !== null) ?? null

export function createPlan(dto) {
  if (!dto || typeof dto !== 'object') return null
  const id = pick(dto.planId, dto.id, dto.code)
  return {
    id: id === null ? null : String(id),
    name: pick(dto.name, dto.displayName, dto.title),
    description: pick(dto.description),
    price: pick(dto.price, dto.monthlyPrice, dto.amount),
    currency: pick(dto.currency),
    limits: dto.limits && typeof dto.limits === 'object' ? { ...dto.limits } : {},
  }
}

export const createPlanList = (data) => {
  const raw = Array.isArray(data) ? data : pick(data?.items, data?.plans, data?.data) ?? []
  return raw.map(createPlan).filter((plan) => plan && plan.id !== null)
}

export function createPlanChange(dto) {
  if (!dto || typeof dto !== 'object') return null
  const id = pick(dto.planChangeId, dto.id)
  if (id === null) return null
  return {
    id: String(id),
    targetPlanId: pick(dto.targetPlanId, dto.newPlanId, dto.planId),
    status: pick(dto.status, dto.paymentStatus),
    paymentReference: pick(dto.paymentReference, dto.paymentId),
    createdAt: pick(dto.createdAt, dto.requestedAt),
    effectiveAt: pick(dto.effectiveAt, dto.effectiveDate),
  }
}

export function createSubscription(dto) {
  if (!dto || typeof dto !== 'object') return null
  const pending = pick(dto.pendingChanges, dto.pendingPlanChanges)
  const single = pick(dto.pendingChange, dto.pendingPlanChange)
  const changes = Array.isArray(pending) ? pending : single ? [single] : []
  const planDto = pick(dto.plan, dto.currentPlan, dto.activePlan)
  return {
    id: pick(dto.subscriptionId, dto.id),
    plan: planDto ? createPlan(planDto) : null,
    planId: pick(dto.planId, planDto?.planId, planDto?.id),
    status: pick(dto.status),
    startsAt: pick(dto.startsAt, dto.startedAt, dto.currentPeriodStart),
    endsAt: pick(dto.endsAt, dto.renewsAt, dto.currentPeriodEnd),
    limits: dto.limits && typeof dto.limits === 'object' ? { ...dto.limits } : {},
    pendingChanges: changes.map(createPlanChange).filter(Boolean),
  }
}

export function createQuota(dto) {
  if (!dto || typeof dto !== 'object') return null
  return {
    used: pick(dto.activeRoutes, dto.active, dto.used, dto.current, dto.count),
    limit: pick(dto.limit, dto.maxActiveRoutes, dto.max, dto.maximum),
  }
}

export const quotaRatio = (quota) =>
  quota && Number.isFinite(quota.used) && Number.isFinite(quota.limit) && quota.limit > 0
    ? Math.min(1, quota.used / quota.limit)
    : null

export function validatePlanChange(planId, currentPlanId) {
  if (!planId) return 'Selecciona un plan.'
  if (planId === currentPlanId) return 'Ya tienes este plan contratado.'
  return ''
}
