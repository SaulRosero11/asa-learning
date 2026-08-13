"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BookOpen, Users, GraduationCap, ArrowRight, CheckCircle2,
  ClipboardList, TrendingUp, Clock, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/axios";
import { formatDate } from "@/lib/dates";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

interface CurrentUser { userId: string; email: string; roles: string[] }

interface GlobalAnalytics {
  totalStudents: number;
  activePrograms: number;
  completionRate: number;
  assessmentsCompleted: number;
  programStats: { programId: string; programName: string; enrollmentCount: number }[];
}

interface Program {
  id: string; name: string; description: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  startDate: string | null; endDate: string | null;
  imageUrl?: string | null;
}

interface PagedPrograms { content: Program[]; totalElements: number }

interface PendingActivity {
  type: string; referenceId: string; programId: string; programName: string;
  title: string; dueDate: string | null; attemptsUsed: number; maxAttempts: number;
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

const PROGRAM_COLORS = [
  ["#7147D3", "#F1ECFB"],
  ["#3B82F6", "#DBEAFE"],
  ["#10B981", "#D1FAE5"],
  ["#F59E0B", "#FEF3C7"],
  ["#EF4444", "#FEE2E2"],
  ["#8B5CF6", "#EDE9FE"],
];

function programColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return PROGRAM_COLORS[h % PROGRAM_COLORS.length];
}

