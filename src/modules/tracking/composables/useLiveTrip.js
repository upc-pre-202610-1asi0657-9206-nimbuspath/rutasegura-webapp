import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  onAuthSessionChange,
  readAuthToken,
} from '@/shared/api/authSessionStorage'
import { apiError, validPoint } from '@/shared/utils/forms'
import {
  tripLive,
  tripPosition,
  isActiveTrip,
} from '../services/trackingService'
import { createTripConnection } from '../services/tripConnection'
const terminal = (status) => status === 'Completed' || status === 'Cancelled'
export function useLiveTrip(tripId) {
  const receivedAt = ref(Date.now())
  const live = ref(null),
    position = ref(null),
    loading = ref(false),
    error = ref(''),
    channel = ref('Sin conexión'),
    now = ref(Date.now()),
    denied = ref(false)
  let generation = 0,
    controller,
    connection,
    poll,
    retry,
    eventTimer,
    clock,
    inFlight = false,
    queued = false,
    disposed = false,
    lastEvent = 0
  const age = computed(() => {
    const value = position.value
    if (!value || !Number.isFinite(Date.parse(value.recordedAt))) return null
    return Math.max(
      0,
      Math.floor((now.value - Date.parse(value.recordedAt)) / 1000),
      (Number(value.ageSeconds) || 0) +
        Math.max(0, Math.floor((now.value - receivedAt.value) / 1000)),
    )
  })
  const stale = computed(() => age.value != null && age.value > 60)
  function stopConnection() {
    clearTimeout(retry)
    retry = null
    const old = connection
    connection = null
    if (old) {
      old.off('PositionUpdated')
      old.off('TripStatusChanged')
      if (old.state === 'Connected')
        void old.invoke('UnsubscribeFromTrip', tripId.value).catch(() => {})
      void old.stop().catch(() => {})
    }
  }
  function teardown(clear = true) {
    ++generation
    controller?.abort()
    clearInterval(poll)
    clearTimeout(eventTimer)
    eventTimer = null
    clearInterval(clock)
    stopConnection()
    inFlight = false
    queued = false
    loading.value = false
    if (clear) {
      live.value = null
      position.value = null
    }
  }
  async function refresh() {
    if (
      disposed ||
      !tripId.value ||
      denied.value ||
      document.hidden ||
      !readAuthToken()
    )
      return
    if (inFlight) {
      queued = true
      return
    }
    inFlight = true
    const version = generation,
      id = tripId.value
    const request = new AbortController()
    controller = request
    loading.value = !live.value
    error.value = ''
    try {
      const snapshot = await tripLive(id, request.signal)
      if (version !== generation || id !== tripId.value) return
      let currentPosition = null
      if (isActiveTrip(snapshot.status)) {
        const fast = await tripPosition(id, request.signal)
        if (version !== generation || id !== tripId.value) return
        if (fast.tripId !== id || fast.status !== snapshot.status) {
          live.value = null
          position.value = null
          queued = true
          return
        }
        currentPosition = fast.position
        if (
          currentPosition &&
          (!validPoint(currentPosition.latitude, currentPosition.longitude) ||
            !Number.isFinite(Date.parse(currentPosition.recordedAt)))
        )
          currentPosition = null
        if (snapshot.nextStop?.stopId === fast.nextStopId)
          snapshot.nextStop = {
            ...snapshot.nextStop,
            distanceMeters: fast.nextStopDistanceMeters,
            etaMinutes: fast.nextStopEtaMinutes,
          }
      }
      if (version !== generation || id !== tripId.value) return
      if (snapshot.tripId !== id)
        throw new Error('El servidor devolvió otro viaje.')
      live.value = snapshot
      position.value = currentPosition
      now.value = Date.now()
      receivedAt.value = now.value
      if (terminal(snapshot.status)) {
        stopConnection()
        clearInterval(poll)
        channel.value = 'Viaje finalizado'
        position.value = null
      }
    } catch (e) {
      if (version !== generation || e.code === 'ERR_CANCELED') return
      // Clear private data on any failed authority read, including directory outages.
      live.value = null
      position.value = null
      error.value = apiError(e, 'No fue posible comprobar el acceso al viaje.')
      if ([401, 403, 404].includes(e.response?.status)) {
        denied.value = true
        teardown()
        channel.value = 'Acceso no disponible'
      }
    } finally {
      if (version === generation) {
        inFlight = false
        loading.value = false
        if (queued) {
          queued = false
          clearTimeout(eventTimer)
          eventTimer = setTimeout(() => {
            eventTimer = null
            void refresh()
          }, 1000)
        }
      }
    }
  }
  function requestRefresh(update) {
    if (update?.tripId !== tripId.value || denied.value) return
    const timestamp = Date.parse(update.recordedAt || update.occurredAt)
    if (Number.isFinite(timestamp) && timestamp < lastEvent) return
    if (Number.isFinite(timestamp)) lastEvent = timestamp
    // Events are invalidation signals. Read authoritative scoped DTOs; never merge raw payloads into private state.
    if (!eventTimer)
      eventTimer = setTimeout(() => {
        eventTimer = null
        void refresh()
      }, 250)
  }
  async function connect() {
    if (
      connection ||
      disposed ||
      document.hidden ||
      denied.value ||
      terminal(live.value?.status) ||
      !tripId.value ||
      !readAuthToken()
    )
      return
    const version = generation,
      id = tripId.value,
      hub = createTripConnection()
    connection = hub
    const current = () =>
      version === generation && connection === hub && !disposed
    const subscribe = async () => {
      if (!current()) return
      try {
        await hub.invoke('SubscribeToTrip', id)
        if (current()) {
          channel.value = 'En vivo'
          void refresh()
        }
      } catch {
        if (current()) {
          channel.value = 'Consulta periódica activa; canal pendiente'
          void refresh()
          stopConnection()
          retry = setTimeout(connect, 5000)
        }
      }
    }
    hub.on('PositionUpdated', requestRefresh)
    hub.on('TripStatusChanged', requestRefresh)
    hub.onreconnecting(() => {
      if (current()) {
        channel.value = 'Reconectando; consulta periódica activa'
        live.value = null
        position.value = null
        void refresh()
      }
    })
    hub.onreconnected(subscribe)
    hub.onclose(() => {
      if (current()) {
        connection = null
        channel.value = 'Consulta periódica activa'
        live.value = null
        position.value = null
        void refresh()
        retry = setTimeout(connect, 5000)
      }
    })
    try {
      await hub.start()
      if (current()) await subscribe()
      else await hub.stop()
    } catch {
      if (current()) {
        connection = null
        channel.value = 'Consulta periódica activa'
        retry = setTimeout(connect, 5000)
      }
    }
  }
  function start() {
    teardown()
    denied.value = false
    error.value = ''
    lastEvent = 0
    loading.value = false
    if (!tripId.value || disposed || document.hidden || !readAuthToken()) return
    channel.value = 'Conectando; consulta periódica activa'
    void refresh()
    void connect()
    poll = setInterval(() => {
      void refresh()
      if (!connection) void connect()
    }, 5000)
    clock = setInterval(() => {
      now.value = Date.now()
    }, 1000)
  }
  const unwatch = watch(tripId, start, { immediate: true })
  const visibility = () => {
    if (document.hidden) teardown()
    else start()
  }
  document.addEventListener('visibilitychange', visibility)
  const unsubscribe = onAuthSessionChange(() => {
    teardown()
    channel.value = 'Sesión cerrada'
  })
  onBeforeUnmount(() => {
    disposed = true
    teardown()
    unwatch()
    unsubscribe()
    document.removeEventListener('visibilitychange', visibility)
  })
  return {
    live,
    position,
    loading,
    error,
    channel,
    age,
    stale,
    denied,
    refresh,
  }
}
