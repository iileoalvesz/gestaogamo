import type { EquipmentStatus } from "../types";

const config: Record<EquipmentStatus, { label: string; bg: string; text: string }> = {
  em_dia: { label: "Em Dia", bg: "#d1fae5", text: "#065f46" },
  a_vencer: { label: "A Vencer", bg: "#fef3c7", text: "#92400e" },
  vencido: { label: "Vencido", bg: "#fee2e2", text: "#991b1b" },
  sem_data: { label: "Sem Data", bg: "#f3f4f6", text: "#374151" },
  danificado: { label: "Danificado", bg: "#fde8d8", text: "#7c2d12" },
  perdido: { label: "Perdido", bg: "#ede9fe", text: "#4c1d95" },
  fora_de_uso: { label: "Fora de Uso", bg: "#e5e7eb", text: "#6b7280" },
};

interface Props {
  status: EquipmentStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: Props) {
  const c = config[status] ?? config.sem_data;
  const padding = size === "sm" ? "2px 8px" : "4px 12px";
  const fontSize = size === "sm" ? 11 : 13;
  return (
    <span
      style={{
        backgroundColor: c.bg,
        color: c.text,
        padding,
        borderRadius: 20,
        fontWeight: 600,
        fontSize,
        whiteSpace: "nowrap",
      }}
    >
      {c.label}
    </span>
  );
}
