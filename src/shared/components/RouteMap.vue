<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { validPoint } from "@/shared/utils/forms";
const props = defineProps({
  points: { type: Array, default: () => [] },
  geometry: Object,
  selectable: Boolean,
  label: { type: String, default: "Mapa de paradas" },
});
const emit = defineEmits(["select"]);
const element = ref(null),
  tileError = ref(false);
let map, layer, observer;
function render() {
  if (!map) return;
  layer.clearLayers();
  for (const [index, point] of props.points.entries()) {
    if (!validPoint(point.latitude, point.longitude)) continue;
    const text = document.createElement("span");
    text.textContent = point.name || `Punto ${index + 1}`;
    L.circleMarker([Number(point.latitude), Number(point.longitude)], {
      radius: 8,
      color: "#15243B",
      fillColor: "#F2B705",
      fillOpacity: 1,
    })
      .bindTooltip(text)
      .addTo(layer);
  }
  if (props.geometry) {
    try {
      L.geoJSON(props.geometry, {
        style: { color: "#1F5FAD", weight: 5 },
      }).addTo(layer);
    } catch {
      /* Points remain usable; geometry is validated by the backend. */
    }
  }
  const bounds = layer.getBounds();
  if (bounds.isValid())
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16, animate: false });
}
onMounted(() => {
  // Lima is only the initial viewport, never a selected/persisted location.
  map = L.map(element.value, { scrollWheelZoom: false }).setView(
    [-12.08, -77.03],
    12,
  );
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  })
    .on("tileerror", () => {
      tileError.value = true;
    })
    .addTo(map);
  layer = L.featureGroup().addTo(map);
  map.on("click", (event) => {
    if (props.selectable)
      emit("select", {
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      });
  });
  observer = new ResizeObserver(() => map?.invalidateSize());
  observer.observe(element.value);
  render();
});
watch(() => [props.points, props.geometry], render, { deep: true });
onBeforeUnmount(() => {
  observer?.disconnect();
  map?.remove();
  map = null;
});
</script>
<template>
  <div>
    <div ref="element" class="rs-map" role="region" :aria-label="label" />
    <p v-if="tileError" class="rs-hint" role="status">
      No se pudo cargar el mapa base. Puedes usar las coordenadas y los
      controles del formulario.
    </p>
    <p v-if="selectable" class="rs-hint">
      Toca el mapa o introduce coordenadas para elegir el punto. Después
      confirma la ubicación.
    </p>
  </div>
</template>
