import { defineStore } from 'pinia'
import { useAuthStore } from '@/modules/auth/stores/authStore'
import { apiError } from '@/shared/utils/forms'
import { toPayload, validateOrganizationForm } from '../domain/organization'
import { fetchOrganization, updateOrganization } from '../infrastructure/organizationRepository'

let controller = null

export const useOrganizationStore = defineStore('organization', {
  state: () => ({
    organization: null,
    loading: false,
    loaded: false,
    saving: false,
    error: '',
    saveError: '',
    notice: '',
    fieldErrors: {},
  }),
  actions: {
    organizationId() {
      return useAuthStore().user?.organizationId ?? null
    },
    async load() {
      const id = this.organizationId()
      if (!id) {
        this.error = 'Tu cuenta no está asociada a una organización.'
        this.loaded = true
        return
      }
      controller?.abort()
      const request = (controller = new AbortController())
      this.loading = true
      this.error = ''
      try {
        const organization = await fetchOrganization(id, request.signal)
        if (request.signal.aborted) return
        this.organization = organization
        this.loaded = true
      } catch (error) {
        if (error?.code === 'ERR_CANCELED' || request.signal.aborted) return
        this.error = apiError(error, 'No fue posible cargar los datos de la organización.')
        this.loaded = true
      } finally {
        if (controller === request) this.loading = false
      }
    },
    async save(form) {
      const id = this.organizationId()
      if (!id || !this.organization || this.saving) return false
      const { valid, errors } = validateOrganizationForm(form)
      this.fieldErrors = errors
      this.saveError = ''
      this.notice = ''
      if (!valid) return false
      this.saving = true
      try {
        await updateOrganization(id, toPayload(form, this.organization))
        this.notice = 'Datos de la organización actualizados.'
        await this.load()
        return true
      } catch (error) {
        this.saveError = apiError(error, 'No fue posible actualizar la organización.')
        return false
      } finally {
        this.saving = false
      }
    },
    reset() {
      controller?.abort()
      this.$reset()
    },
  },
})
