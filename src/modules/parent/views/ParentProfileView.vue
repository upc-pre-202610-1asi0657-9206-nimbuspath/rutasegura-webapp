<script setup>
import { onMounted, reactive, ref } from 'vue'
import {
  AlertTriangle,
  CheckCircle2,
  Phone,
  CreditCard,
  Save,
} from 'lucide-vue-next'

import {
  getParentProfile,
  updateParentProfile,
} from '@/modules/parent/services/parentService'

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const success = ref('')

const form = reactive({
  phoneNumber: '',
  documentNumber: '',
})

async function loadProfile() {
  loading.value = true
  error.value = ''

  try {
    const profile = await getParentProfile()

    form.phoneNumber = profile?.phoneNumber || ''
    form.documentNumber = profile?.documentNumber || ''
  } catch (err) {
    console.error(err)

    error.value =
      err?.response?.data?.detail ||
      'No fue posible cargar tu perfil.'
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  error.value = ''
  success.value = ''

  const normalizedPhone = form.phoneNumber.replace(/[^\d+]/g, '')
  const digits = normalizedPhone.replace('+', '')

  if (digits.length < 7 || digits.length > 15) {
    error.value =
      'El teléfono debe tener entre 7 y 15 dígitos.'
    return
  }

  saving.value = true

  try {
    await updateParentProfile(form)

    success.value = 'Perfil actualizado correctamente.'
  } catch (err) {
    console.error(err)

    error.value =
      err?.response?.data?.detail ||
      'No fue posible actualizar tu perfil.'
  } finally {
    saving.value = false
  }
}

onMounted(loadProfile)
</script>

<template>
  <main class="mx-auto max-w-5xl px-5 py-8 lg:px-8">
    <div>
      <p class="text-xs font-bold uppercase tracking-wider text-blue-600">
        Cuenta
      </p>

      <h1 class="mt-1 text-2xl font-bold text-slate-900">
        Mi perfil
      </h1>

      <p class="mt-1 text-sm text-slate-500">
        Administra la información de contacto asociada a tu cuenta.
      </p>
    </div>

    <div
      v-if="error"
      class="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4"
    >
      <AlertTriangle
        :size="19"
        class="mt-0.5 shrink-0 text-red-600"
      />

      <p class="text-sm text-red-700">
        {{ error }}
      </p>
    </div>

    <div
      v-if="success"
      class="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
    >
      <CheckCircle2
        :size="19"
        class="mt-0.5 shrink-0 text-emerald-600"
      />

      <p class="text-sm text-emerald-700">
        {{ success }}
      </p>
    </div>

    <section
      class="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8"
    >
      <div v-if="loading">
        <div class="h-12 animate-pulse rounded-xl bg-slate-100" />
        <div class="mt-4 h-12 animate-pulse rounded-xl bg-slate-100" />
      </div>

      <form
        v-else
        class="space-y-5"
        @submit.prevent="saveProfile"
      >
        <div>
          <label
            for="phone"
            class="text-sm font-semibold text-slate-700"
          >
            Teléfono de contacto
          </label>

          <div
            class="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 px-4"
          >
            <Phone
              :size="18"
              class="text-slate-400"
            />

            <input
              id="phone"
              v-model="form.phoneNumber"
              type="tel"
              class="min-h-12 w-full border-0 bg-transparent text-sm outline-none"
              placeholder="+51987654321"
            />
          </div>

          <p class="mt-2 text-xs text-slate-400">
            Este número puede ser utilizado por la empresa de transporte
            para contactarte.
          </p>
        </div>

        <div>
          <label
            for="document"
            class="text-sm font-semibold text-slate-700"
          >
            Documento de identidad
          </label>

          <div
            class="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 px-4"
          >
            <CreditCard
              :size="18"
              class="text-slate-400"
            />

            <input
              id="document"
              v-model="form.documentNumber"
              class="min-h-12 w-full border-0 bg-transparent text-sm outline-none"
              placeholder="12345678"
            />
          </div>

          <p class="mt-2 text-xs text-slate-400">
            Campo opcional.
          </p>
        </div>

        <div class="flex justify-end pt-2">
          <button
            type="submit"
            :disabled="saving"
            class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            <Save :size="17" />

            {{ saving ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </form>
    </section>
  </main>
</template>