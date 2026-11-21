<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { CreditCard, LoaderCircle, RefreshCcw } from 'lucide-vue-next'
import { onAuthSessionChange } from '@/shared/api/authSessionStorage'
import { useSubscriptionStore } from '../../application/subscriptionStore'
import { quotaRatio } from '../../domain/subscription'

const store = useSubscriptionStore()
const selectedPlanId = ref('')

const currentPlanId = computed(() => store.subscription?.planId ?? store.subscription?.plan?.id ?? null)
const currentPlan = computed(
  () => store.plans.find((plan) => plan.id === currentPlanId.value) ?? store.subscription?.plan ?? null,
)
const ratio = computed(() => quotaRatio(store.quota))
const planName = (id) => store.plans.find((plan) => plan.id === id)?.name ?? id

function formatDate(value) {
  const time = Date.parse(value)
  return Number.isFinite(time)
    ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(time)
    : ''
}
function formatPrice(plan) {
  if (plan.price === null) return ''
  return plan.currency
    ? new Intl.NumberFormat('es-PE', { style: 'currency', currency: plan.currency }).format(plan.price)
    : String(plan.price)
}

async function submitChange() {
  if (await store.changePlan(selectedPlanId.value)) selectedPlanId.value = ''
}

const stopSession = onAuthSessionChange(() => store.reset())
onMounted(() => {
  store.actionError = ''
  store.actionNotice = ''
  void store.load()
})
onBeforeUnmount(stopSession)
</script>

