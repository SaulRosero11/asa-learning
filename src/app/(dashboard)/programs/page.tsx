"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Calendar, BookOpen, MoreVertical, Edit3, Archive,
  GraduationCap,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { apiClient } from "@/lib/axios";
import { Drawer } from "@/components/Drawer";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toISODateTime, toDateInput, formatDate } from "@/lib/dates";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Program {
  id: string; name: string; description: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  startDate: string | null; endDate: string | null; createdAt: string;
  imageUrl?: string | null;
}

interface CurrentUser { userId: string; email: string; roles: string[] }

// ── Schemas ───────────────────────────────────────────────────────────────────

const programSchema = z
  .object({
    name: z.string().min(3, "Mínimo 3 caracteres"),
    description: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    imageUrl: z.string().optional(),
  })
  .refine(
    (d) => {
      if (d.startDate && d.endDate && d.endDate < d.startDate) return false;
      return true;
    },
    { message: "La fecha de fin no puede ser anterior a la fecha de inicio", path: ["endDate"] }
  );

type ProgramForm = z.infer<typeof programSchema>;

// ── Card accent color (deterministic por nombre) ──────────────────────────────

const CARD_COLORS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-orange-400 to-rose-500",
  "from-pink-500 to-fuchsia-600",
  "from-amber-400 to-orange-500",
];

function cardColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length];
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  DRAFT:    { label: "Borrador",   bg: "bg-amber-50 text-amber-700" },
  ACTIVE:   { label: "Activo",     bg: "bg-green-50 text-green-700" },
  ARCHIVED: { label: "Archivado",  bg: "bg-gray-100 text-gray-500" },
} as const;

// ── Program Form ──────────────────────────────────────────────────────────────

