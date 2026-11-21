import { defineStore } from 'pinia'
import { apiError } from '@/shared/utils/forms'
import { countUnread, sortByNewest, validateAnnouncement } from '../domain/notification'
import {
  fetchFailedDeliveries,
  fetchNotificationPage,
  fetchNotifications,
  markNotificationRead,
  replayDelivery,
  sendAnnouncement,
} from '../infrastructure/notificationRepository'

let controller = null

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    items: [],
    pageMeta: {},
    loading: false,
    error: '',
    loaded: false,
    markingIds: [],
    sending: false,
    announcementNotice: '',
    announcementError: '',
    failedDeliveries: [],
    failedLoading: false,
    failedLoaded: false,
    failedError: '',
    replayingIds: [],
    replayNotice: '',
  }),
  getters: {
    unreadCount: (state) => countUnread(state.items),
    isMarking: (state) => (id) => state.markingIds.includes(id),
  },
  actions: {
    async load() {
      controller?.abort()
      const request = (controller = new AbortController())
      this.loading = true
      this.error = ''
      try {
        const items = await fetchNotifications(request.signal)
        if (request.signal.aborted) return
        this.items = sortByNewest(items)
        this.loaded = true
      } catch (error) {
        if (error?.code === 'ERR_CANCELED') return
        this.error = apiError(error, 'No fue posible cargar las notificaciones.')
      } finally {
        if (controller === request) this.loading = false
      }
    },
    async loadPage(params) {
      controller?.abort()
      const request = (controller = new AbortController())
      this.loading = true
      this.error = ''
      try {
        const page = await fetchNotificationPage(params, request.signal)
        if (request.signal.aborted) return
        this.items = sortByNewest(page.items)
        this.pageMeta = page.meta
        this.loaded = true
      } catch (error) {
        if (error?.code === 'ERR_CANCELED') return
        this.error = apiError(error, 'No fue posible cargar las notificaciones.')
      } finally {
        if (controller === request) this.loading = false
      }
    },
    async markAsRead(id) {
      if (this.markingIds.includes(id)) return
      this.markingIds.push(id)
      this.error = ''
      try {
        await markNotificationRead(id)
        const item = this.items.find((entry) => entry.id === id)
        if (item) {
          item.read = true
          item.readAt = new Date().toISOString()
        }
      } catch (error) {
        this.error = apiError(error, 'No fue posible marcar la notificación como leída.')
      } finally {
        this.markingIds = this.markingIds.filter((entry) => entry !== id)
      }
    },
    async publishAnnouncement(form) {
      const { valid, payload } = validateAnnouncement(form)
      if (!valid || this.sending) return false
      this.sending = true
      this.announcementError = ''
      this.announcementNotice = ''
      try {
        await sendAnnouncement(payload)
        this.announcementNotice = 'Comunicado enviado.'
        return true
      } catch (error) {
        this.announcementError = apiError(error, 'No fue posible enviar el comunicado.')
        return false
      } finally {
        this.sending = false
      }
    },
    async loadFailedDeliveries() {
      this.failedLoading = true
      this.failedError = ''
      try {
        this.failedDeliveries = await fetchFailedDeliveries()
        this.failedLoaded = true
      } catch (error) {
        this.failedError = apiError(error, 'No fue posible cargar las entregas fallidas.')
      } finally {
        this.failedLoading = false
      }
    },
    async replay(id) {
      if (this.replayingIds.includes(id)) return
      this.replayingIds.push(id)
      this.failedError = ''
      this.replayNotice = ''
      try {
        await replayDelivery(id)
        this.replayNotice = 'Reintento solicitado.'
        await this.loadFailedDeliveries()
      } catch (error) {
        this.failedError = apiError(error, 'No fue posible reintentar la entrega.')
      } finally {
        this.replayingIds = this.replayingIds.filter((entry) => entry !== id)
      }
    },
    reset() {
      controller?.abort()
      this.$reset()
    },
  },
})
