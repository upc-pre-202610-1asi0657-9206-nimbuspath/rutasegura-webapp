<script setup>
import { onBeforeUnmount, onMounted, ref, useId } from "vue";
const props = defineProps({ title: String, busy: Boolean });
const emit = defineEmits(["close"]);
const dialog = ref(null);
const titleId = useId();
let previousFocus, previousOverflow;
onMounted(() => {
  previousFocus = document.activeElement;
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  dialog.value.showModal();
});
onBeforeUnmount(() => {
  dialog.value?.close();
  document.body.style.overflow = previousOverflow;
  previousFocus?.focus();
});
function close() {
  if (!props.busy) emit("close");
}
</script>
<template>
  <dialog
    ref="dialog"
    class="rs-form-dialog"
    :aria-labelledby="titleId"
    :aria-busy="busy"
    @cancel.prevent="close"
    @click="
      (e) => {
        if (e.target === dialog) close();
      }
    "
  >
    <header class="rs-dialog-header">
      <h2 :id="titleId">{{ title }}</h2>
      <button
        class="rs-button-secondary"
        type="button"
        aria-label="Cerrar ventana"
        :disabled="busy"
        @click="close"
      >
        Cerrar
      </button>
    </header>
    <div class="rs-dialog-content"><slot /></div>
  </dialog>
</template>
