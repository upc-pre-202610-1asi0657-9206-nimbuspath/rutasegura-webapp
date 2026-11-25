<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import AppFeedback from "@/shared/components/AppFeedback.vue";
import AppFormDialog from "@/shared/components/AppFormDialog.vue";
import AppConfirmDialog from "@/shared/components/AppConfirmDialog.vue";
import { apiError, statusLabel } from "@/shared/utils/forms";
import {
  getOrganizationUsers,
  getDrivers,
  getVehicles,
  createDriverAccount,
  registerDriver,
  registerVehicle,
  verifyDriver,
  suspendDriver,
  reinstateDriver,
  enableVehicle,
  disableVehicle,
  changeVehicleCapacity,
} from "../services/adminService";
const users = ref([]),
  drivers = ref([]),
  vehicles = ref([]),
  loading = ref(true),
  busy = ref(false),
  error = ref(""),
  notice = ref(""),
  formError = ref("");
const mode = ref(""),
  pendingAction = ref(null);
const account = reactive({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
});
const driver = reactive({
  userId: "",
  firstName: "",
  lastName: "",
  documentNumber: "",
  licenseNumber: "",
  licenseCategory: "A-IIB",
  licenseExpiresOn: "",
  phoneNumber: "",
});
const vehicle = reactive({
  licensePlate: "",
  seatingCapacity: 20,
  brand: "",
  model: "",
});
const capacity = ref(1),
  selectedVehicle = ref(null);
