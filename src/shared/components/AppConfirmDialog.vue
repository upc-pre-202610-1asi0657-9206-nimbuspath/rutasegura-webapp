<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
const props = defineProps({ open: Boolean, title: String, message: String, busy: Boolean, confirmLabel: { type: String, default: 'Confirmar' }, danger: Boolean })
const emit = defineEmits(['confirm', 'cancel'])
const dialog = ref(null)
let previousFocus
watch(() => props.open, async (open) => {
  await nextTick()
  if (open && !dialog.value.open) { previousFocus = document.activeElement; dialog.value.showModal() }
  else if (!open && dialog.value.open) { dialog.value.close(); previousFocus?.focus() }
}, { immediate: true })
const cancel = () => { if (!props.busy) emit('cancel') }
onBeforeUnmount(() => { dialog.value?.close(); previousFocus?.focus() })
</script>
<template>
  <dialog ref="dialog" class="rs-confirm" aria-labelledby="confirmation-title" aria-describedby="confirmation-description" :aria-busy="busy" @cancel.prevent="cancel">
    <h2 id="confirmation-title" class="text-lg font-bold">{{ title }}</h2>
    <p id="confirmation-description" class="mt-3 text-sm leading-relaxed text-slate-500">{{ message }}</p>
    <div class="mt-6 grid grid-cols-2 gap-3">
      <button type="button" class="rs-button-secondary" :disabled="busy" autofocus @click="cancel">Cancelar</button>
      <button type="button" :class="danger ? 'rs-button-danger' : 'rs-button-primary'" :disabled="busy" @click="emit('confirm')">{{ busy ? 'Procesando…' : confirmLabel }}</button>
    </div>
  </dialog>
</template>
