"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, BookOpen, ClipboardList, MessageSquare, Users,
  Calendar, CheckCircle2, Clock, UserCog,
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/axios";
import { formatDate } from "@/lib/dates";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Program {
  id: string; name: string; description: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  startDate: string | null; endDate: string | null;
  imageUrl?: string | null;
}

interface CurrentUser { userId: string; email: string; roles: string[] }

// ── Sub-page imports (lazy to keep bundle light) ───────────────────────────────

import dynamic from "next/dynamic";

const ContentTab   = dynamic(() => import("./content/page").then(m => ({ default: m.default })), { ssr: false });
const AssessmentsTab = dynamic(() => import("./assessments/page").then(m => ({ default: m.default })), { ssr: false });
const CommunityTab = dynamic(() => import("./community/page").then(m => ({ default: m.default })), { ssr: false });
const StudentsTab  = dynamic(() => import("./_students").then(m => ({ default: m.StudentsTab })), { ssr: false });

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  DRAFT:    { label: "Borrador",  icon: <Clock className="w-3.5 h-3.5" />,        color: "text-amber-600 bg-amber-50" },
  ACTIVE:   { label: "Activo",    icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-green-700 bg-green-50" },
  ARCHIVED: { label: "Archivado", icon: <Clock className="w-3.5 h-3.5" />,        color: "text-gray-500 bg-gray-100" },
} as const;

// ── Tabs config ───────────────────────────────────────────────────────────────

type Tab = "content" | "assessments" | "community" | "students";

