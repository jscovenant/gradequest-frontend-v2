import { authApi } from "../utils/axios";

export const hostelApi = {
  dashboard: (params?: Record<string, string | number>) => authApi.get("/hostels", { params }),
  createHostel: (data: Record<string, unknown>) => authApi.post("/hostels", data),
  updateHostel: (id: number, data: Record<string, unknown>) => authApi.patch(`/hostels/${id}`, data),
  createRoom: (hostelId: number, data: Record<string, unknown>) => authApi.post(`/hostels/${hostelId}/rooms`, data),
  updateRoom: (id: number, data: Record<string, unknown>) => authApi.patch(`/hostels/rooms/${id}`, data),
  allocate: (data: Record<string, unknown>) => authApi.post("/hostels/allocations", data),
  checkout: (id: number, reason?: string) => authApi.post(`/hostels/allocations/${id}/checkout`, { reason }),
  transfer: (id: number, hostelRoomId: number, reason: string) => authApi.post(`/hostels/allocations/${id}/transfer`, { hostel_room_id: hostelRoomId, reason }),
};
