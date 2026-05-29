"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, BookOpen, CheckCircle2, Clock, ClipboardList, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/axios";

interface AttemptHistory {
  assessmentId: string; assessmentTitle: string;
  totalScore: number; percentage: number; endTime: string;
}
interface EnrollmentHistory {
  programId: string; programName: string; status: string;
  enrolledAt: string; completionDate: string | null; attempts: AttemptHistory[];
}
interface HistoryData { userId: string; email: string; enrollments: EnrollmentHistory[] }

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ENROLLED:  { label: "Matriculado",  color: "text-blue-600 bg-blue-50", icon: <Clock className="w-3 h-3" /> },
  COMPLETED: { label: "Completado",   color: "text-green-600 bg-green-50", icon: <CheckCircle2 className="w-3 h-3" /> },
  DROPPED:   { label: "Abandonado",   color: "text-asa-muted bg-asa-bg", icon: null },
};

export default function HistoryPage() {
  const { data: history, isLoading } = useQuery<HistoryData>({
    queryKey: ["my-history"],
    queryFn: () => apiClient.get("/api/v1/analytics/me/history").then(r => r.data),
  });

  const exportCSV = () => {
    if (!history) return;
    const rows: string[][] = [["Programa", "Estado", "Fecha matrícula", "Fecha finalización", "Evaluación", "Puntaje", "Porcentaje"]];
    history.enrollments.forEach(e => {
      if (e.attempts.length === 0) {
        rows.push([e.programName, STATUS_CONFIG[e.status]?.label ?? e.status,
          new Date(e.enrolledAt).toLocaleDateString("es-EC"),
          e.completionDate ? new Date(e.completionDate).toLocaleDateString("es-EC") : "—",
          "—", "—", "—"]);
      } else {
        e.attempts.forEach(a => {
          rows.push([e.programName, STATUS_CONFIG[e.status]?.label ?? e.status,
            new Date(e.enrolledAt).toLocaleDateString("es-EC"),
            e.completionDate ? new Date(e.completionDate).toLocaleDateString("es-EC") : "—",
            a.assessmentTitle, String(Number(a.totalScore).toFixed(1)),
            `${Number(a.percentage).toFixed(1)}%`]);
        });
      }
    });

    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historial-${history.email}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-asa-primary border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="btn-icon"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-asa-text">Mi Historial de Aprendizaje</h1>
            {history && <p className="text-sm text-asa-muted">{history.enrollments.length} programa(s)</p>}
          </div>
        </div>
        {history && history.enrollments.length > 0 && (
          <button onClick={exportCSV} className="btn-outline flex items-center gap-2">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        )}
      </div>

      {!history?.enrollments.length && (
        <div className="panel text-center py-16">
          <BookOpen className="w-12 h-12 mx-auto text-asa-primary/30 mb-3" />
          <p className="text-asa-muted">No tienes programas en tu historial aún.</p>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-asa-border" />

        <div className="space-y-6">
          {history?.enrollments.map((enrollment, i) => {
            const sc = STATUS_CONFIG[enrollment.status] ?? STATUS_CONFIG.ENROLLED;
            return (
              <div key={enrollment.programId} className="relative flex gap-4">
                {/* Timeline dot */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 ${
                  enrollment.status === "COMPLETED" ? "bg-asa-primary" : "bg-white border-2 border-asa-primary"
                }`}>
                  {enrollment.status === "COMPLETED"
                    ? <CheckCircle2 className="w-5 h-5 text-white" />
                    : <BookOpen className="w-4 h-4 text-asa-primary" />}
                </div>

                {/* Card */}
                <div className="flex-1 glass-panel p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-asa-text">{enrollment.programName}</h3>
                      <p className="text-xs text-asa-muted mt-0.5">
                        Matriculado: {new Date(enrollment.enrolledAt).toLocaleDateString("es-EC")}
                        {enrollment.completionDate && ` · Completado: ${new Date(enrollment.completionDate).toLocaleDateString("es-EC")}`}
                      </p>
                    </div>
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${sc.color}`}>
                      {sc.icon} {sc.label}
                    </span>
                  </div>

                  {/* Attempts */}
                  {enrollment.attempts.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-asa-muted uppercase tracking-wide flex items-center gap-1.5">
                        <ClipboardList className="w-3.5 h-3.5" /> Evaluaciones
                      </p>
                      {enrollment.attempts.map(attempt => (
                        <div key={attempt.assessmentId + attempt.endTime}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-asa-bg text-sm">
                          <span className="text-asa-text truncate">{attempt.assessmentTitle}</span>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`font-semibold text-xs ${
                              Number(attempt.percentage) >= 70 ? "text-asa-success" : "text-asa-error"
                            }`}>
                              {Number(attempt.totalScore).toFixed(1)} pts
                            </span>
                            {attempt.endTime && (
                              <span className="text-xs text-asa-muted">
                                {new Date(attempt.endTime).toLocaleDateString("es-EC")}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
