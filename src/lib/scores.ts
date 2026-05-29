export interface ScoreDisplay {
  label: string;
  colorClass: string;
}

export function formatScore(score: number | null, assessmentType: string): ScoreDisplay {
  if (assessmentType === "SURVEY") {
    return { label: "Completada", colorClass: "text-green-700 bg-green-50" };
  }
  if (score === null || score === undefined) {
    return { label: "—", colorClass: "text-gray-500 bg-gray-100" };
  }
  if (score >= 70) return { label: String(score), colorClass: "text-green-700 bg-green-50" };
  if (score >= 50) return { label: String(score), colorClass: "text-amber-700 bg-amber-50" };
  return { label: String(score), colorClass: "text-red-700 bg-red-50" };
}
