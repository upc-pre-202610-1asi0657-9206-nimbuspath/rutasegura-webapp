import { defineStore } from 'pinia'
import { apiError } from '@/shared/utils/forms'
import { countUnread, sortByNewest, validateAnnouncement } from '../domain/notification'
import { loadNotificationScope, notificationScopeKey } from '../infrastructure/notificationScope'
import {
  fetchFailedDeliveries,
  fetchNotification,
  fetchNotificationPage,
  fetchNotifications,
  fetchUnreadSummary,
  markNotificationRead,
  replayDelivery,
  sendAnnouncement,
} from '../infrastructure/notificationRepository'

let controller = null
let summaryController = null
let generation = 0
const requestKey = () => `${generation}:${notificationScopeKey()}`

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    items: [],
    summaryItems: [],
    summaryLoading: false,
    summaryLoaded: false,
    summaryError: '',
    summaryReloadRequested: false,
    authorizedUnreadCount: null,
    unreadHasMore: false,
    paginated: false,
    inboxOpen: false,
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
    unreadCount: (state) => state.authorizedUnreadCount ?? countUnread([...new Map([...state.items, ...state.summaryItems].map(item => [item.id, item])).values()]),
    isMarking: (state) => (id) => state.markingIds.includes(id),
  },
  actions: {
    accept(notification) {
      if (!notification?.id) return
      this.items = sortByNewest([notification, ...this.items.filter(item => item.id !== notification.id)])
      this.summaryItems = sortByNewest([notification, ...this.summaryItems.filter(item => item.id !== notification.id)]).slice(0, 25)
    },
    async open(id) {
      const key = requestKey()
      try { const notice = await fetchNotification(id); if (key === requestKey()) this.accept(notice) }
      catch (error) { if (key === requestKey() && error?.code !== 'ERR_CANCELED') this.error = apiError(error, 'No tienes acceso a este aviso o ya no está disponible.') }
    },
    async load() {
      if (this.summaryLoading) { this.summaryReloadRequested = true; return }
      const request = (summaryController = new AbortController())
      let key = requestKey()
      this.summaryLoading = true
      this.summaryError = ''
      try {
        await loadNotificationScope()
        key = requestKey()
        const [items, unread] = await Promise.all([
          fetchNotifications(undefined, request.signal), fetchUnreadSummary(request.signal),
        ])
        if (request.signal.aborted || key !== requestKey()) return
        this.summaryItems = sortByNewest(items)
        this.authorizedUnreadCount = unread.count
        this.unreadHasMore = unread.hasMore
        if (!this.paginated) this.items = this.summaryItems
        this.summaryLoaded = true
      } catch (error) {
        if (error?.code === 'ERR_CANCELED' || key !== requestKey()) return
        this.summaryError = apiError(error, 'No fue posible cargar las notificaciones.')
        this.summaryItems = []
        this.authorizedUnreadCount = null
      } finally {
        if (summaryController === request) {
          this.summaryLoading = false
          if (this.summaryReloadRequested && key === requestKey()) {
            this.summaryReloadRequested = false
            void this.load()
          }
        }
      }
    },
    async loadPage(params) {
      this.paginated = true
      controller?.abort()
      const request = (controller = new AbortController())
      let key = requestKey()
      this.loading = true
      this.error = ''
      try {
        await loadNotificationScope()
        key = requestKey()
        const page = await fetchNotificationPage(params, request.signal)
        if (request.signal.aborted || key !== requestKey()) return
        this.items = sortByNewest(page.items)
        this.pageMeta = { nextCursor: page.nextCursor, hasMore: page.hasMore }
        this.loaded = true
      } catch (error) {
        if (error?.code === 'ERR_CANCELED' || key !== requestKey()) return
        this.error = apiError(error, 'No fue posible cargar las notificaciones.')
        this.items = []
        this.pageMeta = {}
      } finally {
        if (controller === request) this.loading = false
      }
    },
    async loadMore() {
      if (this.loading || !this.pageMeta.hasMore || !this.pageMeta.nextCursor) return
      this.loading = true
      this.error = ''
      const key = requestKey()
      try {
        const page = await fetchNotificationPage({ cursor: this.pageMeta.nextCursor })
        if (key !== requestKey()) return
        const known = new Set(this.items.map((item) => item.id))
        this.items = sortByNewest([...this.items, ...page.items.filter((i) => !known.has(i.id))])
        this.pageMeta = { nextCursor: page.nextCursor, hasMore: page.hasMore }
      } catch (error) {
        if (key !== requestKey() || error?.code === 'ERR_CANCELED') return
        this.error = apiError(error, 'No fue posible cargar más notificaciones.')
      } finally {
        if (key === requestKey()) this.loading = false
      }
    },
    async markAsRead(id) {
      if (this.markingIds.includes(id)) return
      this.markingIds.push(id)
      this.error = ''
      const key = requestKey()
      try {
        const updated = await markNotificationRead(id)
        if (key !== requestKey()) return
        const item = this.items.find((entry) => entry.id === id)
        if (item) {
          item.read = true
          item.readAt = updated?.readAt ?? item.readAt
        }
        const summary = this.summaryItems.find(entry => entry.id === id)
        if (summary) { summary.read = true; summary.readAt = updated?.readAt ?? summary.readAt }
        void this.load()
      } catch (error) {
        if (key !== requestKey() || error?.code === 'ERR_CANCELED') return
        this.error = apiError(error, 'No fue posible marcar la notificación como leída.')
      } finally {
        if (key === requestKey()) this.markingIds = this.markingIds.filter((entry) => entry !== id)
      }
    },
    async publishAnnouncement(form) {
      const { valid, payload } = validateAnnouncement(form)
      if (!valid || this.sending) return false
      this.sending = true
      this.announcementError = ''
      this.announcementNotice = ''
      try {
        const result = await sendAnnouncement(payload)
        this.announcementNotice = Number.isFinite(result?.notificationsCreated)
          ? `Comunicado enviado. Notificaciones creadas: ${result.notificationsCreated}.`
          : 'Comunicado enviado.'
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
      const inboxOpen = this.inboxOpen
      generation++
      controller?.abort()
      summaryController?.abort()
      controller = null
      summaryController = null
      this.$reset()
      this.inboxOpen = inboxOpen
      this.paginated = inboxOpen
    },
  },
})
