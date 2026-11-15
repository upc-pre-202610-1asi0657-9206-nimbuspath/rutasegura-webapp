# Seguimiento en vivo y atención de SOS — entrega 4

## Uso

- PARENT abre **Seguimiento en vivo** (`/parent/tracking`), selecciona fecha de servicio en Lima, hijo y viaje autorizado. La lista usa `/guardians/me/trips`; los nombres proceden de sus propios alumnos. Una inscripción sin verificación no concede acceso.
- Durante `InProgress` o `Delayed` (ambos son viajes activos), muestra GPS real, fecha/antigüedad y la parada/ETA autorizada del hijo seleccionado. Azul representa el vehículo y amarillo las paradas. Sin posición no inventa movimiento. Más de 60 segundos se presenta como ubicación antigua y se oculta el ETA; este umbral es una indicación de interfaz, no una medición del SLA. El ETA es orientativo, no ORS con tráfico.
- ADMIN abre **Monitoreo de viajes**, elige la fecha y entra al detalle. Ve asistencia, mapa, incidencias de Tracking y alertas abiertas de Administration. Ante un SOS contacta/atiende al conductor y confirma **Atender y cerrar SOS**. Se envía `POST /trips/{id}/sos/resolve` sin cuerpo; se vuelve a consultar el estado. No finaliza el viaje ni cierra una alerta administrativa en lugar del SOS.
- Cuando el viaje termina o se cancela se retira el mapa y se detiene el canal. Cambiar hijo/viaje, navegar, ocultar la pestaña, cerrar sesión o perder acceso limpia las suscripciones/datos; al volver a la pestaña se recupera el estado por REST.

## Arquitectura y contratos

`modules/tracking/services` concentra HTTP y la creación de SignalR. `useLiveTrip` administra conexión, temporizadores, cancelación y versiones de solicitudes. `LiveTripPanel` comparte presentación para ADMIN/PARENT, pero solo ADMIN solicita resumen e incidencias. El servidor sigue autorizando cada operación; los filtros web refuerzan la presentación, no conceden acceso.

- Hub: `/hubs/trip-tracking`, `accessTokenFactory` desde la sesión actual, métodos `SubscribeToTrip(tripId)` / `UnsubscribeFromTrip(tripId)`, eventos `PositionUpdated` / `TripStatusChanged`.
- Los eventos invalidan la vista: se consulta el DTO autorizado `/trips/{id}/live` y la posición rápida `/trips/{id}/position`. No se incorpora un payload crudo a la pantalla, ni se recuperan domicilios/itinerarios administrativos desde la cuenta del padre.
- Recuperación REST cada 5 segundos para el detalle: cubre asistencia/SOS, que el hub no publica individualmente, y degradación del canal. Lista PARENT cada 15 segundos y listado ADMIN cada 10. Una solicitud en curso no se solapa con otra del mismo detalle; se agrupan avisos próximos y se descartan eventos viejos/ajenos y respuestas de selecciones anteriores.
- Reconexión SignalR con reintentos automáticos, nueva suscripción y recuperación REST; el fallo del arranque inicial también se reintenta. La pérdida del canal limpia datos y comprueba autorización antes de volver a mostrarlos. Un 401/403/404 corta el detalle; ante 5xx/directorio no disponible se retira la información privada y se permite recuperar por REST.
- `GET /trips/{id}/summary` (solo personal) aporta incidencias, incluso antes de completar; `GET /operations/alerts?onlyOpen=true` pertenece al monolito y se filtra por el viaje. Una fuente caída se informa explícitamente. La proyección administrativa puede retrasarse respecto al estado de Tracking.

El origen/prefijo del hub deriva de `VITE_API_BASE_URL`; con el proxy local se usa el mismo Gateway que REST. Solo si el alojamiento separa hubs, configurar `VITE_TRACKING_HUB_URL`. Producción requiere HTTPS, WebSocket/CORS y proxy apropiados; nunca colocar tokens internos, claves de firma ni credenciales Firebase en variables Vite. SignalR se configura sin logs para no exponer URLs con tokens. Referencia: [cliente JavaScript de SignalR](https://learn.microsoft.com/en-us/aspnet/core/signalr/javascript-client?view=aspnetcore-10.0).

## Validación y pendiente real

**Resultado local: build correcto y 48 pruebas de navegador superadas, incluidas 16 de seguimiento/SOS.**

`npm run build`, `npm test` o solo `npm run test:tracking`. Las pruebas de navegador usan HTTP controlado y un servidor WebSocket simulado con el protocolo JSON real de SignalR: negociación, handshake, invocaciones y eventos. No sustituyen RabbitMQ/Redis ni un viaje en la app del conductor.

Se comprobó además, sin crear datos de negocio, readiness 200 de Gateway y Tracking locales y autenticación/consulta de viajes de las cuentas demo ADMIN/PARENT. Ambas listas del día estaban vacías. Falta el recorrido activo real: preparar cuenta/perfil/flota/ruta/familia desde la entrega 3, verificar vínculo, programar el viaje, operar inicio/GPS/abordaje/SOS desde la app existente, comprobar ambas vistas, cerrar SOS y finalizar. Repetir con retorno, revocación y aislamiento entre empresas, y medir latencia real. No declarar ese ensayo ni el SLA superados por las pruebas simuladas.

Observación backend para la entrega 5: el sink SignalR actual filtra GPS con `Status == InProgress`, aunque el dominio y los endpoints REST también autorizan `Delayed`. La web contempla ambos y mantiene actualizaciones por REST; falta corregir/verificar la emisión del backend para viajes retrasados antes de medir latencia del canal. No se modificó ese backend como parte de esta entrega web.