function KpiCard({ label, value, icon, color }: {
  label: string; value: string | number; icon: React.ReactNode; color: string;
}) {
  return (
    <div
      className="bg-white rounded-2xl border border-asa-border flex items-center gap-5 p-6"
      style={{ boxShadow: "var(--shadow-subtle)" }}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-3xl font-bold text-asa-text tracking-tight leading-none">{value}</p>
        <p className="text-xs text-asa-muted mt-1.5 font-medium uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
}

// ── Admin / Leader Dashboard ───────────────────────────────────────────────────

function AdminDashboard({ analytics, isAdmin }: { analytics: GlobalAnalytics | undefined; isAdmin: boolean }) {
  const chartData = analytics?.programStats.slice(0, 8).map(p => ({
    name: p.programName.length > 14 ? p.programName.slice(0, 14) + "…" : p.programName,
    estudiantes: p.enrollmentCount,
  })) ?? [];

  return (
    <div className="space-y-6">
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Estudiantes totales" value={analytics.totalStudents}
            icon={<Users className="w-6 h-6 text-asa-primary" />} color="bg-asa-highlight" />
          <KpiCard label="Programas activos" value={analytics.activePrograms}
            icon={<BookOpen className="w-6 h-6 text-blue-600" />} color="bg-blue-50" />
          <KpiCard label="Tasa de finalización" value={`${analytics.completionRate}%`}
            icon={<CheckCircle2 className="w-6 h-6 text-green-600" />} color="bg-green-50" />
          <KpiCard label="Evaluaciones completadas" value={analytics.assessmentsCompleted}
            icon={<ClipboardList className="w-6 h-6 text-amber-600" />} color="bg-amber-50" />
        </div>
      )}

      {chartData.length > 0 && (
        <div
          className="bg-white rounded-2xl border border-asa-border p-6"
          style={{ boxShadow: "var(--shadow-subtle)" }}
        >
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-asa-primary" />
            <h2 className="font-semibold text-asa-text text-base tracking-tight">Estudiantes por programa</h2>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-asa-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-asa-muted)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-asa-muted)" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--color-asa-border)", fontSize: 12, boxShadow: "var(--shadow-card)" }}
                  formatter={(v: number) => [v, "Estudiantes"]}
                />
                <Bar dataKey="estudiantes" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? "#6B3FC8" : "#9B7CE8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/programs"
          className="bg-white rounded-2xl border border-asa-border p-6 flex items-start gap-4 transition-all duration-200 group hover:-translate-y-0.5"
          style={{ boxShadow: "var(--shadow-subtle)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(107,63,200,0.3)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-subtle)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--color-asa-border)"; }}
        >
          <div className="w-12 h-12 rounded-xl bg-asa-highlight flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6 text-asa-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-asa-text">Programas</h3>
            <p className="text-sm text-asa-muted mt-0.5">Gestiona los programas de capacitación</p>
          </div>
          <ArrowRight className="w-4 h-4 text-asa-muted group-hover:text-asa-primary transition-colors shrink-0 mt-1" />
        </Link>

        {isAdmin && (
          <Link
            href="/admin/users"
            className="bg-white rounded-2xl border border-asa-border p-6 flex items-start gap-4 transition-all duration-200 group hover:-translate-y-0.5"
            style={{ boxShadow: "var(--shadow-subtle)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(107,63,200,0.3)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-subtle)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--color-asa-border)"; }}
          >
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-asa-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-asa-text">Usuarios</h3>
              <p className="text-sm text-asa-muted mt-0.5">Administra roles y permisos</p>
            </div>
            <ArrowRight className="w-4 h-4 text-asa-muted group-hover:text-asa-primary transition-colors shrink-0 mt-1" />
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Student Dashboard ─────────────────────────────────────────────────────────

function StudentDashboard() {
  const { data: programsData, isLoading: loadingPrograms } = useQuery<PagedPrograms>({
    queryKey: ["my-programs"],
    queryFn: () => apiClient.get("/api/v1/programs?size=6").then(r => r.data),
  });

  const { data: pending, isLoading: loadingPending } = useQuery<PendingActivity[]>({
    queryKey: ["pending-activities"],
    queryFn: () => apiClient.get("/api/v1/analytics/me/pending").then(r => r.data),
  });

  const programs = programsData?.content ?? [];

  return (
    <div className="space-y-8">
      {/* Active programs */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-asa-text">Mis programas activos</h2>
          <Link href="/programs" className="text-sm text-asa-primary hover:underline flex items-center gap-1">
            Ver todos <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loadingPrograms ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-asa-border/40 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : programs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-asa-border shadow-subtle p-10 text-center">
            <GraduationCap className="w-10 h-10 mx-auto text-asa-primary/30 mb-3" />
            <p className="text-asa-muted text-sm">Aún no estás inscrito en ningún programa.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {programs.map(p => {
              const [accent, bg] = programColor(p.name);
              return (
                <Link
                  key={p.id}
                  href={`/programs/${p.id}`}
                  className="bg-white rounded-2xl border border-asa-border shadow-subtle overflow-hidden hover:shadow-card hover:border-asa-primary/20 transition-all group"
                >
                  <div
                    className="h-20 relative overflow-hidden"
                    style={p.imageUrl ? {} : { backgroundColor: bg }}
                  >
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="h-full flex items-center px-5">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                          style={{ backgroundColor: accent }}
                        >
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-asa-text text-sm leading-snug line-clamp-2 group-hover:text-asa-primary transition-colors">
                      {p.name}
                    </h3>
                    {p.endDate && (
                      <p className="text-xs text-asa-muted mt-1.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Hasta {formatDate(p.endDate)}
                      </p>
                    )}
                    <span className="mt-3 inline-flex items-center text-xs font-medium text-asa-primary">
                      Continuar <ArrowRight className="w-3 h-3 ml-1" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Pending activities */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-asa-text">Actividades pendientes</h2>
          {(pending?.length ?? 0) > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
              {pending!.length} pendiente{pending!.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {loadingPending ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-20 bg-asa-border/40 rounded-xl animate-pulse" />)}
          </div>
        ) : (pending?.length ?? 0) === 0 ? (
          <div className="bg-white rounded-2xl border border-asa-border shadow-subtle p-8 text-center">
            <CheckCircle2 className="w-9 h-9 mx-auto text-green-400 mb-2" />
            <p className="text-asa-muted text-sm">¡Al día! No tienes actividades pendientes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending!.map(a => (
              <div
                key={`${a.type}-${a.referenceId}`}
                className="bg-white rounded-xl border border-asa-border shadow-subtle p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-asa-text text-sm truncate">{a.title}</p>
                  <p className="text-xs text-asa-muted mt-0.5">{a.programName}</p>
                  {a.dueDate && (
                    <p className="text-xs text-amber-700 mt-0.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Vence: {formatDate(a.dueDate)}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-xs text-asa-muted">
                    {a.attemptsUsed}/{a.maxAttempts} intentos
                  </span>
                  <Link
                    href={`/programs/${a.programId}?tab=assessments`}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    Resolver
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: user } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: () => apiClient.get("/api/v1/auth/me").then(r => r.data as CurrentUser),
    staleTime: 5 * 60 * 1000,
  });

  const isAdmin  = user?.roles?.some(r => ["ADMIN", "SUPER_ADMIN"].includes(r)) ?? false;
  const isLeader = user?.roles?.some(r => ["ADMIN", "SUPER_ADMIN", "PROGRAM_LEADER"].includes(r)) ?? false;
  const isStudent = !isLeader;

  const { data: analytics } = useQuery<GlobalAnalytics>({
    queryKey: ["analytics-global"],
    queryFn: () => apiClient.get("/api/v1/analytics/global").then(r => r.data as GlobalAnalytics),
    enabled: isLeader,
  });

  return (
    <div className="space-y-8">
      {isLeader && <AdminDashboard analytics={analytics} isAdmin={isAdmin} />}
      {isStudent && <StudentDashboard />}
    </div>
  );
}
