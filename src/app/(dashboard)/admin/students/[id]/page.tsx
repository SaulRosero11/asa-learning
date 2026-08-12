"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, User, BookOpen, ClipboardList,
  CheckCircle2, Clock, GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/axios";
import { formatDate } from "@/lib/dates";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EnrollmentSummary {
  programId: string; programName: string; status: string;
  enrolledAt: string; completionDate: string | null;
}

interface ExamSummary {
  assessmentId: string; title: string; type: string;
  attemptCount: number; bestScore: number;
}

interface StudentProfile {
  userId: string; email: string;
  firstName: string | null; lastName: string | null; phoneNumber: string | null;
  onboardingCompleted: boolean;
  enrollmentCount: number;
  enrollments: EnrollmentSummary[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ENROLLMENT_STATUS: Record<string, { label: string; color: string }> = {
  ENROLLED:  { label: "En curso",   color: "text-blue-700 bg-blue-50" },
  COMPLETED: { label: "Completado", color: "text-green-700 bg-green-50" },
  DROPPED:   { label: "Abandonado", color: "text-gray-500 bg-gray-100" },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: studentId } = use(params);

  const { data: profile, isLoading: loadingProfile, isError: profileError } = useQuery<StudentProfile>({
    queryKey: ["admin-student-profile", studentId],
    queryFn: () => apiClient.get(`/api/v1/admin/users/${studentId}/profile`).then(r => r.data),
    retry: 1,
  });

  const { data: examSummary = [], isLoading: loadingExams } = useQuery<ExamSummary[]>({
    queryKey: ["admin-student-exam-summary", studentId],
    queryFn: () => apiClient.get(`/api/v1/admin/students/${studentId}/exam-summary`).then(r => r.data),
    retry: 1,
  });

  const isLoading = loadingProfile || loadingExams;
  const fullName = profile?.firstName && profile?.lastName
    ? `${profile.firstName} ${profile.lastName}`
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/students" className="btn-icon">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-asa-text">
            {isLoading ? "Cargando…" : fullName ?? profile?.email ?? "Perfil del estudiante"}
          </h1>
          {fullName && <p className="text-sm text-asa-muted mt-0.5">{profile?.email}</p>}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-asa-border/30 rounded-2xl animate-pulse" />)}
        </div>
      ) : profileError ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-sm font-semibold text-red-700 mb-1">Error al cargar el perfil</p>
          <p className="text-xs text-red-600">
            No se pudo obtener la información del estudiante. Verifica que el servidor esté activo e intenta nuevamente.
          </p>
        </div>
      ) : profile ? (
        <>
          {/* Personal Data */}
          <div className="bg-white rounded-2xl border border-asa-border shadow-subtle p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-asa-primary" />
              <h2 className="font-semibold text-asa-text">Datos personales</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-asa-muted mb-1">Nombre</p>
                <p className="text-sm font-medium text-asa-text">{fullName ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-asa-muted mb-1">Correo electrónico</p>
                <p className="text-sm font-medium text-asa-text">{profile.email}</p>
              </div>
              {profile.phoneNumber && (
                <div>
                  <p className="text-xs text-asa-muted mb-1">Teléfono</p>
                  <p className="text-sm font-medium text-asa-text">{profile.phoneNumber}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-asa-muted mb-1">Onboarding</p>
                {profile.onboardingCompleted ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full w-fit">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Completado
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full w-fit">
                    <Clock className="w-3.5 h-3.5" /> Pendiente
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Enrolled Programs */}
          <div className="bg-white rounded-2xl border border-asa-border shadow-subtle overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-asa-border">
              <BookOpen className="w-4 h-4 text-asa-primary" />
              <h2 className="font-semibold text-asa-text">Programas matriculados</h2>
              <span className="ml-auto text-xs text-asa-muted">{profile.enrollments.length}</span>
            </div>
            {profile.enrollments.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-asa-muted">
                <GraduationCap className="w-8 h-8 text-asa-primary/30 mb-2" />
                <p className="text-sm">Sin programas matriculados</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-asa-bg border-b border-asa-border">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-asa-muted uppercase tracking-wide">Programa</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-asa-muted uppercase tracking-wide">Estado</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-asa-muted uppercase tracking-wide">Matriculado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-asa-border">
                  {profile.enrollments.map(e => {
                    const sc = ENROLLMENT_STATUS[e.status] ?? { label: e.status, color: "text-asa-muted bg-asa-bg" };
                    return (
                      <tr key={e.programId}>
                        <td className="px-5 py-3 font-medium text-asa-text">{e.programName}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sc.color}`}>{sc.label}</span>
                        </td>
                        <td className="px-5 py-3 text-asa-muted text-xs">{formatDate(e.enrolledAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Exam Summary */}
          <div className="bg-white rounded-2xl border border-asa-border shadow-subtle overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-asa-border">
              <ClipboardList className="w-4 h-4 text-asa-primary" />
              <h2 className="font-semibold text-asa-text">Evaluaciones</h2>
              <span className="ml-auto text-xs text-asa-muted">{examSummary.length}</span>
            </div>
            {examSummary.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-asa-muted">
                <ClipboardList className="w-8 h-8 text-asa-primary/30 mb-2" />
                <p className="text-sm">Sin evaluaciones completadas</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-asa-bg border-b border-asa-border">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-asa-muted uppercase tracking-wide">Evaluación</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-asa-muted uppercase tracking-wide">Tipo</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-asa-muted uppercase tracking-wide">Intentos</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-asa-muted uppercase tracking-wide">Mejor nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-asa-border">
                  {examSummary.map(e => (
                    <tr key={e.assessmentId}>
                      <td className="px-5 py-3 font-medium text-asa-text">{e.title}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          e.type === "SURVEY" ? "text-purple-700 bg-purple-50" : "text-blue-700 bg-blue-50"
                        }`}>
                          {e.type === "SURVEY" ? "Encuesta" : "Examen"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-asa-text">{e.attemptCount}</td>
                      <td className="px-5 py-3 font-semibold text-asa-text">
                        {e.type === "SURVEY" ? "Completada" : `${e.bestScore}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <div className="panel text-center py-16 text-asa-muted">
          <p>Estudiante no encontrado.</p>
        </div>
      )}
    </div>
  );
}
