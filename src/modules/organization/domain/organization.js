// Domain: pure functions, no Vue / Axios.
// The backend contract does not enumerate organization fields, so the editable form is derived
// from the real GET payload: nothing is invented and nothing is shown that the server did not send.

const IDENTITY_KEYS = ['id', 'organizationId']
const READ_ONLY_PATTERN = /(^id$|Id$|At$|On$|^status$|^createdBy$)/

const isScalar = (value) =>
  value === null || ['string', 'number', 'boolean'].includes(typeof value)

const LABELS = {
  name: 'Nombre',
  legalName: 'Razón social',
  tradeName: 'Nombre comercial',
  taxId: 'RUC / Identificación fiscal',
  ruc: 'RUC',
  email: 'Correo electrónico',
  contactEmail: 'Correo de contacto',
  phoneNumber: 'Teléfono',
  phone: 'Teléfono',
  address: 'Dirección',
  city: 'Ciudad',
  country: 'País',
  status: 'Estado',
  createdAt: 'Creada',
  updatedAt: 'Actualizada',
}

export const fieldLabel = (key) =>
  LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())

export function createOrganization(dto) {
  if (!dto || typeof dto !== 'object') return null
  const id = dto.organizationId ?? dto.id ?? null
  const fields = Object.entries(dto)
    .filter(([key, value]) => !IDENTITY_KEYS.includes(key) && isScalar(value))
    .map(([key, value]) => ({
      key,
      label: fieldLabel(key),
      value,
      editable: !READ_ONLY_PATTERN.test(key) && typeof value !== 'boolean',
    }))
  return { id: id === null ? null : String(id), fields }
}

// Form holds only the editable keys returned by the server; null becomes '' for inputs.
export function toForm(organization) {
  return Object.fromEntries(
    (organization?.fields ?? [])
      .filter((field) => field.editable)
      .map((field) => [field.key, field.value ?? '']),
  )
}

export function validateOrganizationForm(form) {
  const errors = {}
  for (const [key, value] of Object.entries(form)) {
    if (key === 'name' && !String(value).trim()) errors[key] = 'Ingresa el nombre de la organización.'
  }
  return { valid: !Object.keys(errors).length, errors }
}

// Sends the edited fields, trimmed; empty strings are sent as null only if the server returned null.
export function toPayload(form, organization) {
  const original = Object.fromEntries(organization.fields.map((field) => [field.key, field.value]))
  return Object.fromEntries(
    Object.entries(form).map(([key, value]) => {
      const text = typeof value === 'string' ? value.trim() : value
      return [key, text === '' && original[key] === null ? null : text]
    }),
  )
}

export const isDirty = (form, organization) => {
  const baseline = toForm(organization)
  return Object.keys(form).some((key) => String(form[key]).trim() !== String(baseline[key] ?? ''))
}
