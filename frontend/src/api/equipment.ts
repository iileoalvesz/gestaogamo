import api from "./client";
import type { Equipment, DashboardData, PaginatedResponse } from "../types";

export const getDashboard = () => api.get<DashboardData>("/dashboard/");

export const getEquipmentList = (params?: Record<string, string>) =>
  api.get<PaginatedResponse<Equipment>>("/equipment/", { params });

export const getEquipment = (id: number) =>
  api.get<Equipment>(`/equipment/${id}/`);

export const createEquipment = (data: Partial<Equipment>) =>
  api.post<Equipment>("/equipment/", data);

export const updateEquipment = (id: number, data: Partial<Equipment>) =>
  api.patch<Equipment>(`/equipment/${id}/`, data);

export const deleteEquipment = (id: number) => api.delete(`/equipment/${id}/`);

export const uploadCertificate = (formData: FormData) =>
  api.post("/certificates/upload/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
