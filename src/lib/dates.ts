/** Convierte "YYYY-MM-DD" (output de input[type=date]) a ISO-8601 que acepta OffsetDateTime del backend */
export function toISODateTime(dateStr: string | undefined | null, endOfDay = false): string | null {
  if (!dateStr) return null;
  // Si ya tiene hora (T), lo devuelve tal cual
  if (dateStr.includes("T")) return dateStr;
  return endOfDay ? `${dateStr}T23:59:59.000Z` : `${dateStr}T00:00:00.000Z`;
}

/** Convierte ISO datetime a "YYYY-MM-DD" para input[type=date] */
export function toDateInput(isoStr: string | null | undefined): string {
  if (!isoStr) return "";
  return isoStr.split("T")[0];
}

/** Formatea fecha ISO a string legible en español */
export function formatDate(isoStr: string | null | undefined): string {
  if (!isoStr) return "—";
  return new Date(isoStr).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
