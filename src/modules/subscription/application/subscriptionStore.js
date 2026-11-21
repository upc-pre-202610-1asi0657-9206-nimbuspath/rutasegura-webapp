import { defineStore } from 'pinia'
import { apiError } from '@/shared/utils/forms'
import { validatePlanChange } from '../domain/subscription'
import {
  cancelPlanChange,
  completeSandboxCheckout,
  fetchPlans,
  fetchRouteQuota,
  fetchSubscription,
  requestPlanChange,
} from '../infrastructure/subscriptionRepository'

let controller = null

export const useSubscriptionStore = defineStore('subscription', {
  state: () => ({
    subscription: null,
    plans: [],
    quota: null,
    loading: false,
    loaded: false,
    errors: { subscription: '', plans: '', quota: '' },
    busy: false,
    actionError: '',
    actionNotice: '',
  }),
  actions: {
    async load() {
      controller?.abort()
      const request = (controller = new AbortController())
      this.loading = true
      const { signal } = request
      const [subscription, plans, quota] = await Promise.allSettled([
        fetchSubscription(signal),
        fetchPlans(signal),
        fetchRouteQuota(signal),
      ])
      if (signal.aborted) return
      const apply = (result, key, fallback, assign) => {
        if (result.status === 'fulfilled') {
          this.errors[key] = ''
          assign(result.value)
        } else if (result.reason?.code !== 'ERR_CANCELED') {
          this.errors[key] = apiError(result.reason, fallback)
        }
      }
      apply(subscription, 'subscription', 'No fue posible cargar tu suscripción.', (v) => (this.subscription = v))
      apply(plans, 'plans', 'No fue posible cargar los planes.', (v) => (this.plans = v))
      apply(quota, 'quota', 'No fue posible cargar la cuota de rutas.', (v) => (this.quota = v))
      this.loaded = true
      this.loading = false
    },
    async refreshSubscription() {
      try {
        this.subscription = await fetchSubscription()
        this.errors.subscription = ''
      } catch (error) {
        this.errors.subscription = apiError(error, 'No fue posible cargar tu suscripción.')
      }
    },
    async runAction(task, notice, failure) {
      if (this.busy) return false
      this.busy = true
      this.actionError = ''
      this.actionNotice = ''
      try {
        await task()
        this.actionNotice = notice
        await this.refreshSubscription()
        return true
      } catch (error) {
        this.actionError = apiError(error, failure)
        return false
      } finally {
        this.busy = false
      }
    },
    changePlan(planId) {
      const problem = validatePlanChange(planId, this.subscription?.planId ?? this.subscription?.plan?.id)
      if (problem) {
        this.actionError = problem
        this.actionNotice = ''
        return Promise.resolve(false)
      }
      return this.runAction(
        () => requestPlanChange(planId),
        'Cambio de plan solicitado.',
        'No fue posible solicitar el cambio de plan.',
      )
    },
    cancelChange(planChangeId) {
      return this.runAction(
        () => cancelPlanChange(planChangeId),
        'Cambio de plan cancelado.',
        'No fue posible cancelar el cambio de plan.',
      )
    },
    completeCheckout(paymentReference, approved) {
      return this.runAction(
        () => completeSandboxCheckout(paymentReference, approved),
        approved ? 'Pago aprobado.' : 'Pago rechazado.',
        'No fue posible completar el pago.',
      )
    },
    reset() {
      controller?.abort()
      this.$reset()
    },
  },
})
