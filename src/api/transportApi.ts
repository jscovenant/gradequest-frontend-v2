import { authApi } from "../utils/axios";
export const transportApi = {
  dashboard: () => authApi.get("/transport"),
  createRoute: (data: Record<string, unknown>) => authApi.post("/transport/routes", data),
  createStop: (routeId: number, data: Record<string, unknown>) => authApi.post(`/transport/routes/${routeId}/stops`, data),
  createVehicle: (data: Record<string, unknown>) => authApi.post("/transport/vehicles", data),
  assign: (data: Record<string, unknown>) => authApi.post("/transport/assignments", data),
  endAssignment: (id: number) => authApi.post(`/transport/assignments/${id}/end`),
};
