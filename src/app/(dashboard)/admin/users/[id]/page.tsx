"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, User, BookOpen, ClipboardList,
  GraduationCap, UserCog, CheckCircle2, Clock,
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/axios";
import { formatDate } from "@/lib/dates";
import { formatScore } from "@/lib/scores";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EnrollmentSummary {
  programId: string; programName: string; status: string;
  enrolledAt: string; completionDate: string | null;
}

interface AttemptSummary {
  assessmentId: string; assessmentTitle: string; programName: string;
  assessmentType: string; totalScore: number; submittedAt: string;
}

interface LeaderProgramSummary {
  programId: string; programName: string;
}

interface BeneficiaryProfile {
  userId: string; email: string;
  firstName: string | null; lastName: string | null; phoneNumber: string | null;
  onboardingCompleted: boolean;
  enrollmentCount: number;
  onboardingData: Record<string, string>;
  enrollments: EnrollmentSummary[];
  leaderPrograms: LeaderProgramSummary[];
  assessmentAttempts: AttemptSummary[];
}

// ── Status config ─────────────────────────────────────────────────────────────

const ENROLLMENT_STATUS: Record<string, { label: string; color: string }> = {
  ENROLLED:  { label: "En curso",    color: "text-blue-700 bg-blue-50" },
  COMPLETED: { label: "Completado",  color: "text-green-700 bg-green-50" },
  DROPPED:   { label: "Abandonado",  color: "text-gray-500 bg-gray-100" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────


function formatOnboardingKey(key: string): string {
  return key.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim();
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BeneficiaryProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = use(params);

  const { data: profile, isLoading } = useQuery<BeneficiaryProfile>({
    queryKey: ["beneficiary-profile", userId],
    queryFn: () => apiClient.get(`/api/v1/admin/users/${userId}/profile`).then(r => r.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-5 bg-asa-border rounded w-48" />
        <div className="h-32 bg-asa-border rounded-2xl" />
        <div className="h-48 bg-asa-border rounded-2xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-2xl border border-asa-border shadow-subtle p-12 text-center">
        <p className="text-asa-muted">Usuario no encontrado.</p>
        <Link href="/admin/users" className="btn-primary inline-flex mt-4">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
      </div>
    );
  }

  const fullName = profile.firstName && profile.lastName
    ? `${profile.firstName} ${profile.lastName}`
    : null;

  const onboardingEntries = Object.entries(profile.onboardingData ?? {});

  return (
    <div className="space-y-6 -mt-1">
      {/* Breadcrumb */}
      <Link
        href="/admin/users"
        className="flex items-center gap-1.5 text-sm text-asa-muted hover:text-asa-primary transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" /> Usuarios
      </Link>

      {/* Hero */}
      <div className="bg-white rounded-2xl border border-asa-border shadow-subtle p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-asa-highlight flex items-center justify-center text-lg font-bold text-asa-primary shrink-0">
            {profile.email.slice(0, 2).toUpperCase()}
          </div>
          <div>
            {fullName && <h1 className="text-xl font-bold text-asa-text">{fullName}</h1>}
            <p className={`text-sm ${fullName ? "text-asa-muted" : "text-xl font-bold text-asa-text"}`}>
              {profile.email}
            </p>
            {profile.phoneNumber && (
              <p className="text-sm text-asa-muted mt-0.5">{profile.phoneNumber}</p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {profile.onboardingCompleted ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Onboarding completo
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                  <Clock className="w-3 h-3" /> Onboarding pendiente
                </span>
              )}
              <span className="text-xs text-asa-muted">{profile.enrollmentCount} programa{profile.enrollmentCount !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding data */}
      <div className="bg-white rounded-2xl border border-asa-border shadow-subtle p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-asa-primary" />
          <h2 className="font-semibold text-asa-text">Datos de onboarding</h2>
        </div>

        {onboardingEntries.length === 0 ? (
          <p className="text-sm text-asa-muted">Este usuario no ha completado el onboarding.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {onboardingEntries.map(([key, value]) => (
              <div key={key} className="bg-asa-bg rounded-xl p-3">
                <p className="text-xs text-asa-muted capitalize mb-0.5">{formatOnboardingKey(key)}</p>
                <p className="text-sm font-medium text-asa-text">{String(value) || "—"}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Programs */}
      <div className="bg-white rounded-2xl border border-asa-border shadow-subtle p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-asa-primary" />
          <h2 className="font-semibold text-asa-text">Programas matriculados</h2>
          <span className="ml-auto text-xs text-asa-muted">{profile.enrollments.length} programa{profile.enrollments.length !== 1 ? "s" : ""}</span>
        </div>

        {profile.enrollments.length === 0 ? (
          <div className="text-center py-6">
            <GraduationCap className="w-8 h-8 mx-auto text-asa-primary/30 mb-2" />
            <p className="text-sm text-asa-muted">Sin programas matriculados.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {profile.enrollments.map(e => {
              const sc = ENROLLMENT_STATUS[e.status] ?? ENROLLMENT_STATUS.ENROLLED;
              return (
                <div key={e.programId} className="flex items-center gap-3 p-3 rounded-xl bg-asa-bg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-asa-text truncate">{e.programName}</p>
                    <p className="text-xs text-asa-muted">
                      Matriculado: {formatDate(e.enrolledAt)}
                      {e.completionDate && ` · Completado: ${formatDate(e.completionDate)}`}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${sc.color}`}>
                    {sc.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Leader programs */}
      {profile.leaderPrograms && profile.leaderPrograms.length > 0 && (
        <div className="bg-white rounded-2xl border border-asa-border shadow-subtle p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserCog className="w-5 h-5 text-asa-primary" />
            <h2 className="font-semibold text-asa-text">Programas que lidera</h2>
            <span className="ml-auto text-xs text-asa-muted">{profile.leaderPrograms.length} programa{profile.leaderPrograms.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="space-y-2">
            {profile.leaderPrograms.map(p => (
              <div key={p.programId} className="flex items-center gap-3 p-3 rounded-xl bg-asa-bg">
                <UserCog className="w-4 h-4 text-asa-primary shrink-0" />
                <p className="text-sm font-medium text-asa-text truncate">{p.programName}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assessment attempts */}
      <div className="bg-white rounded-2xl border border-asa-border shadow-subtle p-6">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="w-5 h-5 text-asa-primary" />
          <h2 className="font-semibold text-asa-text">Evaluaciones completadas</h2>
          <span className="ml-auto text-xs text-asa-muted">{profile.assessmentAttempts.length} intento{profile.assessmentAttempts.length !== 1 ? "s" : ""}</span>
        </div>

        {profile.assessmentAttempts.length === 0 ? (
          <div className="text-center py-6">
            <ClipboardList className="w-8 h-8 mx-auto text-asa-primary/30 mb-2" />
            <p className="text-sm text-asa-muted">Sin evaluaciones completadas.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {profile.assessmentAttempts.map((a, i) => {
              const score = formatScore(a.totalScore, a.assessmentType);
              return (
                <div key={`${a.assessmentId}-${i}`} className="flex items-center gap-3 p-3 rounded-xl bg-asa-bg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-asa-text truncate">{a.assessmentTitle}</p>
                    <p className="text-xs text-asa-muted">{a.programName} · {formatDate(a.submittedAt)}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${score.colorClass}`}>
                    {score.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
