<script setup>
import { onBeforeUnmount, ref, watch } from "vue";
import api from "@/shared/api/apiClient";
const props = defineProps({
  studentId: { type: String, required: true },
  version: String,
});
const url = ref(""),
  error = ref("");
let controller,
  generation = 0;
function clear() {
  if (url.value) URL.revokeObjectURL(url.value);
  url.value = "";
}
async function load() {
  const request = ++generation;
  controller?.abort();
  controller = new AbortController();
  clear();
  error.value = "";
  try {
    // Construct our own same-API path; never send a bearer token to a URL from a resource.
    const { data } = await api.get(
      `/stakeholders/students/${props.studentId}/photo`,
      {
        responseType: "blob",
        signal: controller.signal,
        headers: {
          Accept: "image/jpeg, image/png, image/webp",
          "Cache-Control": "no-cache",
        },
      },
    );
    if (request !== generation) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(data.type))
      throw new Error("Invalid image");
    url.value = URL.createObjectURL(data);
  } catch (e) {
    if (request === generation && e.code !== "ERR_CANCELED")
      error.value = "Foto no disponible.";
  }
}
watch(() => [props.studentId, props.version], load, { immediate: true });
onBeforeUnmount(() => {
  ++generation;
  controller?.abort();
  clear();
});
</script>
<template>
  <div>
    <img
      v-if="url"
      :src="url"
      alt="Foto del alumno"
      class="rs-private-photo"
    /><span v-else-if="error" class="rs-hint" role="status">{{ error }}</span>
  </div>
</template>
