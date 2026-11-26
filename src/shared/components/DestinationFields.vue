<script setup>
import PickupLocationFields from "./PickupLocationFields.vue";
const model = defineModel({ required: true });
defineProps({ direction: { type: String, default: "PICKUP" } });
</script>
<template>
  <div class="rs-stack">
    <label
      >Nombre del destino<input
        v-model="model.name"
        required
        maxlength="100"
        placeholder="Ej. Colegio San Martín"
    /></label>
    <p class="rs-hint">
      {{
        direction === "RETURN"
          ? "En el retorno, este es el colegio donde empieza el recorrido."
          : "Aquí termina el recorrido de ida."
      }}
    </p>
    <PickupLocationFields
      v-model="model"
      legend="Ubicación del destino"
      map-label="Elegir ubicación del destino"
      confirm-label="Confirmo que este punto y la dirección corresponden al destino."
      :show-reference="false"
    />
  </div>
</template>
