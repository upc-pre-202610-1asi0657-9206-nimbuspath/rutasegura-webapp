<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, watch } from 'vue'
import { Building2, LoaderCircle, RefreshCcw, Save } from 'lucide-vue-next'
import { onAuthSessionChange } from '@/shared/api/authSessionStorage'
import { useOrganizationStore } from '../../application/organizationStore'
import { isDirty, toForm } from '../../domain/organization'

const store = useOrganizationStore()
const form = reactive({})

const editableFields = computed(() => store.organization?.fields.filter((f) => f.editable) ?? [])
const readOnlyFields = computed(
  () => store.organization?.fields.filter((f) => !f.editable && f.value !== null) ?? [],
)
const dirty = computed(() => Boolean(store.organization) && isDirty(form, store.organization))

// Form is (re)initialized only from the organization returned by GET.
watch(
  () => store.organization,
  (organization) => {
    for (const key of Object.keys(form)) delete form[key]
    Object.assign(form, toForm(organization))
  },
  { immediate: true },
)

function display(field) {
  if (typeof field.value === 'boolean') return field.value ? 'Sí' : 'No'
  if (/At$|On$/.test(field.key) && Number.isFinite(Date.parse(field.value))) {
    return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(
      Date.parse(field.value),
    )
  }
  return field.value
}

const submit = () => store.save(form)
const stopSession = onAuthSessionChange(() => store.reset())

onMounted(() => {
  store.notice = ''
  store.saveError = ''
  void store.load()
})
onBeforeUnmount(stopSession)
</script>

<template>
  <div class="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
    <header class="flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Building2 :size="17" aria-hidden="true" />
        </span>
        <h2 class="text-base font-bold text-slate-900">Mi organización</h2>
      </div>
      <button
        type="button"
        class="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        :disabled="store.loading || store.saving"
        @click="store.load()"
      >
        <LoaderCircle v-if="store.loading" :size="14" class="animate-spin" aria-hidden="true" />
        <RefreshCcw v-else :size="14" aria-hidden="true" />
        Actualizar
      </button>
    </header>

    <p v-if="store.error" role="alert" class="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
      {{ store.error }}
    </p>

    <form
      v-if="store.organization"
      class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
      novalidate
      @submit.prevent="submit"
    >
      <div v-for="field in editableFields" :key="field.key">
        <label :for="`org-${field.key}`" class="mb-1 block text-xs font-semibold text-slate-700">
          {{ field.label }}
        </label>
        <input
          :id="`org-${field.key}`"
          v-model="form[field.key]"
          :type="typeof field.value === 'number' ? 'number' : 'text'"
          autocomplete="off"
          class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-500"
          :aria-invalid="Boolean(store.fieldErrors[field.key])"
        />
        <p v-if="store.fieldErrors[field.key]" class="mt-1 text-xs text-red-600">
          {{ store.fieldErrors[field.key] }}
        </p>
      </div>

      <dl v-if="readOnlyFields.length" class="grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
        <div v-for="field in readOnlyFields" :key="field.key">
          <dt class="text-xs text-slate-500">{{ field.label }}</dt>
          <dd class="font-semibold text-slate-900">{{ display(field) }}</dd>
        </div>
      </dl>

      <p v-if="store.saveError" role="alert" class="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
        {{ store.saveError }}
      </p>
      <p v-if="store.notice" role="status" class="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
        {{ store.notice }}
      </p>

      <button
        type="submit"
        class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        :disabled="store.saving || !dirty"
      >
        <LoaderCircle v-if="store.saving" :size="15" class="animate-spin" aria-hidden="true" />
        <Save v-else :size="15" aria-hidden="true" />
        Guardar cambios
      </button>
    </form>
  </div>
</template>
