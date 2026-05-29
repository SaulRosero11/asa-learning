"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, CheckCircle2, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/axios";
import { formatDate } from "@/lib/dates";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Student {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  onboardingCompleted: boolean;
  enrollmentCount: number;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StudentsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery<{ content: Student[]; totalElements: number }>({
    queryKey: ["admin-students", debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams({ size: "50" });
      if (debouncedSearch) params.set("q", debouncedSearch);
      return apiClient.get(`/api/v1/admin/students?${params}`).then(r => r.data);
    },
  });

  const students = data?.content ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-asa-text">Estudiantes</h1>
          <p className="text-sm text-asa-muted mt-0.5">
            {data?.totalElements ?? 0} estudiante{(data?.totalElements ?? 0) !== 1 ? "s" : ""} registrado{(data?.totalElements ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-asa-muted" />
        <input
          type="text"
          className="input-field pl-10"
          placeholder="Buscar por nombre o correo…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-asa-border shadow-subtle overflow-hidden">
        {isLoading ? (
          <div className="space-y-px">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-asa-border/30 animate-pulse" />
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-10 h-10 text-asa-primary/30 mb-3" />
            <p className="text-asa-muted text-sm">
              {debouncedSearch ? `Sin resultados para "${debouncedSearch}"` : "No hay estudiantes registrados."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-asa-border bg-asa-bg">
                <th className="text-left px-5 py-3 text-xs font-semibold text-asa-muted uppercase tracking-wide">Estudiante</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-asa-muted uppercase tracking-wide">Programas</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-asa-muted uppercase tracking-wide">Onboarding</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-asa-muted uppercase tracking-wide">Registrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-asa-border">
              {students.map(s => {
                const fullName = s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : null;
                return (
                  <tr
                    key={s.id}
                    onClick={() => router.push(`/admin/students/${s.id}`)}
                    className="hover:bg-asa-bg transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-asa-highlight flex items-center justify-center text-xs font-bold text-asa-primary shrink-0">
                          {s.email.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          {fullName && <p className="font-medium text-asa-text truncate">{fullName}</p>}
                          <p className={`truncate ${fullName ? "text-xs text-asa-muted" : "font-medium text-asa-text"}`}>{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-asa-text font-medium">{s.enrollmentCount}</span>
                      <span className="text-asa-muted ml-1">programa{s.enrollmentCount !== 1 ? "s" : ""}</span>
                    </td>
                    <td className="px-5 py-4">
                      {s.onboardingCompleted ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full w-fit">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full w-fit">
                          <Clock className="w-3.5 h-3.5" /> Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-asa-muted text-xs">{formatDate(s.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
