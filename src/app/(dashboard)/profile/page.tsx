"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Pencil, X, Check, Phone, Mail, User, Shield, Clock,
  BookOpen, GraduationCap, History,
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/axios";

// ── Validación Ecuador ─────────────────────────────────────────────────────────

const ecuadorPhone = z
  .string()
  .regex(/^0[2-9]\d{8}$/, "Número ecuatoriano de 10 dígitos (ej: 0991234567)")
  .or(z.literal(""))
  .optional();

const profileSchema = z.object({
  firstName: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(50, "Máximo 50 caracteres")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/, "Solo se permiten letras"),
  lastName: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(50, "Máximo 50 caracteres")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/, "Solo se permiten letras"),
  phoneNumber: ecuadorPhone,
});

type ProfileFormData = z.infer<typeof profileSchema>;

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:    "Super Administrador",
  ADMIN:          "Administrador",
  PROGRAM_LEADER: "Líder de Programa",
  STUDENT:        "Estudiante",
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN:    "bg-purple-100 text-purple-700",
  ADMIN:          "bg-asa-highlight text-asa-primary",
  PROGRAM_LEADER: "bg-blue-50 text-blue-700",
  STUDENT:        "bg-gray-100 text-gray-600",
};

async function fetchProfile() {
  const res = await apiClient.get("/api/v1/users/profile");
  return res.data;
}