function ProgramForm({
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
  isEdit,
}: {
  defaultValues?: Partial<ProgramForm>;
  onSubmit: (data: ProgramForm) => void;
  isPending: boolean;
  onCancel: () => void;
  isEdit?: boolean;
}) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ProgramForm>({
    resolver: zodResolver(programSchema),
    defaultValues,
  });
  const watchedStartDate = watch("startDate");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-asa-text mb-1.5">Nombre del programa *</label>
        <input className="input-field" placeholder="Ej. Capacitación Digital 2026" {...register("name")} />
        {errors.name && <p className="mt-1 text-xs text-asa-error">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-asa-text mb-1.5">Descripción</label>
        <textarea className="input-field resize-none" rows={3}
          placeholder="Describe los objetivos del programa..." {...register("description")} />
      </div>

      <div>
        <label className="block text-sm font-medium text-asa-text mb-1.5">URL de imagen <span className="text-asa-muted font-normal">(opcional)</span></label>
        <input className="input-field" placeholder="https://ejemplo.com/imagen.jpg" {...register("imageUrl")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-asa-text mb-1.5">Fecha de inicio</label>
          <input type="date" className="input-field" {...register("startDate")} />
        </div>
        <div>
          <label className="block text-sm font-medium text-asa-text mb-1.5">Fecha de fin</label>
          <input type="date" className="input-field" min={watchedStartDate || undefined} {...register("endDate")} />
          {errors.endDate && <p className="mt-1 text-xs text-asa-error">{errors.endDate.message}</p>}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-outline flex-1 justify-center">
          Cancelar
        </button>
        <button type="submit" disabled={isPending} className="btn-primary flex-1 justify-center">
          {isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear programa"}
        </button>
      </div>
    </form>
  );
}

// ── Program Card ──────────────────────────────────────────────────────────────

function ProgramCard({
  program, isLeader, onEdit,
}: {
  program: Program;
  isLeader: boolean;
  onEdit: (p: Program) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const queryClient = useQueryClient();
  const sc = STATUS_CFG[program.status] ?? STATUS_CFG.DRAFT;
  const color = cardColor(program.name);

  const archiveMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/programs/${program.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setConfirmArchive(false);
    },
  });

  return (
    <div
      className="bg-white rounded-2xl border border-asa-border group transition-all duration-200 hover:-translate-y-1 relative"
      style={{ boxShadow: "var(--shadow-subtle)" }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = "var(--shadow-elevated)")}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = "var(--shadow-subtle)")}
    >
      <div
        className={`h-24 relative overflow-hidden rounded-t-2xl ${program.imageUrl ? "" : `bg-gradient-to-br ${color}`}`}
      >
        {program.imageUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${program.imageUrl})` }}
          />
        )}
        <div className="absolute inset-0 flex items-end p-4">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${program.imageUrl ? "bg-white text-asa-text shadow-sm" : "bg-white/20 text-white backdrop-blur-sm"}`}>
            {sc.label}
          </span>
        </div>
      </div>

      {isLeader && (
        <div className="absolute top-3 right-3 z-20">
          <button
            onClick={(e) => { e.preventDefault(); setMenuOpen(v => !v); }}
            className="w-8 h-8 rounded-full bg-white/85 backdrop-blur-sm text-asa-text hover:bg-white flex items-center justify-center transition-colors shadow-sm"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-9 bg-white border border-asa-border rounded-xl shadow-card z-20 min-w-[140px] py-1"
              style={{ animation: "slideUpFade 160ms cubic-bezier(0.32, 0.72, 0, 1)", transformOrigin: "top right" }}
            >
              <button
                onClick={() => { onEdit(program); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-asa-text hover:bg-asa-bg flex items-center gap-2"
              >
                <Edit3 className="w-3.5 h-3.5" /> Editar
              </button>
              <button
                onClick={() => { setConfirmArchive(true); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-asa-error hover:bg-red-50 flex items-center gap-2"
              >
                <Archive className="w-3.5 h-3.5" /> Archivar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-asa-text leading-tight line-clamp-2">{program.name}</h3>

        {program.description && (
          <p className="text-xs text-asa-muted line-clamp-2">{program.description}</p>
        )}

        {(program.startDate || program.endDate) && (
          <div className="flex items-center gap-1.5 text-xs text-asa-muted">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>
              {formatDate(program.startDate)}
              {program.endDate && ` — ${formatDate(program.endDate)}`}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Link
            href={`/programs/${program.id}`}
            className="btn-primary text-xs flex-1 justify-center"
          >
            <BookOpen className="w-3.5 h-3.5" /> Ver programa
          </Link>
        </div>
      </div>

      <ConfirmDialog
        open={confirmArchive}
        title="¿Archivar programa?"
        description={`El programa "${program.name}" quedará archivado y no estará disponible para los estudiantes.`}
        confirmLabel="Archivar"
        destructive
        isPending={archiveMutation.isPending}
        onConfirm={() => archiveMutation.mutate()}
        onCancel={() => setConfirmArchive(false)}
      />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProgramsPage() {
  const queryClient = useQueryClient();
  const [drawerMode, setDrawerMode] = useState<"create" | "edit" | null>(null);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  const { data: user } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: () => apiClient.get("/api/v1/auth/me").then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: () => apiClient.get("/api/v1/programs?size=50").then(r => r.data.content as Program[]),
  });

  const isLeader = user?.roles?.some(r => ["PROGRAM_LEADER", "ADMIN", "SUPER_ADMIN"].includes(r)) ?? false;

  const createMutation = useMutation({
    mutationFn: (data: ProgramForm) =>
      apiClient.post("/api/v1/programs", {
        ...data,
        startDate: toISODateTime(data.startDate),
        endDate: toISODateTime(data.endDate, true),
        imageUrl: data.imageUrl || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setDrawerMode(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ProgramForm) =>
      apiClient.put(`/api/v1/programs/${editingProgram!.id}`, {
        ...data,
        startDate: toISODateTime(data.startDate),
        endDate: toISODateTime(data.endDate, true),
        imageUrl: data.imageUrl || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setDrawerMode(null);
      setEditingProgram(null);
    },
  });

  const openEdit = (p: Program) => {
    setEditingProgram(p);
    setDrawerMode("edit");
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-asa-text tracking-tight">Programas</h1>
          <p className="text-sm text-asa-muted mt-0.5">
            {programs.length} programa{programs.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isLeader && (
          <button onClick={() => setDrawerMode("create")} className="btn-primary">
            <Plus className="w-4 h-4" /> Nuevo programa
          </button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-56 bg-asa-border rounded-2xl animate-pulse" />)}
        </div>
      ) : programs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-asa-highlight flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-asa-primary" />
          </div>
          <h3 className="text-lg font-semibold text-asa-text mb-2">Sin programas aún</h3>
          <p className="text-sm text-asa-muted mb-6">
            {isLeader ? "Crea tu primer programa de capacitación." : "Aún no estás matriculado en ningún programa."}
          </p>
          {isLeader && (
            <button onClick={() => setDrawerMode("create")} className="btn-primary">
              <Plus className="w-4 h-4" /> Crear programa
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map(p => (
            <ProgramCard
              key={p.id} program={p} isLeader={isLeader}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      {/* Drawer: Crear programa */}
      <Drawer
        open={drawerMode === "create"}
        onClose={() => setDrawerMode(null)}
        title="Nuevo programa"
      >
        <ProgramForm
          onSubmit={data => createMutation.mutate(data)}
          isPending={createMutation.isPending}
          onCancel={() => setDrawerMode(null)}
        />
      </Drawer>

      {/* Drawer: Editar programa */}
      <Drawer
        open={drawerMode === "edit"}
        onClose={() => { setDrawerMode(null); setEditingProgram(null); }}
        title="Editar programa"
      >
        {editingProgram && (
          <ProgramForm
            isEdit
            defaultValues={{
              name: editingProgram.name,
              description: editingProgram.description,
              startDate: toDateInput(editingProgram.startDate),
              endDate: toDateInput(editingProgram.endDate),
              imageUrl: editingProgram.imageUrl ?? "",
            }}
            onSubmit={data => updateMutation.mutate(data)}
            isPending={updateMutation.isPending}
            onCancel={() => { setDrawerMode(null); setEditingProgram(null); }}
          />
        )}
      </Drawer>

    </div>
  );
}
