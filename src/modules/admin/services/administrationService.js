import api from "@/shared/api/apiClient";
const body = (request) => request.then((response) => response.data);
export const getOperationGuardians = () =>
  body(api.get("/stakeholders/administration/guardians"));
export const getOperationStudents = () =>
  body(api.get("/stakeholders/administration/students"));
export const getGuardianLinks = () =>
  body(api.get("/stakeholders/administration/guardian-links"));
export const createParentAccount = (payload) =>
  body(api.post("/users/parents", payload));
export const registerOperationGuardian = (payload) =>
  body(api.post("/stakeholders/administration/guardians", payload));
export const registerOperationStudent = (guardianUserId, student) =>
  body(
    api.post("/stakeholders/administration/students", {
      guardianUserId,
      student,
    }),
  );
export const reviewGuardianLink = (link, verify, reference) =>
  body(
    api.post(
      `/stakeholders/administration/guardian-links/${link.guardianUserId}/${link.studentId}/${verify ? "verify" : "revoke"}`,
      { reference },
    ),
  );
export const getEnrollments = (routeId, onlyActive = true) =>
  body(
    api.get("/stakeholders/enrollments", {
      params: { routeId: routeId || undefined, onlyActive },
    }),
  );
export const cancelEnrollment = (id, reason) =>
  body(api.post(`/stakeholders/enrollments/${id}/cancel`, { reason }));
export const getRouteStudents = (id) =>
  body(api.get(`/stakeholders/routes/${id}/students`));
export const addStop = (id, payload) =>
  body(api.post(`/routes/${id}/stops`, payload));
export const updateStop = (id, stopId, payload) =>
  body(api.put(`/routes/${id}/stops/${stopId}`, payload));
export const removeStop = (id, stopId) =>
  body(api.delete(`/routes/${id}/stops/${stopId}`));
export const reorderStops = (id, stopIds) =>
  body(api.put(`/routes/${id}/stops/order`, { stopIds }));
export const assignStudent = (id, stopId, studentId) =>
  body(api.put(`/routes/${id}/stops/${stopId}/students/${studentId}`));
export const unassignStudent = (id, studentId) =>
  body(api.delete(`/routes/${id}/students/${studentId}`));
export const calculateItinerary = (id) =>
  body(api.post(`/routes/${id}/itinerary`));