const ALL_TABS = [
  { id: "content"     as Tab, label: "Contenido",    icon: <BookOpen className="w-4 h-4" /> },
  { id: "assessments" as Tab, label: "Evaluaciones", icon: <ClipboardList className="w-4 h-4" /> },
  { id: "community"   as Tab, label: "Comunidad",    icon: <MessageSquare className="w-4 h-4" /> },
  { id: "students"    as Tab, label: "Gestión",      icon: <Users className="w-4 h-4" />, leaderOnly: true },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

interface Leader { id: string; email: string; firstName: string | null; lastName: string | null; }

export default function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: programId } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "content";
    const tab = new URLSearchParams(window.location.search).get("tab") as Tab;
    return tab && (["content", "assessments", "community", "students"] as Tab[]).includes(tab)
      ? tab : "content";
  });
  const [confirmClose, setConfirmClose] = useState(false);
  const queryClient = useQueryClient();

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    router.replace(`/programs/${programId}?tab=${tab}`, { scroll: false });
  };

  const { data: program, isLoading: loadingProgram } = useQuery<Program>({
    queryKey: ["program", programId],
    queryFn: () => apiClient.get(`/api/v1/programs/${programId}`).then(r => r.data),
  });

  const { data: leaders = [] } = useQuery<Leader[]>({
    queryKey: ["program-leaders", programId],
    queryFn: () => apiClient.get(`/api/v1/programs/${programId}/leaders`).then(r => r.data),
  });

  const { data: user } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: () => apiClient.get("/api/v1/auth/me").then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const isLeader = user?.roles?.some(r => ["PROGRAM_LEADER", "ADMIN", "SUPER_ADMIN"].includes(r)) ?? false;
  const isAdminOrSuperAdmin = user?.roles?.some(r => ["ADMIN", "SUPER_ADMIN"].includes(r)) ?? false;
  const isLeaderOfProgram = leaders.some(l => l.id === user?.userId);
  const canChangeStatus = isAdminOrSuperAdmin || isLeaderOfProgram;

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      apiClient.patch(`/api/v1/programs/${programId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program", programId] });
      setConfirmClose(false);
    },
  });

  const visibleTabs = ALL_TABS.filter(t => !t.leaderOnly || isLeader);

  if (loadingProgram) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-asa-border rounded w-48" />
        <div className="h-28 bg-asa-border rounded-2xl" />
        <div className="h-10 bg-asa-border rounded-xl w-96" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="panel text-center py-12">
        <p className="text-asa-muted">Programa no encontrado.</p>
        <Link href="/programs" className="btn-primary inline-flex mt-4">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
      </div>
    );
  }

  const sc = STATUS_CFG[program.status] ?? STATUS_CFG.DRAFT;

  return (
    <div className="space-y-6 -mt-1">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link
          href="/programs"
          className="text-asa-muted hover:text-asa-primary transition-colors duration-150"
        >
          Programas
        </Link>
        <span className="text-asa-border select-none">/</span>
        <span className="text-asa-text font-medium truncate max-w-xs">{program?.name ?? "…"}</span>
      </nav>

      {/* Program Header */}
      <div
        className="rounded-2xl border border-asa-border overflow-hidden relative"
        style={{ boxShadow: "var(--shadow-subtle)" }}
      >
        {/* Background image + left→right gradient (only when imageUrl present) */}
        {program.imageUrl && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${program.imageUrl})` }}
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to right, white 52%, rgba(255,255,255,0.08) 100%)" }}
            />
          </>
        )}

        {/* Content */}
        <div className={`relative p-7 ${!program.imageUrl ? "bg-white" : ""}`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${sc.color}`}>
                  {sc.icon} {sc.label}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-asa-text leading-tight tracking-tight">{program.name}</h1>
              {program.description && (
                <p className="text-sm text-asa-muted max-w-2xl leading-relaxed">{program.description}</p>
              )}
            </div>
            {canChangeStatus && (
              <div className="shrink-0">
                {program.status === "DRAFT" && (
                  <button
                    onClick={() => statusMutation.mutate("ACTIVE")}
                    disabled={statusMutation.isPending}
                    className="btn-primary text-sm"
                  >
                    {statusMutation.isPending ? "Activando…" : "Activar programa"}
                  </button>
                )}
                {program.status === "ACTIVE" && (
                  <button
                    onClick={() => setConfirmClose(true)}
                    className="text-sm px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors font-medium"
                  >
                    Cerrar programa
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4 mt-4">
            {(program.startDate || program.endDate) && (
              <div className="flex items-center gap-1.5 text-sm text-asa-muted">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>
                  {formatDate(program.startDate)}
                  {program.endDate && <> — {formatDate(program.endDate)}</>}
                </span>
              </div>
            )}
            {leaders.length > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-asa-muted">
                <UserCog className="w-4 h-4 shrink-0" />
                <span>
                  {leaders.map(l => l.firstName && l.lastName
                    ? `${l.firstName} ${l.lastName}`
                    : l.email
                  ).join(", ")}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-nav */}
      <div
        className="flex gap-1 bg-white rounded-xl p-1 w-fit"
        style={{ border: "1px solid var(--color-asa-border)", boxShadow: "var(--shadow-subtle)" }}
      >
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
              ${activeTab === tab.id
                ? "text-white"
                : "text-asa-muted hover:text-asa-text hover:bg-asa-bg"
              }
            `}
            style={activeTab === tab.id
              ? { backgroundColor: "var(--color-asa-primary)", boxShadow: "0 1px 6px rgba(107,63,200,0.35)" }
              : undefined
            }
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content — pass programId via URL reuse */}
      <div className="min-h-[400px]">
        {activeTab === "content"      && <ContentTabWrapper programId={programId} params={params} />}
        {activeTab === "assessments"  && <AssessmentsTabWrapper programId={programId} params={params} />}
        {activeTab === "community"    && <CommunityTabWrapper programId={programId} params={params} />}
        {activeTab === "students"     && <StudentsTab programId={programId} isAdmin={isAdminOrSuperAdmin} />}
      </div>

      <ConfirmDialog
        open={confirmClose}
        title="¿Cerrar programa?"
        description={`El programa "${program.name}" pasará a estado Cerrado. Los estudiantes ya matriculados seguirán teniendo acceso al contenido, pero no se podrán aceptar nuevas matrículas.`}
        confirmLabel="Cerrar programa"
        destructive
        isPending={statusMutation.isPending}
        onConfirm={() => statusMutation.mutate("CLOSED")}
        onCancel={() => setConfirmClose(false)}
      />
    </div>
  );
}

// ── Tab wrappers that pass the correct params shape ───────────────────────────

function ContentTabWrapper({ programId, params }: { programId: string; params: Promise<{ id: string }> }) {
  return <ContentTab params={params} />;
}

function AssessmentsTabWrapper({ programId, params }: { programId: string; params: Promise<{ id: string }> }) {
  return <AssessmentsTab params={params} />;
}

function CommunityTabWrapper({ programId, params }: { programId: string; params: Promise<{ id: string }> }) {
  return <CommunityTab params={params} />;
}
