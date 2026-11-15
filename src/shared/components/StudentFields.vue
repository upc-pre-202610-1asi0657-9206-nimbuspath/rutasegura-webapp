<script setup>
import { useId } from "vue";
import PickupLocationFields from "./PickupLocationFields.vue";
const model = defineModel({ required: true });
const id = useId();
</script>
<template>
  <div class="rs-stack">
    <div class="rs-grid">
      <label :for="`${id}-first`"
        >Nombres del alumno<input
          :id="`${id}-first`"
          v-model="model.firstName"
          required
          maxlength="80" /></label
      ><label :for="`${id}-last`"
        >Apellidos del alumno<input
          :id="`${id}-last`"
          v-model="model.lastName"
          required
          maxlength="80"
      /></label>
    </div>
    <div class="rs-grid">
      <label :for="`${id}-birth`"
        >Fecha de nacimiento (opcional)<input
          :id="`${id}-birth`"
          v-model="model.birthDate"
          type="date"
          :max="new Date().toISOString().slice(0, 10)" /></label
      ><label :for="`${id}-grade`"
        >Grado (opcional)<input
          :id="`${id}-grade`"
          v-model="model.schoolGrade"
          maxlength="40"
      /></label>
    </div>
    <label :for="`${id}-school`"
      >Colegio (opcional)<input
        :id="`${id}-school`"
        v-model="model.schoolName"
        maxlength="100"
    /></label>
    <PickupLocationFields v-model="model" />
  </div>
</template>
