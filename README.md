# RutaSegura Web

Web de administradores y familias construida con Vue, Pinia, Vue Router, Axios, PrimeVue y Tailwind. Los conductores ingresan desde la aplicación móvil.

## Desarrollo

Usar Node compatible con Vite 8 (20.19+ o 22.12+).

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

El cliente consume `VITE_API_BASE_URL` (por defecto `/api/v1`). Vite reenvía `/api` y `/hubs` al Gateway configurado en `VITE_API_PROXY_TARGET` (por defecto `http://localhost:8000`). Para desarrollar contra AWS, cambiar ese destino al Gateway compartido. Apuntar todos los endpoints al monolito no funciona: los viajes pertenecen a Trip & Tracking. El proxy de Vite solo existe en desarrollo; el alojamiento productivo debe configurar REST/WebSocket, HTTPS, CORS y la reescritura de rutas de la SPA.

No se incluyen cuentas ni contraseñas. Utilizar las cuentas del entorno proporcionadas por el equipo. El registro público solo crea PARENT; ADMIN y DRIVER se provisionan por los contratos autorizados del backend.

## Acceso y sesión

- ADMIN abre `/admin/routes`; PARENT abre `/parent`. Los guards bloquean las vistas del otro rol. Tras login se conserva un destino protegido solicitado únicamente si corresponde al rol.
- IAM autentica y valida la cuenta. Decodificar `exp` solo permite anticipar la expiración local; no valida firma ni concede permisos.
- La sesión se conserva en `sessionStorage` y se comprueba con `/users/me` al recargar. El servidor sigue siendo responsable de autorizar cada operación.
- Al expirar el token o recibir 401 autenticado se borra la sesión y se abandona la vista protegida. Un 403 de recurso informa falta de permisos sin tratarlo como expiración. Una denegación al verificar `/users/me` sí impide restaurar la cuenta.
- Si IAM no está disponible al recargar, no se abre la vista protegida: se conserva la credencial para el botón Reintentar conexión. Los errores de red/5xx no se presentan como contraseña incorrecta.
- Logout cancela solicitudes de la cuenta anterior y desmonta las vistas. Una respuesta tardía no debe recuperar datos ni cerrar la sesión de otra cuenta. No registrar objetos Axios completos: pueden contener el header Authorization.
- No hay renovación ficticia: refresh tokens siguen pendientes del contrato real de IAM. Los guards del navegador no reemplazan la autorización ni la revocación del servidor.

`main.js` configura el ciclo de sesión. `apiClient.js` no depende del router ni de Pinia; el composition root conecta los handlers. La futura conexión SignalR debe desconectarse al cambiar/cerrar sesión y volver a validar las suscripciones.

## Identidad visual

`src/styles/main.css` contiene los tokens tomados de `lib/core/theme` de la app móvil: navy `#15243B`, amarillo `#F2B705`, fondo `#F3F3EF`, superficies, texto y estados. Archivo y Archivo Expanded se sirven localmente desde `public/fonts` con su licencia OFL. `primePreset.js` alinea PrimeVue con la misma paleta. Se conserva la estructura de las pantallas existentes.

`AppFeedback` ofrece avisos de carga, error, éxito y vacío con reintento opcional. `AppConfirmDialog` usa diálogo modal nativo, foco inicial en Cancelar, navegación de teclado y retorno de foco. Los menús móviles cierran con Escape y contienen el foco mientras están abiertos.

## Verificación

```powershell
npm run build
npx playwright install chromium --only-shell
npm run test:auth
```

La suite de Chromium arranca Vite en `127.0.0.1:4173` y usa respuestas HTTP controladas; no crea datos en AWS. Verifica acceso ADMIN/PARENT, rechazo DRIVER, restauración, expiración, 401/403, caída de IAM, logout, respuestas tardías, fuentes y accesibilidad básica. Si ya existe un Chromium compatible, se puede indicar su ejecutable con `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

Estas pruebas verifican el cliente de acceso y sesión. Para operaciones y familias, ver la entrega siguiente. No acreditan la integración real con Gateway, autorización entre empresas, vínculos tutor–alumno o el recorrido conjunto con la app. Los pendientes se mantienen en el registro compartido del Sprint 3; el backend y la app móvil no se modifican en esta entrega.

## Configuración operativa y familias (entrega 3)

ADMIN dispone de cuentas/perfiles de conductor, controles de flota, editor de paradas/mapa/itinerario, incorporación de tutores/alumnos y revisión de vínculos e inscripciones. PARENT dispone de recojo confirmado, foto privada y oferta/inscripción con perfil completo. Se conserva la identidad visual móvil.

Recorrido, contratos, límites y aceptación pendiente: [Operación y familias](docs/OPERACION-Y-FAMILIAS.md).

```powershell
npm run build
npm test
# Suites por separado:
npm run test:auth
npm run test:operations
# Alternativa si Chromium de Playwright no está instalado:
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm test
```

Las pruebas HTTP controladas no sustituyen el ensayo con Gateway/backend desplegado, MySQL/RabbitMQ, ORS real y la agenda móvil. No se modificó el backend ni se aplicaron migraciones como parte de esta entrega web.

## Seguimiento y SOS (entrega 4)

PARENT dispone de `/parent/tracking` con selección de hijo/viaje, mapa y asistencia autorizados. El detalle ADMIN de viajes se actualiza con SignalR/REST y permite atender/cerrar SOS. Se limpian datos y canales al finalizar o perder acceso.

[Uso, contratos y validación pendiente](docs/SEGUIMIENTO-Y-SOS.md). Pruebas específicas: `npm run test:tracking`. El recorrido real con app/Gateway y la medición de latencia siguen siendo una puerta de cierre de integración.
