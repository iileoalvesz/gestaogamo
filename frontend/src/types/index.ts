export type UserRole = "admin" | "analyst";

export interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  date_joined: string;
}

export type EquipmentType =
  | "balanca"
  | "syos"
  | "logger"
  | "paquimetro"
  | "termometro"
  | "outro";

export type Situation = "ativo" | "danificado" | "perdido" | "fora_de_uso";

export type EquipmentStatus =
  | "em_dia"
  | "a_vencer"
  | "vencido"
  | "sem_data"
  | "danificado"
  | "perdido"
  | "fora_de_uso";

export interface Certificate {
  id: number;
  certificate_number: string;
  issue_date: string | null;
  validity_months: number;
  requestor: string;
  material_type: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  identification: string;
  measurement_range: string;
  resolution: string;
  calibration_status: string;
  pdf_file: string;
  uploaded_by_name: string;
  created_at: string;
}

export interface Equipment {
  id: number;
  equipment_type: EquipmentType;
  equipment_type_display: string;
  name: string;
  location: string;
  model: string;
  identification: string;
  serial_number: string;
  certificate_number: string;
  calibration_frequency_days: number;
  last_calibration_date: string | null;
  next_calibration_date: string | null;
  situation: Situation;
  situation_display: string;
  status: EquipmentStatus;
  days_until_expiration: number | null;
  certificate_file: string | null;
  latest_certificate: Certificate | null;
  created_at: string;
  updated_at: string;
  certificates?: Certificate[];
}

export interface DashboardByType {
  label: string;
  total: number;
  em_dia: number;
  a_vencer: number;
  vencido: number;
}

export interface DashboardData {
  total: number;
  em_dia: number;
  a_vencer: number;
  vencido: number;
  sem_data: number;
  inativos: number;
  by_type: Record<EquipmentType, DashboardByType>;
  expiring_soon: Array<{
    id: number;
    name: string;
    identification: string;
    equipment_type: EquipmentType;
    location: string;
    next_calibration_date: string;
    situation: Situation;
    days_until_expiration: number;
    status: EquipmentStatus;
  }>;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AuthTokens {
  access: string;
  refresh: string;
  user: User;
}

// ─── Sensors ────────────────────────────────────────────────────────────────

export interface SensorLocation {
  id: number;
  name: string;
  syos_nickname: string;
  temp_standard: string;
  min_temp: string | null;
  max_temp: string | null;
  meta_target: string;
  is_active: boolean;
}

export interface SensorImport {
  id: number;
  period_start: string;
  period_end: string;
  import_status: "pending" | "done" | "error";
  error_message: string;
  total_rows: number;
  imported_by_name: string;
  created_at: string;
}

export interface SensorSummary {
  sensor_id: number;
  name: string;
  syos_nickname: string;
  temp_standard: string;
  min_temp: number | null;
  max_temp: number | null;
  meta_target: number;
  total_readings: number;
  ok_readings: number;
  compliance_pct: number;
  min_recorded: number | null;
  max_recorded: number | null;
  avg_recorded: number | null;
}

export interface SensorReading {
  id: number;
  sensor: number;
  sensor_name: string;
  recorded_at: string;
  temperature: string;
  is_ok: boolean;
}

export interface RpaStatus {
  running: boolean;
  status: "idle" | "running" | "done" | "error";
  message: string;
}
