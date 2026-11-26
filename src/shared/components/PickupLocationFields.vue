<script setup>
import { computed, onBeforeUnmount, ref, useId, watch } from "vue";
import RouteMap from "./RouteMap.vue";
import { validPoint } from "@/shared/utils/forms";
const model = defineModel({ required: true });
defineProps({
  legend: { type: String, default: "Ubicación de recojo" },
  mapLabel: { type: String, default: "Elegir ubicación de recojo" },
  confirmLabel: {
    type: String,
    default:
      "Confirmo que este punto y la dirección corresponden al lugar de recojo.",
  },
  showReference: { type: Boolean, default: true },
});
const id = useId(),
  error = ref(""),
  locating = ref(false);
let alive = true;
onBeforeUnmount(() => {
  alive = false;
});
const points = computed(() =>
  validPoint(model.value.latitude, model.value.longitude)
    ? [
        {
          latitude: model.value.latitude,
          longitude: model.value.longitude,
          name: "Ubicación seleccionada",
        },
      ]
    : [],
);
watch(
  () => [model.value.latitude, model.value.longitude, model.value.address],
  () => {
    model.value.locationConfirmed = false;
  },
  { flush: "sync" },
);
function choose(point) {
  Object.assign(model.value, point);
  model.value.locationConfirmed = false;
  error.value = "";
}
function locate() {
  if (locating.value) return;
  if (!navigator.geolocation) {
    error.value =
      "Este navegador no permite obtener tu ubicación. Selecciónala en el mapa.";
    return;
  }
  locating.value = true;
  error.value = "";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      if (!alive) return;
      choose({
        latitude: Number(position.coords.latitude.toFixed(6)),
        longitude: Number(position.coords.longitude.toFixed(6)),
      });
      locating.value = false;
    },
    () => {
      if (alive) {
        error.value =
          "No se pudo obtener tu ubicación. No se ha elegido ningún punto nuevo. Usa el mapa o las coordenadas.";
        locating.value = false;
      }
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
  );
}
</script>
<template>
  <fieldset class="rs-stack">
    <legend>{{ legend }}</legend>
    <label :for="`${id}-address`"
      >Dirección<input
        :id="`${id}-address`"
        v-model="model.address"
        required
        minlength="5"
        maxlength="200"
        autocomplete="street-address"
    /></label>
    <label v-if="showReference" :for="`${id}-reference`"
      >Referencia (opcional)<input
        :id="`${id}-reference`"
        v-model="model.reference"
        maxlength="200"
    /></label>
    <button
      type="button"
      class="rs-button-secondary"
      :disabled="locating"
      @click="locate"
    >
      {{ locating ? "Obteniendo ubicación…" : "Usar mi ubicación" }}
    </button>
    <p v-if="error" role="alert" class="rs-error">{{ error }}</p>
    <RouteMap
      :points="points"
      selectable
      :label="mapLabel"
      @select="choose"
    />
    <div class="rs-grid">
      <label :for="`${id}-lat`"
        >Latitud<input
          :id="`${id}-lat`"
          v-model="model.latitude"
          type="number"
          step="any"
          min="-90"
          max="90"
          required /></label
      ><label :for="`${id}-lng`"
        >Longitud<input
          :id="`${id}-lng`"
          v-model="model.longitude"
          type="number"
          step="any"
          min="-180"
          max="180"
          required
      /></label>
    </div>
    <label class="rs-check"
      ><input
        v-model="model.locationConfirmed"
        type="checkbox"
        required
        :disabled="!points.length || !model.address?.trim()"
      />{{ confirmLabel }}</label
    >
  </fieldset>
</template>
