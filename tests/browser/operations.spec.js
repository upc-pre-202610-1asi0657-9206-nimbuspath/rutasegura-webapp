import { test, expect } from "@playwright/test";
// Isolated HTTP fixtures: no cloud writes or real family data.
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const org = id(1),
  userId = id(2),
  studentId = id(3),
  routeId = id(4),
  guardianId = id(5);
const parentStudent = () => ({
  id: studentId,
  firstName: "Ana",
  lastName: "Prueba",
  fullName: "Ana Prueba",
  status: "ACTIVE",
  pickupLocation: {
    address: "Casa de prueba",
    latitude: -12.1,
    longitude: -77.03,
  },
  enrollments: [],
});
async function fixture(page, role = "ADMIN", settings = {}) {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString("base64url");
  const user = {
    id: role === "ADMIN" ? userId : guardianId,
    firstName: "Cuenta",
    lastName: "Prueba",
    roleTier: role,
    organizationId: role === "ADMIN" ? org : null,
    token: `test.${payload}.fixture`,
  };
  const state = {
    calls: [],
    users: [],
    drivers: [],
    vehicles: [],
    routes: [],
    students: [parentStudent()],
    roster: [],
    guardians: [],
    links: [],
    enrollments: [],
    profile: { isComplete: true, phoneNumber: "999999999" },
    ...settings,
  };
  await page.addInitScript(
    (user) =>
      sessionStorage.setItem(
        "rutasegura.auth.session",
        JSON.stringify({ user, token: user.token }),
      ),
    user,
  );
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.abort(),
  );
  await page.route("**/api/v1/**", async (request) => {
    const req = request.request(),
      url = new URL(req.url()),
      path = url.pathname.replace("/api/v1", ""),
      method = req.method();
    let body;
    try {
      body = req.postDataJSON();
    } catch {
      body = req.postData();
    }
    state.calls.push({ path, method, body, headers: req.headers() });
    const ok = (json, status = 200) => request.fulfill({ status, json });
    const fail = (detail, status = 422) => ok({ detail }, status);
    if (path === "/users/me") return ok(user);
    if (path === "/users") return ok(state.users);
    if (path === "/users/drivers" || path === "/users/parents") {
      const created = {
        id: path.endsWith("drivers") ? id(10) : guardianId,
        ...body,
        roleTier: path.endsWith("drivers") ? "DRIVER" : "PARENT",
      };
      delete created.password;
      state.users.push(created);
      return ok(created, 201);
    }
    if (path === "/roster/drivers" && method === "GET")
      return ok(state.drivers);
    if (path === "/roster/drivers" && method === "POST") {
      if (state.failProfile) {
        state.failProfile = false;
        return fail("Perfil no disponible temporalmente.", 503);
      }
      const created = { ...body, id: id(11), status: "PENDING_VERIFICATION" };
      state.drivers.push(created);
      return ok(created, 201);
    }
    if (/^\/roster\/drivers\/.+\/(verify|suspend|reinstate)$/.test(path)) {
      state.drivers[0].status = path.endsWith("suspend")
        ? "SUSPENDED"
        : "VERIFIED";
      return ok(state.drivers[0]);
    }
    if (path === "/roster/vehicles" && method === "GET")
      return ok(state.vehicles);
    if (path === "/roster/vehicles" && method === "POST") {
      const value = { ...body, id: id(12), status: "ENABLED" };
      state.vehicles.push(value);
      return ok(value, 201);
    }
    if (/^\/roster\/vehicles\/.+\/(enable|disable|capacity)$/.test(path)) {
      if (path.endsWith("capacity"))
        state.vehicles[0].seatingCapacity = body.seatingCapacity;
      else
        state.vehicles[0].status = path.endsWith("/disable")
          ? "DISABLED"
          : "ENABLED";
      return ok(state.vehicles[0]);
    }
    if (path === "/routes/quota")
      return ok({ activeRoutes: 0, maxActiveRoutes: 3 });
    if (path === "/routes" && method === "GET") return ok(state.routes);
    if (path === "/routes" && method === "POST") {
      const value = {
        id: routeId,
        ...body,
        schedule: body,
        stops: body.destination
          ? [{ ...body.destination, id: id(21), sequence: 1, studentIds: [], origin: "DESTINATION" }]
          : [],
        status: "DRAFT",
        studentCount: 0,
      };
      state.routes.push(value);
      return ok(value, 201);
    }
    const current = state.routes[0];
    if (path === `/routes/${routeId}` && method === "GET") return ok(current);
    if (path === `/routes/${routeId}/trip-records` && method === "GET") return ok([]);
    if (path === `/stakeholders/routes/${routeId}/students`)
      return ok(state.enrollments);
    if (path === `/routes/${routeId}/stops` && method === "POST") {
      current.stops.push({
        ...body,
        id: id(20 + current.stops.length),
        sequence: current.stops.length + 1,
        studentIds: [],
      });
      current.itinerary = null;
      return ok(current);
    }
    if (path === `/routes/${routeId}/stops/order`) {
      current.stops = body.stopIds.map((sid, index) => ({
        ...current.stops.find((s) => s.id === sid),
        sequence: index + 1,
      }));
      current.itinerary = null;
      return ok(current);
    }
    if (/^\/routes\/.+\/stops\/[^/]+$/.test(path) && method === "PUT") {
      Object.assign(
        current.stops.find((s) => path.endsWith(s.id)),
        body,
      );
      current.itinerary = null;
      return ok(current);
    }
    if (/^\/routes\/.+\/stops\/[^/]+$/.test(path) && method === "DELETE") {
      current.stops = current.stops.filter((s) => !path.endsWith(s.id));
      current.itinerary = null;
      return ok(current);
    }
    if (path.includes("/stops/") && path.includes("/students/")) {
      const parts = path.split("/");
      for (const s of current.stops)
        s.studentIds = s.studentIds.filter((i) => i !== parts.at(-1));
      current.stops
        .find((s) => s.id === parts[4])
        .studentIds.push(parts.at(-1));
      return ok(current);
    }
    if (path === `/routes/${routeId}/itinerary`) {
      if (state.failMaps) return fail("Proveedor de mapas no disponible.", 503);
      current.itinerary = {
        geometry: {
          type: "LineString",
          coordinates: current.stops.map((s) => [s.longitude, s.latitude]),
        },
        distanceMeters: 2200,
        durationSeconds: 500,
        calculatedAt: "2026-11-15T12:00:00Z",
      };
      return ok(current.itinerary);
    }
    if (path === `/routes/${routeId}/assignment`) {
      if (state.conflict)
        return fail("Horario del conductor en conflicto.", 409);
      current.assignment = body;
      return ok(current);
    }
    if (path === `/routes/${routeId}/activate`) {
      if (!current.stops.length || !current.assignment)
        return fail("Agrega paradas y asigna recursos.");
      current.status = "ACTIVE";
      current.enrollmentCode = "TEST-2026";
      return ok(current);
    }
    if (path === "/stakeholders/me/profile") return ok(state.profile);
    if (path === "/stakeholders/me/guardian-links") return ok(state.links);
    if (path === "/stakeholders/me/students" && method === "GET")
      return ok(state.students);
    if (path === "/stakeholders/me/students" && method === "POST") {
      state.students.push({ ...parentStudent(), ...body });
      return ok(state.students.at(-1), 201);
    }
    if (path.endsWith("/pickup-location")) {
      state.students[0].pickupLocation = body;
      return ok(state.students[0]);
    }
    if (path === `/stakeholders/me/students/${studentId}/photo`) {
      if (method === "DELETE") state.students[0].photo = null;
      else
        state.students[0].photo = {
          version: "v2",
          url: "/api/v1/private-photo",
        };
      return ok(state.students[0]);
    }
    if (path === `/stakeholders/students/${studentId}/photo`)
      return request.fulfill({
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lL8AAAAASUVORK5CYII=",
          "base64",
        ),
      });
    if (path === "/stakeholders/route-offers") return ok(state.openRoutes || []);
    if (path.startsWith("/stakeholders/route-offers/"))
      return ok({
        routeId,
        routeName: "Ruta Sur",
        organizationName: "Operación de prueba",
        direction: "PICKUP",
        status: state.offerStatus || "ACTIVE",
        acceptsEnrollments: true,
        availableSeats: 3,
        departureTime: "06:30:00",
        estimatedArrivalTime: "07:30:00",
      });
    if (path === `/stakeholders/me/students/${studentId}/enrollments`) {
      if (state.noSeats) return fail("No quedan cupos en esta ruta.");
      return ok({ id: id(30) }, 201);
    }
    if (path === "/stakeholders/administration/guardians" && method === "GET")
      return ok(state.guardians);
    if (
      path === "/stakeholders/administration/guardians" &&
      method === "POST"
    ) {
      if (state.failContact) {
        state.failContact = false;
        return fail("No fue posible guardar el contacto.", 503);
      }
      const g = {
        userId: body.guardianUserId,
        fullName: "Tutor Prueba",
        ...body,
      };
      state.guardians.push(g);
      return ok(g);
    }
    if (path === "/stakeholders/administration/students" && method === "GET")
      return ok(state.roster);
    if (path === "/stakeholders/administration/students" && method === "POST") {
      state.roster.push({
        studentId,
        guardianUserId: body.guardianUserId,
        fullName: "Ana Prueba",
        status: "ACTIVE",
        ...body.student,
      });
      state.links.push({
        organizationId: org,
        guardianUserId: body.guardianUserId,
        studentId,
        status: "PENDING",
      });
      return ok({ studentId }, 201);
    }
    if (path === "/stakeholders/administration/guardian-links")
      return ok(state.links);
    if (path.includes("/guardian-links/")) {
      const link = state.links.find((l) => path.includes(l.studentId));
      link.status = path.endsWith("verify") ? "VERIFIED" : "REVOKED";
      link.reference = body.reference;
      return ok(link);
    }
    if (path === "/stakeholders/enrollments") return ok(state.enrollments);
    if (path.match(/\/enrollments\/.+\/cancel$/)) {
      state.enrollments[0].enrollmentStatus = "CANCELLED";
      return ok({});
    }
    if (path === "/guardians/me/trips") return ok([]);
    return fail("Unexpected fixture request: " + method + " " + path, 404);
  });
  return state;
}
async function location(page, address = "Casa confirmada", scope = page) {
  page = scope;
  await page.getByLabel("Dirección", { exact: true }).fill(address);
  await page.getByLabel("Latitud", { exact: true }).fill("-12.123456");
  await page.getByLabel("Longitud", { exact: true }).fill("-77.012345");
  await page.getByRole("checkbox", { name: /Confirmo que este punto/ }).check();
}
const readyRoute = () => ({
  id: routeId,
  name: "Ruta Sur",
  direction: "PICKUP",
  status: "DRAFT",
  schedule: {
    departureTime: "06:30:00",
    estimatedArrivalTime: "07:30:00",
    operatingDays: ["Monday"],
  },
  stops: [],
  studentCount: 0,
});