const available = computed(() =>
  users.value.filter(
    (u) =>
      u.roleTier === "DRIVER" && !drivers.value.some((d) => d.userId === u.id),
  ),
);
async function load() {
  loading.value = true;
  error.value = "";
  try {
    [users.value, drivers.value, vehicles.value] = await Promise.all([
      getOrganizationUsers(),
      getDrivers(),
      getVehicles(),
    ]);
  } catch (e) {
    users.value = [];
    drivers.value = [];
    vehicles.value = [];
    error.value = apiError(e);
  } finally {
    loading.value = false;
  }
}
function open(value) {
  if (value === "account")
    Object.assign(account, {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    });
  if (value === "vehicle")
    Object.assign(vehicle, {
      licensePlate: "",
      seatingCapacity: 20,
      brand: "",
      model: "",
    });
  mode.value = value;
  formError.value = "";
}
function selectAccount() {
  const user = available.value.find((u) => u.id === driver.userId);
  if (user) {
    Object.assign(driver, {
      firstName: user.firstName,
      lastName: user.lastName,
      documentNumber: "",
      licenseNumber: "",
      licenseCategory: "A-IIB",
      licenseExpiresOn: "",
      phoneNumber: "",
    });
  }
}
async function createAccount() {
  if (busy.value) return;
  busy.value = true;
  formError.value = "";
  notice.value = "";
  try {
    const created = await createDriverAccount({ ...account });
    // Keep the returned ID before any subsequent request. Password is never stored.
    account.password = "";
    users.value.push(created);
    driver.userId = created.id;
    selectAccount();
    mode.value = "driver";
    notice.value =
      "Cuenta creada. Completa el perfil del conductor; si sales, podrás retomarlo en Cuentas pendientes.";
  } catch (e) {
    formError.value = apiError(e);
  } finally {
    busy.value = false;
  }
}
async function save() {
  if (busy.value) return;
  busy.value = true;
  formError.value = "";
  try {
    if (mode.value === "driver") await registerDriver({ ...driver });
    else if (mode.value === "vehicle") await registerVehicle({ ...vehicle });
    else
      await changeVehicleCapacity(
        selectedVehicle.value.id,
        Number(capacity.value),
      );
    mode.value = "";
    notice.value =
      "Cambio guardado. La agenda del conductor puede tardar unos segundos en actualizarse.";
    await load();
  } catch (e) {
    formError.value = apiError(e);
  } finally {
    busy.value = false;
  }
}
function confirm(label, fn) {
  pendingAction.value = { label, fn };
}
async function execute() {
  if (busy.value || !pendingAction.value) return;
  busy.value = true;
  error.value = "";
  try {
    await pendingAction.value.fn();
    pendingAction.value = null;
    notice.value =
      "Estado actualizado. Revisa las asignaciones antes del próximo viaje.";
    await load();
  } catch (e) {
    error.value = apiError(e);
    pendingAction.value = null;
  } finally {
    busy.value = false;
  }
}
onMounted(load);
</script>
<template>
  <div class="rs-workspace">
    <header class="rs-page-header">
      <h1>Conductores y vehículos</h1>
      <p>Prepara las cuentas, verifica las licencias y habilita tu flota.</p>
    </header>
    <AppFeedback
      v-if="error"
      kind="error"
      :message="error"
      @retry="load"
      retry-label="Volver a intentar"
    />
    <AppFeedback v-if="notice" kind="success" :message="notice" />
    <div class="rs-actions">
      <button
        class="rs-button-primary"
        :disabled="loading || busy"
        @click="open('account')"
      >
        Crear cuenta de conductor</button
      ><button
        class="rs-button-secondary"
        :disabled="loading || busy"
        @click="open('vehicle')"
      >
        Registrar vehículo</button
      ><button
        class="rs-button-secondary"
        :disabled="loading || busy"
        @click="load"
      >
        Actualizar recursos
      </button>
    </div>
    <AppFeedback v-if="loading" kind="loading" message="Cargando recursos…" />
    <template v-else>
      <section class="rs-panel rs-stack">
        <h2>Cuentas pendientes de perfil</h2>
        <p class="rs-hint">
          La cuenta permite iniciar sesión; el perfil y la verificación
          habilitan la operación. Elige una cuenta existente para retomar un
          alta parcial.
        </p>
        <p v-if="!available.length" class="rs-hint">
          No hay cuentas pendientes.
        </p>
        <div v-for="user in available" :key="user.id" class="rs-row">
          <span
            >{{ user.firstName }} {{ user.lastName }} · {{ user.email }}</span
          ><button
            class="rs-button-secondary"
            @click="
              driver.userId = user.id;
              selectAccount();
              open('driver');
            "
          >
            Completar perfil de {{ user.firstName }}
          </button>
        </div>
      </section>
      <section class="rs-panel rs-stack">
        <h2>Conductores</h2>
        <p v-if="!drivers.length" class="rs-hint">
          Aún no registraste conductores.
        </p>
        <article
          v-for="d in drivers"
          :key="d.id"
          class="rs-row"
          :aria-label="`Conductor ${d.firstName}`"
        >
          <h3>{{ d.firstName }} {{ d.lastName }}</h3>
          <span class="rs-badge" :data-status="d.status">{{ statusLabel(d.status) }}</span>
          <p class="rs-hint">
            Licencia {{ d.licenseNumber }} · {{ d.licenseCategory }} · vence
            {{ d.licenseExpiresOn }} · {{ d.phoneNumber }}
          </p>
          <div class="rs-actions">
            <button
              v-if="d.status === 'PENDING_VERIFICATION'"
              class="rs-button-primary"
              :disabled="busy"
              @click="confirm('Verificar conductor', () => verifyDriver(d.id))"
            >
              Verificar conductor</button
            ><button
              v-if="d.status === 'VERIFIED'"
              class="rs-button-secondary"
              :disabled="busy"
              @click="confirm('Suspender conductor', () => suspendDriver(d.id))"
            >
              Suspender conductor</button
            ><button
              v-if="d.status === 'SUSPENDED'"
              class="rs-button-secondary"
              :disabled="busy"
              @click="
                confirm('Reactivar conductor', () => reinstateDriver(d.id))
              "
            >
              Reactivar conductor
            </button>
          </div>
        </article>
      </section>
      <section class="rs-panel rs-stack">
        <h2>Vehículos</h2>
        <p v-if="!vehicles.length" class="rs-hint">
          Aún no registraste vehículos.
        </p>
        <article
          v-for="v in vehicles"
          :key="v.id"
          class="rs-row"
          :aria-label="`Vehículo ${v.licensePlate}`"
        >
          <h3>{{ v.licensePlate }} · {{ v.brand }} {{ v.model }}</h3>
          <span class="rs-badge" :data-status="v.status">{{ statusLabel(v.status) }}</span>
          <p>{{ v.seatingCapacity }} asientos</p>
          <div class="rs-actions">
            <button
              class="rs-button-secondary"
              :disabled="busy"
              @click="
                confirm(
                  v.status === 'ENABLED'
                    ? 'Deshabilitar vehículo'
                    : 'Habilitar vehículo',
                  () =>
                    v.status === 'ENABLED'
                      ? disableVehicle(v.id)
                      : enableVehicle(v.id),
                )
              "
            >
              {{
                v.status === "ENABLED"
                  ? "Deshabilitar vehículo"
                  : "Habilitar vehículo"
              }}</button
            ><button
              class="rs-button-secondary"
              @click="
                selectedVehicle = v;
                capacity = v.seatingCapacity;
                open('capacity');
              "
            >
              Cambiar capacidad
            </button>
          </div>
        </article>
      </section>
    </template>
    <AppFormDialog
      v-if="mode"
      :title="
        {
          account: 'Crear cuenta de conductor',
          driver: 'Completar perfil del conductor',
          vehicle: 'Registrar vehículo',
          capacity: 'Cambiar capacidad',
        }[mode]
      "
      :busy="busy"
      @close="
        mode = '';
        account.password = '';
      "
    >
      <AppFeedback
        v-if="formError"
        kind="error"
        :message="formError"
        class="mb-4"
      />
      <form
        v-if="mode === 'account'"
        class="rs-stack"
        @submit.prevent="createAccount"
      >
        <div class="rs-grid">
          <label
            >Nombres<input
              v-model="account.firstName"
              required
              maxlength="80" /></label
          ><label
            >Apellidos<input v-model="account.lastName" required maxlength="80"
          /></label>
        </div>
        <label
          >Correo electrónico<input
            v-model="account.email"
            type="email"
            required
            autocomplete="off" /></label
        ><label
          >Contraseña inicial<input
            v-model="account.password"
            type="password"
            required
            minlength="8"
            autocomplete="new-password" /></label
        ><button class="rs-button-primary" :disabled="busy">
          {{ busy ? "Creando…" : "Crear cuenta y continuar" }}
        </button>
      </form>
      <form v-else class="rs-stack" @submit.prevent="save">
        <template v-if="mode === 'driver'"
          ><label
            >Cuenta de conductor<select
              v-model="driver.userId"
              required
              @change="selectAccount"
            >
              <option value="" disabled>Selecciona una cuenta</option>
              <option v-for="u in available" :value="u.id" :key="u.id">
                {{ u.firstName }} {{ u.lastName }} · {{ u.email }}
              </option>
            </select></label
          >
          <div class="rs-grid">
            <label>Nombres<input v-model="driver.firstName" required /></label
            ><label>Apellidos<input v-model="driver.lastName" required /></label
            ><label
              >Documento<input
                v-model="driver.documentNumber"
                required /></label
            ><label
              >Teléfono<input
                v-model="driver.phoneNumber"
                required
                type="tel" /></label
            ><label
              >Número de licencia<input
                v-model="driver.licenseNumber"
                required /></label
            ><label
              >Categoría de licencia<input
                v-model="driver.licenseCategory"
                required /></label
            ><label
              >Vencimiento de licencia<input
                v-model="driver.licenseExpiresOn"
                type="date"
                required
            /></label></div
        ></template>
        <template v-if="mode === 'vehicle'"
          ><div class="rs-grid">
            <label
              >Placa<input
                v-model="vehicle.licensePlate"
                required
                maxlength="12" /></label
            ><label
              >Asientos<input
                v-model="vehicle.seatingCapacity"
                type="number"
                min="1"
                max="60"
                step="1"
                required /></label
            ><label>Marca<input v-model="vehicle.brand" required /></label
            ><label
              >Modelo<input v-model="vehicle.model" required
            /></label></div
        ></template>
        <label v-if="mode === 'capacity'"
          >Número de asientos<input
            v-model="capacity"
            type="number"
            min="1"
            max="60"
            step="1"
            required
        /></label>
        <button class="rs-button-primary" :disabled="busy">
          {{ busy ? "Guardando…" : "Guardar" }}
        </button>
      </form>
    </AppFormDialog>
    <AppConfirmDialog
      :open="!!pendingAction"
      :title="pendingAction?.label"
      message="El cambio puede afectar la disponibilidad para nuevas asignaciones. Las reglas de la operación se comprobarán antes de guardarlo."
      :busy="busy"
      @cancel="pendingAction = null"
      @confirm="execute"
    />
  </div>
</template>
