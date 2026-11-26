<script setup>
import { onMounted, ref } from "vue";
import AppFeedback from "@/shared/components/AppFeedback.vue";
import { apiError } from "@/shared/utils/forms";
import { getAvailableRoutes } from "../services/parentService";
defineProps({
  selectable: Boolean,
  disabled: Boolean,
});
const emit = defineEmits(["select"]);
const routes = ref([]),
  loading = ref(true),
  error = ref("");
async function load() {
  loading.value = true;
  error.value = "";
  try {
    const data = await getAvailableRoutes();
    routes.value = Array.isArray(data) ? data : [];
  } catch (e) {
    routes.value = [];
    error.value = apiError(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);
</script>
<template>
  <section class="rs-stack" aria-label="Rutas disponibles">
    <h3>Rutas disponibles</h3>
    <AppFeedback v-if="loading" kind="loading" message="Cargando rutas…" />
    <AppFeedback
      v-else-if="error"
      kind="error"
      :message="error"
      retry-label="Volver a intentar"
      @retry="load"
    />
    <p v-else-if="!routes.length" class="rs-hint">
      Todavía no hay rutas abiertas a inscripciones.
    </p>
    <article v-for="r in routes" :key="r.routeId" class="rs-row">
      <strong>{{ r.routeName }}</strong>
      <p>Destino: {{ r.destinationName }}</p>
      <p class="rs-hint">{{ r.destinationAddress }}</p>
      <p class="rs-hint">
        {{ r.organizationName }} ·
        {{ r.direction === "RETURN" ? "Retorno" : "Ida" }} ·
        {{ r.departureTime?.slice(0, 5) }}–{{
          r.estimatedArrivalTime?.slice(0, 5)
        }}
        <template v-if="r.availableSeats != null">
          · {{ r.availableSeats }} cupos disponibles</template
        >
      </p>
      <p>
        Código: <strong>{{ r.enrollmentCode }}</strong>
      </p>
      <button
        v-if="selectable"
        type="button"
        class="rs-button-secondary"
        :disabled="disabled || r.availableSeats === 0"
        @click="emit('select', r.enrollmentCode)"
      >
        {{ r.availableSeats === 0 ? "Sin cupos" : `Elegir ${r.routeName}` }}
      </button>
    </article>
  </section>
</template>
