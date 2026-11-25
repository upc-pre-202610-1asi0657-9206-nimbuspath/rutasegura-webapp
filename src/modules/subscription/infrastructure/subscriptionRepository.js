import apiClient from '@/shared/api/apiClient'
import {
  createPlanChange,
  createPlanList,
  createQuota,
  createSubscription,
} from '../domain/subscription'

export async function fetchSubscription(signal) {
  const { data } = await apiClient.get('/subscription', { signal })
  return createSubscription(data)
}

export async function fetchPlans(signal) {
  const { data } = await apiClient.get('/subscription/plans', { signal })
  return createPlanList(data)
}

export async function fetchRouteQuota(signal) {
  const { data } = await apiClient.get('/routes/quota', { signal })
  return createQuota(data)
}

export async function requestPlanChange(planId) {
  const { data } = await apiClient.post('/subscription/plan-changes', { targetPlanId: planId })
  return createPlanChange(data)
}

export async function cancelPlanChange(planChangeId) {
  await apiClient.post(`/subscription/plan-changes/${encodeURIComponent(planChangeId)}/cancel`)
}

export async function completeSandboxCheckout(paymentReference, approved) {
  await apiClient.post(
    `/subscription/sandbox/checkouts/${encodeURIComponent(paymentReference)}/complete`,
    { approved },
  )
}