test("driver account survives profile failure; retry does not create another IAM account", async ({
  page,
}) => {
  const state = await fixture(page, "ADMIN", { failProfile: true });
  await page.goto("/admin/resources");
  await page
    .getByRole("button", { name: "Crear cuenta de conductor", exact: true })
    .click();
  await page.getByLabel("Nombres", { exact: true }).fill("Luis");
  await page.getByLabel("Apellidos", { exact: true }).fill("Prueba");
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill("driver@example.test");
  await page.getByLabel("Contraseña inicial").fill("Fixture123!");
  await page.getByRole("button", { name: "Crear cuenta y continuar" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Completar perfil del conductor",
  });
  await expect(dialog.getByLabel("Cuenta de conductor")).toHaveValue(id(10));
  await dialog.getByLabel("Documento", { exact: true }).fill("12345678");
  await dialog.getByLabel("Teléfono").fill("999999999");
  await dialog.getByLabel("Número de licencia").fill("Q12345678");
  await dialog.getByLabel("Vencimiento de licencia").fill("2028-12-31");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("temporalmente");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.calls.filter((c) => c.path === "/users/drivers").length).toBe(1);
  expect(
    state.calls
      .filter((c) => c.path === "/roster/drivers" && c.method === "POST")
      .at(-1).body.userId,
  ).toBe(id(10));
  await page
    .getByRole("button", { name: "Verificar conductor", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await expect(page.getByText("Verificado", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Suspender conductor", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await expect(page.getByText("Suspendido", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Reactivar conductor", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await expect(page.getByText("Verificado", { exact: true })).toBeVisible();
});

test("vehicle availability and capacity use independent authorized endpoints", async ({
  page,
}) => {
  const state = await fixture(page, "ADMIN", {
    vehicles: [
      {
        id: id(12),
        licensePlate: "ABC-123",
        brand: "Marca",
        model: "Modelo",
        seatingCapacity: 20,
        status: "ENABLED",
      },
    ],
  });
  await page.goto("/admin/resources");
  await page
    .getByRole("button", { name: "Deshabilitar vehículo", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await expect(page.getByText("Deshabilitado", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Habilitar vehículo", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await expect(page.getByText("Habilitado", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Cambiar capacidad", exact: true })
    .click();
  await page.getByLabel("Número de asientos").fill("15");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("15 asientos")).toBeVisible();
  expect(state.calls.find((c) => c.path.endsWith("/capacity")).body).toEqual({
    seatingCapacity: 15,
  });
});

test("route is created with driver, vehicle and destination; enrolled children appear on their own", async ({
  page,
}) => {
  const state = await fixture(page, "ADMIN", {
    drivers: [
      { id: id(11), firstName: "Luis", lastName: "Prueba", status: "VERIFIED" },
    ],
    vehicles: [
      {
        id: id(12),
        licensePlate: "ABC-123",
        status: "ENABLED",
        seatingCapacity: 20,
      },
    ],
  });
  await page.goto("/admin/routes");
  await page.getByRole("button", { name: "Nueva ruta", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre de la ruta").fill("Ruta nueva");
  await dialog.getByRole("button", { name: /Ida al colegio/ }).click();
  await dialog.getByLabel("Hora de salida").fill("06:30");
  await dialog.getByLabel("Llegada estimada").fill("07:30");
  await dialog.getByRole("button", { name: "Lun–Vie" }).click();
  await dialog.getByLabel("Conductor").selectOption(id(11));
  await dialog.getByLabel("Vehículo").selectOption(id(12));
  const create = dialog.getByRole("button", { name: "Crear ruta", exact: true });
  await dialog.getByLabel("Nombre del destino").fill("Colegio");
  await expect(create).toBeDisabled();
  await location(page, "Colegio dirección");
  await create.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    state.calls.find((c) => c.path === "/routes" && c.method === "POST").body
      .destination,
  ).toEqual({
    name: "Colegio",
    address: "Colegio dirección",
    latitude: -12.123456,
    longitude: -77.012345,
  });
  expect(
    state.calls.find((c) => c.path.endsWith("/assignment")).body,
  ).toEqual({ driverId: id(11), vehicleId: id(12) });

  // A family enrolls a child: the open page picks it up when it regains focus.
  state.enrollments.push({
    enrollmentId: id(30),
    routeId,
    studentId,
    fullName: "Ana Prueba",
    enrollmentStatus: "ACTIVE",
    stop: { name: "Casa" },
  });
  state.routes[0].stops.unshift({
    id: id(20),
    name: "Casa",
    sequence: 1,
    latitude: -12.1,
    longitude: -77.02,
    studentIds: [studentId],
    origin: "ENROLLMENT",
  });
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByRole("list", { name: "Alumnos de Ruta nueva" }),
  ).toContainText("Ana Prueba");

  await page
    .getByRole("button", { name: "Destino, alumnos e itinerario" })
    .click();
  await expect(
    page.getByRole("region", { name: "Alumnos inscritos" }),
  ).toContainText("Ana Prueba");
  await expect(page.getByRole("button", { name: "Subir Colegio" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Subir Colegio" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Asignar alumno" })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Calcular itinerario vial", exact: true })
    .click();
  await expect(page.getByText(/2.20 km/)).toBeVisible();
});

test("parent picks a listed draft route and enrolls the child", async ({
  page,
}) => {
  const state = await fixture(page, "PARENT", {
    offerStatus: "DRAFT",
    openRoutes: [
      {
        routeId,
        enrollmentCode: "SUR12345",
        routeName: "Ruta Sur",
        destinationName: "Colegio de prueba",
        organizationName: "Operación de prueba",
        direction: "PICKUP",
        availableSeats: 3,
        departureTime: "06:30:00",
        estimatedArrivalTime: "07:30:00",
      },
    ],
  });
  await page.goto("/parent/students");
  await page
    .getByRole("button", { name: "Inscribir a Ana", exact: true })
    .click();
  const list = page.getByRole("region", { name: "Rutas disponibles" });
  await expect(list).toContainText("SUR12345");
  await expect(list).toContainText("Colegio de prueba");
  await list.getByRole("button", { name: "Elegir Ruta Sur" }).click();
  await page.getByRole("button", { name: "Confirmar inscripción" }).click();
  await expect(page.getByText("Inscripción registrada")).toBeVisible();
  expect(
    state.calls.find(
      (c) => c.method === "POST" && c.path.endsWith("/enrollments"),
    ).body.enrollmentCode,
  ).toBe("SUR12345");
});

test("provider failure stays explicit; editing/removing stops does not manufacture geometry", async ({
  page,
}) => {
  const r = readyRoute();
  r.stops = [
    {
      id: id(20),
      name: "Casa",
      sequence: 1,
      latitude: -12.1,
      longitude: -77.02,
      studentIds: [],
    },
    {
      id: id(21),
      name: "Colegio",
      sequence: 2,
      latitude: -12.12,
      longitude: -77.03,
      studentIds: [],
    },
  ];
  const state = await fixture(page, "ADMIN", { routes: [r], failMaps: true });
  await page.goto("/admin/routes");
  await page.getByRole("button", { name: "Destino, alumnos e itinerario" }).click();
  await page.getByRole("button", { name: "Calcular itinerario vial" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Proveedor de mapas no disponible",
  );
  expect(state.routes[0].itinerary).toBeUndefined();
  await page.getByRole("button", { name: "Editar Casa", exact: true }).click();
  await page.getByLabel("Nombre de parada").fill("Casa corregida");
  await location(
    page,
    "Casa confirmada",
    page.locator("form").filter({ hasText: "Editar parada" }),
  );
  await page.getByRole("button", { name: "Guardar parada" }).click();
  await expect(
    page.getByRole("button", { name: "Editar Casa corregida", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Eliminar parada", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Confirmar cambio", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Calcular itinerario vial" }),
  ).toBeDisabled();
});

test("family account/contact partial failure is resumable; student is pending until explicit review", async ({
  page,
}) => {
  const state = await fixture(page, "ADMIN", { failContact: true });
  await page.goto("/admin/families");
  await page
    .getByRole("button", { name: "Crear cuenta de tutor", exact: true })
    .click();
  await page.getByLabel("Nombres del tutor").fill("Tutor");
  await page.getByLabel("Apellidos del tutor").fill("Prueba");
  await page.getByLabel("Correo del tutor").fill("parent@example.test");
  await page.getByLabel("Contraseña inicial").fill("Fixture123!");
  await page.getByRole("button", { name: "Crear cuenta y continuar" }).click();
  await expect(
    page.getByLabel("Identificador de cuenta del tutor"),
  ).toHaveValue(guardianId);
  await page.getByLabel("Teléfono de contacto").fill("999999999");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("contacto");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.calls.filter((c) => c.path === "/users/parents")).toHaveLength(
    1,
  );
  await page
    .getByRole("button", { name: "Registrar alumno", exact: true })
    .click();
  await page.getByLabel("Tutor del alumno").selectOption(guardianId);
  await page.getByLabel("Nombres del alumno").fill("Ana");
  await page.getByLabel("Apellidos del alumno").fill("Prueba");
  await location(page);
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(
    page.getByText("Pendiente de revisión", { exact: true }),
  ).toBeVisible();
  expect(
    state.calls.find(
      (c) =>
        c.path === "/stakeholders/administration/students" &&
        c.method === "POST",
    ).body,
  ).toMatchObject({
    guardianUserId: guardianId,
    student: {
      pickupLocation: { latitude: -12.123456, longitude: -77.012345 },
    },
  });
  await page
    .getByRole("button", {
      name: "Verificar vínculo de Ana Prueba",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Referencia de revisión")
    .fill("Revisión presencial de prueba");
  await page.getByRole("button", { name: "Confirmar revisión" }).click();
  await expect(page.getByText("Verificado", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Revocar acceso de Ana Prueba", exact: true })
    .click();
  await page.getByLabel("Motivo de revocación").fill("Solicitud de prueba");
  await page.getByRole("button", { name: "Confirmar revisión" }).click();
  await expect(page.getByText("Revocado", { exact: true })).toBeVisible();
  expect(state.calls.some((c) => c.path.endsWith("/cancel"))).toBeFalsy();
});

test("cancelling service does not silently revoke the guardian link", async ({
  page,
}) => {
  const state = await fixture(page, "ADMIN", {
    enrollments: [
      {
        enrollmentId: id(30),
        studentId,
        fullName: "Ana Prueba",
        routeName: "Ruta Sur",
        enrollmentStatus: "ACTIVE",
      },
    ],
  });
  await page.goto("/admin/families");
  await page
    .getByRole("button", { name: "Cancelar inscripción de Ana Prueba" })
    .click();
  await page
    .getByLabel("Motivo de cancelación")
    .fill("Fin de servicio de prueba");
  await page.getByRole("button", { name: "Confirmar cancelación" }).click();
  await expect(
    page.getByText("Sin inscripciones para este filtro."),
  ).toBeVisible();
  expect(state.calls.some((c) => c.path.endsWith("/revoke"))).toBeFalsy();
});

test("denied GPS never invents a pickup point; confirmed manual location is persisted", async ({
  page,
}) => {
  const state = await fixture(page, "PARENT", { students: [] });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      value: { getCurrentPosition: (ok, fail) => fail({ code: 1 }) },
    });
  });
  await page.goto("/parent/students");
  await page
    .getByRole("button", { name: "Registrar estudiante", exact: true })
    .click();
  await page.getByRole("button", { name: "Usar mi ubicación" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "No se pudo obtener tu ubicación",
  );
  await expect(page.getByLabel("Latitud", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Longitud", { exact: true })).toHaveValue("");
  await page.getByLabel("Nombres del alumno").fill("Ana");
  await page.getByLabel("Apellidos del alumno").fill("Prueba");
  await location(page);
  // Editing a point invalidates a previous confirmation.
  await page.getByLabel("Latitud", { exact: true }).fill("-12.2");
  await expect(
    page.getByRole("checkbox", { name: /Confirmo que este punto/ }),
  ).not.toBeChecked();
  await page.getByRole("checkbox", { name: /Confirmo que este punto/ }).check();
  await page
    .getByRole("button", { name: "Guardar estudiante", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ana Prueba", exact: true }),
  ).toBeVisible();
  expect(
    state.calls.find(
      (c) => c.path === "/stakeholders/me/students" && c.method === "POST",
    ).body.pickupLocation.latitude,
  ).toBe(-12.2);
});

test("incomplete parent profile prevents enrollment", async ({ page }) => {
  const state = await fixture(page, "PARENT", {
    profile: { isComplete: false },
  });
  await page.goto("/parent/students");
  await expect(
    page.getByRole("link", { name: "Completar mi perfil" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Inscribir a Ana", exact: true }),
  ).toBeDisabled();
  expect(
    state.calls.some(
      (c) => c.method === "POST" && c.path.endsWith("/enrollments"),
    ),
  ).toBeFalsy();
});

test("changing a code invalidates offer; capacity rejection retains the form and session", async ({
  page,
}) => {
  const state = await fixture(page, "PARENT", { noSeats: true });
  await page.goto("/parent/students");
  await page
    .getByRole("button", { name: "Inscribir a Ana", exact: true })
    .click();
  await page.getByLabel("Código de inscripción").fill("FIRST");
  await page.getByRole("button", { name: "Consultar ruta" }).click();
  await expect(
    page.getByRole("button", { name: "Confirmar inscripción" }),
  ).toBeEnabled();
  await page.getByLabel("Código de inscripción").fill("SECOND");
  await expect(
    page.getByRole("button", { name: "Confirmar inscripción" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Consultar ruta" }).click();
  await page.getByRole("button", { name: "Confirmar inscripción" }).click();
  await expect(page.getByRole("alert")).toContainText("No quedan cupos");
  expect(
    state.calls.find(
      (c) => c.method === "POST" && c.path.endsWith("/enrollments"),
    ).body.enrollmentCode,
  ).toBe("SECOND");
  expect(
    await page.evaluate(
      () => !!sessionStorage.getItem("rutasegura.auth.session"),
    ),
  ).toBeTruthy();
});

test("private photo uses bearer blob, validates size and sends multipart photo", async ({
  page,
}) => {
  const s = parentStudent();
  s.photo = { version: "v1", url: "https://untrusted.invalid/image" };
  const state = await fixture(page, "PARENT", { students: [s] });
  await page.goto("/parent/students");
  await expect(page.getByAltText("Foto del alumno")).toBeVisible();
  expect(
    state.calls.find(
      (c) => c.path === `/stakeholders/students/${studentId}/photo`,
    ).headers.authorization,
  ).toContain("Bearer test.");
  expect(
    await page.getByAltText("Foto del alumno").getAttribute("src"),
  ).toMatch(/^blob:/);
  await page.getByRole("button", { name: "Cambiar foto" }).click();
  await page
    .getByLabel("Imagen del alumno")
    .setInputFiles({
      name: "large.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(1024 * 1024 + 1),
    });
  await expect(page.getByRole("alert")).toContainText("hasta 1 MB");
  await expect(
    page.getByRole("button", { name: "Guardar foto" }),
  ).toBeDisabled();
  await page
    .getByLabel("Imagen del alumno")
    .setInputFiles({
      name: "tiny.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lL8AAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await page.getByRole("button", { name: "Guardar foto" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const upload = state.calls.find(
    (c) =>
      c.path === `/stakeholders/me/students/${studentId}/photo` &&
      c.method === "PUT",
  );
  expect(upload.headers["content-type"]).toContain(
    "multipart/form-data; boundary=",
  );
  expect(upload.body).toContain('name="photo"');
});

for (const width of [320, 390, 1440])
  test(`operational pages and modal fit ${width}px with mobile brand`, async ({
    page,
  }) => {
    const responsiveState = await fixture(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/admin/families");
    await page
      .getByRole("button", { name: "Registrar alumno", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    const box = await page.getByRole("dialog").boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    const style = await page
      .getByRole("button", { name: "Guardar", exact: true })
      .evaluate((e) => ({
        background: getComputedStyle(e).backgroundColor,
        font: getComputedStyle(document.querySelector("h1")).fontFamily,
      }));
    expect(style.background).toBe("rgb(242, 183, 5)");
    expect(style.font).toContain("Archivo Expanded");
    await page.screenshot({
      path: `test-results/families-${width}.png`,
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Registrar alumno", exact: true }),
    ).toBeFocused();
    responsiveState.drivers.push({ id:id(11), firstName:'Luis', lastName:'Prueba', status:'VERIFIED', licenseNumber:'Q12345678', licenseCategory:'A-IIB', licenseExpiresOn:'2028-12-31' });
    responsiveState.vehicles.push({ id:id(12), licensePlate:'ABC-123', brand:'Marca', model:'Modelo', seatingCapacity:20, status:'ENABLED' });
    responsiveState.routes.push(readyRoute());
    for (const section of ['resources','routes']) {
      await page.goto(`/admin/${section}`);
      await expect(page.getByRole('button', {name:section === 'resources' ? 'Suspender conductor' : 'Destino, alumnos e itinerario',exact:true})).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
      await page.screenshot({path:`test-results/${section}-${width}.png`,fullPage:true});
    }
  });

test("route assignment conflict is shown without discarding the selected resources", async ({
  page,
}) => {
  const state = await fixture(page, "ADMIN", {
    routes: [readyRoute()],
    conflict: true,
    drivers: [
      { id: id(11), firstName: "Luis", lastName: "Prueba", status: "VERIFIED" },
    ],
    vehicles: [{ id: id(12), licensePlate: "ABC-123", status: "ENABLED" }],
  });
  await page.goto("/admin/routes");
  await page
    .getByRole("button", { name: "Asignar recursos", exact: true })
    .click();
  await page.getByLabel("Conductor verificado").selectOption(id(11));
  await page.getByLabel("Vehículo habilitado").selectOption(id(12));
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Asignar recursos", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Horario del conductor en conflicto",
  );
  await expect(page.getByLabel("Conductor verificado")).toHaveValue(id(11));
  expect(state.calls.some((c) => c.path.endsWith("/activate"))).toBeFalsy();
});

test("pending contact recovery survives reload and is cleared on logout", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto("/admin/families");
  await page
    .getByRole("button", { name: "Crear cuenta de tutor", exact: true })
    .click();
  await page.getByLabel("Nombres del tutor").fill("Tutor");
  await page.getByLabel("Apellidos del tutor").fill("Prueba");
  await page.getByLabel("Correo del tutor").fill("parent@example.test");
  await page.getByLabel("Contraseña inicial").fill("Fixture123!");
  await page.getByRole("button", { name: "Crear cuenta y continuar" }).click();
  await expect(
    page.getByLabel("Identificador de cuenta del tutor"),
  ).toHaveValue(guardianId);
  await page.reload();
  await page
    .getByRole("button", { name: "Retomar contacto pendiente" })
    .click();
  await expect(
    page.getByLabel("Identificador de cuenta del tutor"),
  ).toHaveValue(guardianId);
  expect(state.calls.filter((c) => c.path === "/users/parents")).toHaveLength(
    1,
  );
  expect(
    await page.evaluate(() => Object.values(sessionStorage).join(" ")),
  ).not.toContain("Fixture123!");
  await page.getByRole("button", { name: "Cerrar ventana" }).click();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).filter((k) =>
        k.startsWith("rutasegura.operation-draft."),
      ),
    ),
  ).toEqual([]);
});

test("choosing the pickup on the map requires explicit confirmation", async ({
  page,
}) => {
  await fixture(page, "PARENT", { students: [] });
  await page.goto("/parent/students");
  await page
    .getByRole("button", { name: "Registrar estudiante", exact: true })
    .click();
  const map = page.getByRole("region", { name: "Elegir ubicación de recojo" });
  await map.click({ position: { x: 140, y: 140 } });
  await expect(page.getByLabel("Latitud", { exact: true })).not.toHaveValue("");
  await expect(
    page.getByRole("checkbox", { name: /Confirmo que este punto/ }),
  ).not.toBeChecked();
});
