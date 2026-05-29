"use client";

import { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ClipboardList, CheckCircle2, Clock, Trash2, BarChart3, Play } from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/axios";

interface Assessment {
  id: string;
  title: string;
  type: "EXAM" | "SURVEY";
  published: boolean;
  startDate: string | null;
  endDate: string | null;
  maxAttempts: number;
  attemptsUsed: number;
  createdAt: string;
}

interface CurrentUser {
  userId: string;
  roles: string[];
}

async function fetchAssessments(programId: string): Promise<Assessment[]> {
  const res = await apiClient.get(`/api/v1/programs/${programId}/assessments`);
  return res.data;
}

async function fetchMe(): Promise<CurrentUser> {
  const res = await apiClient.get("/api/v1/auth/me");
  return res.data;
}

const TYPE_LABELS = {
  EXAM:   { label: "Examen",   color: "text-blue-600 bg-blue-50" },
  SURVEY: { label: "Encuesta", color: "text-green-600 bg-green-50" },
};

export default function AssessmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: programId } = use(params);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ["assessments", programId],
    queryFn: () => fetchAssessments(programId),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/assessments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assessments", programId] }),
  });

  const isLeader = user?.roles?.some((r) =>
    ["PROGRAM_LEADER", "ADMIN", "SUPER_ADMIN"].includes(r)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-7 h-7 rounded-full border-2 border-asa-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-asa-text">Evaluaciones</h2>
          <p className="text-sm text-asa-muted mt-0.5">{assessments.length} evaluación(es)</p>
        </div>
        {isLeader && (
          <Link
            href={`/programs/${programId}/assessments/new`}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" /> Nueva evaluación
          </Link>
        )}
      </div>

      {/* Empty state */}
      {assessments.length === 0 && (
        <div className="panel text-center py-16">
          <ClipboardList className="w-12 h-12 mx-auto text-asa-primary/30 mb-3" />
          <p className="text-asa-muted">
            {isLeader
              ? "Aún no hay evaluaciones. Crea una para comenzar."
              : "No hay evaluaciones disponibles en este programa."}
          </p>
          {isLeader && (
            <Link
              href={`/programs/${programId}/assessments/new`}
              className="btn-primary inline-flex mt-4"
            >
              <Plus className="w-4 h-4" /> Crear evaluación
            </Link>
          )}
        </div>
      )}

      {/* Assessments list */}
      <div className="space-y-3">
        {assessments.map((assessment) => {
          const typeConfig = TYPE_LABELS[assessment.type] ?? TYPE_LABELS.EXAM;
          const canTake =
            !isLeader &&
            assessment.published &&
            assessment.attemptsUsed < assessment.maxAttempts;
          const hasAttempts = !isLeader && assessment.attemptsUsed > 0;

          return (
            <div key={assessment.id} className="bg-white rounded-2xl border border-asa-border shadow-subtle flex items-start gap-4 p-5">
              <div className="w-10 h-10 rounded-xl bg-asa-highlight flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5 text-asa-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-asa-text">{assessment.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeConfig.color}`}>
                    {typeConfig.label}
                  </span>
                  {isLeader && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      assessment.published
                        ? "text-green-700 bg-green-50"
                        : "text-amber-700 bg-amber-50"
                    }`}>
                      {assessment.published ? "Publicado" : "Borrador"}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 mt-1.5 text-xs text-asa-muted flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {assessment.maxAttempts} intento(s)
                  </span>
                  {assessment.startDate && (
                    <span>
                      Desde {new Date(assessment.startDate).toLocaleDateString("es-EC")}
                    </span>
                  )}
                  {assessment.endDate && (
                    <span>
                      Hasta {new Date(assessment.endDate).toLocaleDateString("es-EC")}
                    </span>
                  )}
                  {!isLeader && assessment.attemptsUsed > 0 && (
                    <span className="flex items-center gap-1 text-asa-primary">
                      <CheckCircle2 className="w-3 h-3" />
                      {assessment.attemptsUsed}/{assessment.maxAttempts} intentos usados
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Student actions */}
                {!isLeader && canTake && (
                  <Link
                    href={`/programs/${programId}/assessments/${assessment.id}/play`}
                    className="btn-primary text-sm flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" /> Resolver
                  </Link>
                )}
                {!isLeader && hasAttempts && (
                  <Link
                    href={`/programs/${programId}/assessments/${assessment.id}/result`}
                    className="btn-outline text-sm"
                  >
                    Ver resultado
                  </Link>
                )}

                {/* Leader actions */}
                {isLeader && (
                  <>
                    <Link
                      href={`/programs/${programId}/assessments/${assessment.id}/results`}
                      className="btn-outline text-sm flex items-center gap-1.5"
                    >
                      <BarChart3 className="w-3.5 h-3.5" /> Resultados
                    </Link>
                    <Link
                      href={`/programs/${programId}/assessments/new?edit=${assessment.id}`}
                      className="btn-outline text-sm"
                    >
                      Editar
                    </Link>
                    <button
                      className="btn-icon text-asa-error hover:bg-red-50"
                      onClick={() => {
                        if (confirm(`¿Eliminar "${assessment.title}"?`)) {
                          deleteMutation.mutate(assessment.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