<template>
  <div class="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
    <header class="flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
          <CreditCard :size="17" aria-hidden="true" />
        </span>
        <h2 class="text-base font-bold text-slate-900">Suscripción</h2>
      </div>
      <button
        type="button"
        class="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        :disabled="store.loading"
        @click="store.load()"
      >
        <LoaderCircle v-if="store.loading" :size="14" class="animate-spin" aria-hidden="true" />
        <RefreshCcw v-else :size="14" aria-hidden="true" />
        Actualizar
      </button>
    </header>

    <p v-if="store.actionError" role="alert" class="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
      {{ store.actionError }}
    </p>
    <p v-if="store.actionNotice" role="status" class="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
      {{ store.actionNotice }}
    </p>

    <!-- Contrato vigente -->
    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
      <h3 class="mb-3 text-sm font-bold text-slate-900">Contrato vigente</h3>
      <p v-if="store.errors.subscription" role="alert" class="text-xs font-medium text-red-700">{{ store.errors.subscription }}</p>
      <dl v-else-if="store.subscription" class="grid gap-3 text-sm sm:grid-cols-2">
        <div v-if="currentPlan?.name">
          <dt class="text-xs text-slate-500">Plan</dt>
          <dd class="font-semibold text-slate-900">{{ currentPlan.name }}</dd>
        </div>
        <div v-if="store.subscription.status">
          <dt class="text-xs text-slate-500">Estado</dt>
          <dd class="font-semibold text-slate-900">{{ store.subscription.status }}</dd>
        </div>
        <div v-if="store.subscription.startsAt">
          <dt class="text-xs text-slate-500">Inicio</dt>
          <dd class="font-semibold text-slate-900">{{ formatDate(store.subscription.startsAt) }}</dd>
        </div>
        <div v-if="store.subscription.endsAt">
          <dt class="text-xs text-slate-500">Vigente hasta</dt>
          <dd class="font-semibold text-slate-900">{{ formatDate(store.subscription.endsAt) }}</dd>
        </div>
        <div v-for="(value, key) in store.subscription.limits" :key="key">
          <dt class="text-xs text-slate-500">{{ key }}</dt>
          <dd class="font-semibold text-slate-900">{{ value }}</dd>
        </div>
      </dl>
      <p v-else-if="store.loaded" class="text-sm text-slate-500">No hay un contrato vigente.</p>
    </section>

    <!-- Cuota de rutas -->
    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
      <h3 class="mb-3 text-sm font-bold text-slate-900">Cuota de rutas activas</h3>
      <p v-if="store.errors.quota" role="alert" class="text-xs font-medium text-red-700">{{ store.errors.quota }}</p>
      <template v-else-if="store.quota && store.quota.used !== null">
        <p class="text-sm font-semibold text-slate-900">
          {{ store.quota.used }}<span v-if="store.quota.limit !== null"> de {{ store.quota.limit }}</span>
        </p>
        <div
          v-if="ratio !== null"
          class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          :aria-valuenow="store.quota.used"
          aria-valuemin="0"
          :aria-valuemax="store.quota.limit"
        >
          <div class="h-full rounded-full bg-blue-600" :style="{ width: `${ratio * 100}%` }"></div>
        </div>
      </template>
    </section>

    <!-- Cambios pendientes -->
    <section v-if="store.subscription?.pendingChanges.length" class="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
      <h3 class="mb-3 text-sm font-bold text-slate-900">Cambios de plan pendientes</h3>
      <ul class="space-y-3">
        <li
          v-for="change in store.subscription.pendingChanges"
          :key="change.id"
          class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm"
        >
          <div>
            <strong v-if="change.targetPlanId" class="block text-slate-900">{{ planName(change.targetPlanId) }}</strong>
            <span v-if="change.status" class="text-xs text-slate-500">{{ change.status }}</span>
            <span v-if="change.createdAt" class="ml-2 text-xs text-slate-400">{{ formatDate(change.createdAt) }}</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <template v-if="change.paymentReference">
              <button
                type="button"
                class="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                :disabled="store.busy"
                @click="store.completeCheckout(change.paymentReference, true)"
              >
                Aprobar pago
              </button>
              <button
                type="button"
                class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                :disabled="store.busy"
                @click="store.completeCheckout(change.paymentReference, false)"
              >
                Rechazar pago
              </button>
            </template>
            <button
              type="button"
              class="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
              :disabled="store.busy"
              @click="store.cancelChange(change.id)"
            >
              Cancelar cambio
            </button>
          </div>
        </li>
      </ul>
    </section>

    <!-- Planes disponibles -->
    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
      <h3 class="mb-3 text-sm font-bold text-slate-900">Planes disponibles</h3>
      <p v-if="store.errors.plans" role="alert" class="text-xs font-medium text-red-700">{{ store.errors.plans }}</p>
      <p v-else-if="store.loaded && !store.plans.length" class="text-sm text-slate-500">No hay planes disponibles.</p>

      <form v-else novalidate @submit.prevent="submitChange">
        <fieldset class="grid gap-3 sm:grid-cols-2">
          <legend class="sr-only">Seleccionar plan</legend>
          <label
            v-for="plan in store.plans"
            :key="plan.id"
            class="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition"
            :class="selectedPlanId === plan.id ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'"
          >
            <input v-model="selectedPlanId" type="radio" name="plan" :value="plan.id" class="mt-1" />
            <span class="min-w-0 text-sm">
              <strong v-if="plan.name" class="block text-slate-900">
                {{ plan.name }}
                <span v-if="plan.id === currentPlanId" class="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">Actual</span>
              </strong>
              <span v-if="formatPrice(plan)" class="block font-semibold text-blue-700">{{ formatPrice(plan) }}</span>
              <span v-if="plan.description" class="block text-xs text-slate-500">{{ plan.description }}</span>
              <span v-for="(value, key) in plan.limits" :key="key" class="block text-xs text-slate-500">{{ key }}: {{ value }}</span>
            </span>
          </label>
        </fieldset>

        <button
          type="submit"
          class="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          :disabled="store.busy || !selectedPlanId"
        >
          <LoaderCircle v-if="store.busy" :size="15" class="animate-spin" aria-hidden="true" />
          Solicitar cambio de plan
        </button>
      </form>
    </section>
  </div>
</template>
