import api from "./client";
import type {
  PaginatedResponse,
  SensorLocation,
  SensorImport,
  SensorSummary,
  SensorReading,
  RpaStatus,
} from "../types";

export const getSensorLocations = () =>
  api.get<SensorLocation[]>("/sensors/locations/");

export const getSensorImports = () =>
  api.get<SensorImport[]>("/sensors/imports/");

export const getSensorSummary = (params?: { period_start?: string; period_end?: string }) =>
  api.get<SensorSummary[]>("/sensors/summary/", { params });

export const getSensorReadings = (params: {
  sensor_id: number;
  period_start?: string;
  period_end?: string;
  page?: number;
  page_size?: number;
}) =>
  api.get<PaginatedResponse<SensorReading>>("/sensors/readings/", { params });

export const importSensorExcel = (file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  return api.post<{ message: string; total_rows: number; import_id: number }>(
    "/sensors/import/",
    fd,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
};

export const triggerRpa = () =>
  api.post<{ status: string; message: string }>("/sensors/rpa/");

export const getRpaStatus = () => api.get<RpaStatus>("/sensors/rpa/");

export const exportSensorExcel = (params?: { period_start?: string; period_end?: string }) =>
  api.get("/sensors/export/", { params, responseType: "blob" });
