export function apiError(
  error,
  fallback = "No se pudo completar la operación.",
) {
  const body = error?.response?.data;
  const errors =
    body?.errors &&
    Object.values(body.errors)
      .flat()
      .filter((x) => typeof x === "string");
  return (
    body?.detail ||
    errors?.join(" ") ||
    body?.message ||
    body?.title ||
    error?.message ||
    fallback
  );
}
export function validPoint(latitude, longitude) {
  return (
    latitude !== "" &&
    longitude !== "" &&
    latitude != null &&
    longitude != null &&
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude)) &&
    Math.abs(Number(latitude)) <= 90 &&
    Math.abs(Number(longitude)) <= 180
  );
}
export function emptyStudent() {
  return {
    firstName: "",
    lastName: "",
    birthDate: "",
    schoolGrade: "",
    schoolName: "",
    address: "",
    reference: "",
    latitude: "",
    longitude: "",
    locationConfirmed: false,
  };
}
export function studentPayload(form) {
  if (
    !validPoint(form.latitude, form.longitude) ||
    (Number(form.latitude) === 0 && Number(form.longitude) === 0) ||
    !form.locationConfirmed
  )
    throw new Error("Selecciona y confirma una ubicación de recojo válida.");
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    birthDate: form.birthDate || null,
    schoolGrade: form.schoolGrade?.trim() || null,
    schoolName: form.schoolName?.trim() || null,
    pickupLocation: {
      address: form.address.trim(),
      reference: form.reference?.trim() || null,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
    },
  };
}
export const statusLabel = (value) =>
  ({
    PENDING: "Pendiente de revisión",
    VERIFIED: "Verificado",
    REVOKED: "Revocado",
    ACTIVE: "Activo",
    CANCELLED: "Cancelado",
    WITHDRAWN: "Retirado",
    PENDING_VERIFICATION: "Pendiente de verificación",
    SUSPENDED: "Suspendido",
    ENABLED: "Habilitado",
    DISABLED: "Deshabilitado",
  })[value] || value;
