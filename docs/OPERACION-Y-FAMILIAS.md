# Configuración operativa e incorporación de familias

Tercera entrega del Sprint 3. Consume los contratos actuales del backend por el Gateway; no modifica el backend, Google Docs ni la aplicación móvil.

## Recorrido desde una operación nueva

1. ADMIN abre **Conductores y vehículos**. Crea la cuenta DRIVER y completa su perfil Roster. Si falla el perfil, conserva la cuenta y retoma desde **Cuentas pendientes de perfil**; no vuelve a crearla. Verifica la licencia. Puede suspender/reactivar al conductor y habilitar/deshabilitar vehículos o cambiar su capacidad (1–60, sujeto a reglas del servidor).
2. En **Rutas escolares**, crea nombre, sentido, horario y días. Abre **Editar paradas y mapa**, agrega al menos una parada y confirma su punto real. Puede editar, eliminar paradas vacías, cambiar el orden y colocar alumnos de su padrón en las paradas. La asignación manual al plan no crea una inscripción ni verifica tutela.
3. Asigna conductor verificado y vehículo habilitado y activa la ruta. Si hay conflicto de horario, cuota, aforo o licencia, se presenta el error del backend y se conservan los datos del formulario. Se puede reactivar una ruta inactiva; el editor permite desactivar, liberar recursos y renovar el código con confirmación.
4. Para el trazado vial se requieren al menos dos paradas y una clave ORS configurada **en el backend**. El botón calcula y guarda GeoJSON, distancia y duración estimadas. Cambiar paradas invalida la geometría. La web muestra los puntos y el estado sin cálculo; no une puntos fingiendo un itinerario vial. La caída/cuota de ORS se presenta como error explícito.
5. ADMIN abre **Familias y alumnos**. Crea la cuenta PARENT y registra su contacto en la operación, o usa el identificador de una cuenta existente. Puede registrar al alumno y su recojo. La cuenta y el contacto son dos solicitudes distintas; se conserva únicamente el ID pendiente en sessionStorage, limitado a cuenta/operación, para retomar tras recarga. No se guardan contraseñas ni datos del alumno en ese recordatorio; se borra al completar o cerrar sesión.
6. PARENT abre **Mis estudiantes**: ve también los alumnos que registró ADMIN para su cuenta. Completa su perfil de contacto antes de inscribir, consulta el código y confirma la oferta vigente. Cambiar el código descarta la oferta anterior. El servidor vuelve a comprobar cupos y permisos. La inscripción puede generar su parada; la propagación al plan/agenda se advierte como eventual.
7. ADMIN revisa **Verificación de vínculos**, verifica con referencia o revoca con motivo. Inscribir no concede seguimiento. Puede consultar inscripciones activas/finalizadas y cancelar el servicio por separado. PARENT ve el estado de sus vínculos sin notas administrativas. Los vínculos anteriores migrados PENDING requieren esta revisión.

## Recojo, fotos y límites del contrato

- El mapa es Leaflet 1.9.4 con base OpenStreetMap y atribución visible. La vista inicial de Lima no selecciona ni guarda una ubicación. Ante GPS denegado no se inventa un punto; puede elegirse con clic, coordenadas o GPS real, y debe confirmarse junto con la dirección. Cambiar coordenadas/dirección invalida la confirmación. Las coordenadas siguen disponibles si falla el mapa base.
- PARENT puede cambiar el recojo y subir/reemplazar/eliminar foto JPEG/PNG/WebP de hasta 1 MB. La carga usa multipart con campo `photo`. Las descargas usan el cliente autenticado y un Blob local; nunca se adjunta el JWT a una URL devuelta por el servidor. Las URL Blob y solicitudes se liberan al cambiar/desmontar la vista. El servidor valida contenido y autorización.
- ADMIN solo consulta la foto cuando el backend lo permite. No se le atribuyeron endpoints de edición o inscripción PARENT. La inscripción se confirma desde la cuenta del tutor.
- Para cuentas PARENT existentes aún no asociadas no hay búsqueda global por correo: el contrato requiere su ID. El registro administrativo del contacto es idempotente; si ya existe conserva sus datos y no actúa como actualización. Los formularios lo aclaran. Ampliar ese flujo requiere acordar otro contrato, no consultar cuentas ajenas desde la web.
- El seguimiento en vivo, reconexión SignalR y atención SOS pertenecen a la entrega 4; avisos/push y los demás criterios reservados para Sprint 4 no se declaran terminados aquí.

## Código y contratos

- `modules/admin/services/administrationService.js`: rutas/paradas y `/stakeholders/administration/*`, `/stakeholders/enrollments`.
- `modules/admin/services/adminService.js`: IAM `/users/drivers`, Roster y asignación/publicación de rutas.
- `modules/parent/services/parentService.js`: `/stakeholders/me/*`, ofertas y revisión propia.
- `shared/components`: RouteMap, PickupLocationFields, StudentFields, PrivateStudentPhoto y AppFormDialog. Reutilizan Archivo/Archivo Expanded, navy, amarillo y los estados del tema móvil.
- Contratos fuente del backend: `E:\rutasegura-backend\docs\SPRINT3-CONTRATOS-AUTORIZACION.md`. El tenant ADMIN se obtiene del JWT; la web no lo elige en el cuerpo.

## Verificación y aceptación pendiente

`npm run build`; `npm test` ejecuta acceso/sesión y operaciones. Se puede separar con `npm run test:auth` y `npm run test:operations`. Si no está instalado Chromium de Playwright, ejecutar `npx playwright install chromium` o establecer `PLAYWRIGHT_CHROMIUM_EXECUTABLE` a un navegador compatible instalado. En esta máquina se utilizó Chrome local.

**Resultado local: build correcto y 32 pruebas de navegador superadas (15 acceso/sesión y 17 operativas); se repitieron las comprobaciones visuales y de confirmación tras los ajustes finales.**

Las pruebas usan respuestas HTTP controladas, sin cuentas reales ni escrituras en AWS. Cubren altas parciales, revisión/revocación, cancelación separada, ruta desde cero, errores ORS/horarios/cupos, mapa, GPS denegado, fotos autenticadas/multipart, recuperación de IDs y limpieza al logout. Incluyen anchos 320/390/1440, foco y tokens visuales; las capturas se guardan en `test-results`.

Para aceptar el recorrido real: desplegar antes los contratos/migración de la entrega 2, configurar la clave ORS, abrir la web por Gateway y completar conductor/flota/ruta/familia con cuentas del entorno. Comprobar agenda en la app existente y autorización entre operaciones. Ni los fixtures ni el build acreditan ese recorrido; los pendientes de despliegue y ensayo conjunto siguen en el Markdown compartido.