async function fetchHistory() {
  const res = await apiClient.get("/api/v1/analytics/me/history");
  return res.data;
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: profile, isLoading } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const { data: history } = useQuery({ queryKey: ["my-history"], queryFn: fetchHistory });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({ resolver: zodResolver(profileSchema) });

  const mutation = useMutation({
    mutationFn: (data: ProfileFormData) =>
      apiClient.put("/api/v1/users/profile", {
        ...data,
        phoneNumber: data.phoneNumber || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const startEditing = () => {
    reset({
      firstName:   profile?.firstName  ?? "",
      lastName:    profile?.lastName   ?? "",
      phoneNumber: profile?.phoneNumber ?? "",
    });
    setEditing(true);
  };

  // Stats from history
  const enrollmentCount   = history?.enrollments?.length ?? 0;
  const completedCount    = history?.enrollments?.filter((e: any) => e.status === "COMPLETED").length ?? 0;
  const totalAttempts     = history?.enrollments?.reduce((sum: number, e: any) => sum + (e.attempts?.length ?? 0), 0) ?? 0;

  const initials = profile?.firstName && profile?.lastName
    ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
    : profile?.email?.slice(0, 2).toUpperCase() ?? "??";

  const fullName = profile?.firstName && profile?.lastName
    ? `${profile.firstName} ${profile.lastName}`
    : null;

  const primaryRole = ["SUPER_ADMIN", "ADMIN", "PROGRAM_LEADER", "STUDENT"].find(
    (r) => profile?.roles?.includes(r)
  );

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-48 bg-asa-border/30 rounded-2xl" />
        <div className="h-64 bg-asa-border/30 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Saved toast */}
      {saved && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-elevated text-sm font-medium flex items-center gap-2">
          <Check className="w-4 h-4" /> Perfil actualizado correctamente
        </div>
      )}

      {/* Header card — avatar + datos principales */}
      <div
        className="bg-white rounded-2xl border border-asa-border overflow-hidden"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* Banner decorativo */}
        <div className="h-28 bg-gradient-to-r from-asa-primary to-purple-400 relative">
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)" }} />
        </div>

        {/* Avatar + info */}
        <div className="px-8 pb-6">
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div
              className="w-20 h-20 rounded-2xl bg-asa-primary border-4 border-white flex items-center justify-center text-2xl font-bold text-white shrink-0"
              style={{ boxShadow: "0 4px 16px rgba(107,63,200,0.35)" }}
            >
              {initials}
            </div>
            {!editing && (
              <button onClick={startEditing} className="btn-outline text-sm">
                <Pencil className="w-3.5 h-3.5" /> Editar perfil
              </button>
            )}
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-asa-text">
              {fullName ?? profile?.email ?? "Mi Perfil"}
            </h1>
            {fullName && (
              <p className="text-sm text-asa-muted">{profile?.email}</p>
            )}
            {/* Role badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              {profile?.roles?.map((role: string) => (
                <span
                  key={role}
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[role] ?? "bg-gray-100 text-gray-600"}`}
                >
                  <Shield className="w-3 h-3" />
                  {ROLE_LABELS[role] ?? role}
                </span>
              ))}
              {profile?.adminEligible && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-asa-highlight text-asa-primary">
                  Dominio ASA
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: <BookOpen className="w-5 h-5" />, value: enrollmentCount, label: "Programas", color: "text-asa-primary" },
          { icon: <GraduationCap className="w-5 h-5" />, value: completedCount, label: "Completados", color: "text-green-600" },
          { icon: <Clock className="w-5 h-5" />, value: totalAttempts, label: "Evaluaciones", color: "text-blue-600" },
        ].map(({ icon, value, label, color }) => (
          <div
            key={label}
            className="bg-white rounded-2xl border border-asa-border p-5 text-center"
            style={{ boxShadow: "var(--shadow-subtle)" }}
          >
            <div className={`flex justify-center mb-2 ${color}`}>{icon}</div>
            <p className="text-2xl font-bold text-asa-text">{value}</p>
            <p className="text-xs text-asa-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Datos / Formulario */}
      <div className="bg-white rounded-2xl border border-asa-border p-6" style={{ boxShadow: "var(--shadow-subtle)" }}>
        <div className="flex items-center gap-2 mb-5">
          <User className="w-4 h-4 text-asa-primary" />
          <h2 className="font-semibold text-asa-text">Información personal</h2>
        </div>

        {editing ? (
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-asa-text mb-1">
                  Nombre <span className="text-asa-error">*</span>
                </label>
                <input
                  className={`input-field ${errors.firstName ? "error" : ""}`}
                  placeholder="Tu nombre"
                  {...register("firstName")}
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-asa-error">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-asa-text mb-1">
                  Apellido <span className="text-asa-error">*</span>
                </label>
                <input
                  className={`input-field ${errors.lastName ? "error" : ""}`}
                  placeholder="Tu apellido"
                  {...register("lastName")}
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-asa-error">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-asa-text mb-1">
                Teléfono
                <span className="text-xs text-asa-muted font-normal ml-1.5">(10 dígitos Ecuador)</span>
              </label>
              <input
                className={`input-field ${errors.phoneNumber ? "error" : ""}`}
                placeholder="0991234567"
                maxLength={10}
                {...register("phoneNumber")}
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-xs text-asa-error">{errors.phoneNumber.message}</p>
              )}
              <p className="mt-1 text-xs text-asa-muted">Celular: 09XXXXXXXX · Fijo: 0X-XXXXXXX</p>
            </div>

            {mutation.isError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-asa-error">
                Error al guardar los cambios. Inténtalo de nuevo.
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditing(false)} className="btn-outline">
                <X className="w-4 h-4" /> Cancelar
              </button>
              <button type="submit" disabled={mutation.isPending} className="btn-primary">
                <Check className="w-4 h-4" />
                {mutation.isPending ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              {
                icon: <Mail className="w-4 h-4 text-asa-muted" />,
                label: "Correo electrónico",
                value: profile?.email,
              },
              {
                icon: <User className="w-4 h-4 text-asa-muted" />,
                label: "Nombre",
                value: profile?.firstName ?? "—",
              },
              {
                icon: <User className="w-4 h-4 text-asa-muted" />,
                label: "Apellido",
                value: profile?.lastName ?? "—",
              },
              {
                icon: <Phone className="w-4 h-4 text-asa-muted" />,
                label: "Teléfono",
                value: profile?.phoneNumber ?? "—",
              },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{icon}</div>
                <div>
                  <dt className="text-xs text-asa-muted mb-0.5">{label}</dt>
                  <dd className="text-sm font-medium text-asa-text">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Link al historial */}
      <Link
        href="/profile/history"
        className="flex items-center gap-3 bg-white rounded-2xl border border-asa-border p-5 hover:border-asa-primary/40 hover:shadow-card transition-all group"
        style={{ boxShadow: "var(--shadow-subtle)" }}
      >
        <div className="w-10 h-10 rounded-xl bg-asa-highlight flex items-center justify-center group-hover:bg-asa-primary/10 transition-colors">
          <History className="w-5 h-5 text-asa-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-asa-text text-sm">Mi historial de aprendizaje</p>
          <p className="text-xs text-asa-muted mt-0.5">Ver programas completados y evaluaciones</p>
        </div>
        <span className="text-asa-muted group-hover:text-asa-primary transition-colors">→</span>
      </Link>
    </div>
  );
}
