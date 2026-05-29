"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  GraduationCap, CheckCircle2, AlertCircle, Clock,
} from "lucide-react";
import { apiClient } from "@/lib/axios";

// ── Types ─────────────────────────────────────────────────────────────────────

interface InvitationValidation {
  email: string;
  programName: string;
  programId: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED";
  userExists: boolean;
  expiresAt: string;
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  password: z.string().min(1, "Contraseña requerida"),
});

const registerSchema = z.object({
  firstName: z.string().min(2, "Mínimo 2 caracteres"),
  lastName:  z.string().min(2, "Mínimo 2 caracteres"),
  password:  z.string().min(8, "Mínimo 8 caracteres"),
});

// ── Sub-components ─────────────────────────────────────────────────────────────

function LoginFromInvite({
  email, token, programId,
}: { email: string; token: string; programId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: { password: string }) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.post("/api/v1/auth/login", { email, password: data.password, rememberDevice: false });
      await apiClient.post("/api/v1/invitations/redeem", { token });
      router.push(`/programs/${programId}`);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Credenciales incorrectas. Inténtalo de nuevo.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-asa-text mb-1.5">Correo electrónico</label>
        <input value={email} readOnly className="input-field bg-asa-bg text-asa-muted cursor-not-allowed" />
      </div>
      <div>
        <label className="block text-sm font-medium text-asa-text mb-1.5">Contraseña</label>
        <input
          {...register("password")}
          type="password"
          placeholder="Tu contraseña"
          className={`input-field ${errors.password ? "error" : ""}`}
          autoFocus
        />
        {errors.password && <p className="text-xs text-asa-error mt-1">{errors.password.message}</p>}
      </div>
      {error && (
        <p className="text-xs text-asa-error bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
      <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
        {loading ? "Iniciando sesión..." : "Iniciar sesión y unirme"}
      </button>
    </form>
  );
}

function RegisterFromInvite({
  email, token, programId,
}: { email: string; token: string; programId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [switchToLogin, setSwitchToLogin] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
  });

  if (switchToLogin) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          Esta cuenta ya fue registrada. Inicia sesión para continuar.
        </div>
        <LoginFromInvite email={email} token={token} programId={programId} />
      </div>
    );
  }

  const onSubmit = async (data: { firstName: string; lastName: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.post("/api/v1/auth/register", {
        firstName: data.firstName,
        lastName: data.lastName,
        email,
        password: data.password,
      });
      await apiClient.post("/api/v1/invitations/redeem", { token });
      router.push("/onboarding");
    } catch (e: any) {
      if (e?.response?.status === 409) {
        setSwitchToLogin(true);
      } else {
        setError(e?.response?.data?.message ?? "Error al crear la cuenta. Inténtalo de nuevo.");
        setLoading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-asa-text mb-1.5">Nombre</label>
          <input
            {...register("firstName")}
            type="text"
            placeholder="Tu nombre"
            className={`input-field ${errors.firstName ? "error" : ""}`}
          />
          {errors.firstName && <p className="text-xs text-asa-error mt-1">{errors.firstName.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-asa-text mb-1.5">Apellido</label>
          <input
            {...register("lastName")}
            type="text"
            placeholder="Tu apellido"
            className={`input-field ${errors.lastName ? "error" : ""}`}
          />
          {errors.lastName && <p className="text-xs text-asa-error mt-1">{errors.lastName.message}</p>}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-asa-text mb-1.5">Correo electrónico</label>
        <input value={email} readOnly className="input-field bg-asa-bg text-asa-muted cursor-not-allowed" />
      </div>
      <div>
        <label className="block text-sm font-medium text-asa-text mb-1.5">Contraseña</label>
        <input
          {...register("password")}
          type="password"
          placeholder="Mínimo 8 caracteres"
          className={`input-field ${errors.password ? "error" : ""}`}
        />
        {errors.password && <p className="text-xs text-asa-error mt-1">{errors.password.message}</p>}
      </div>
      {error && (
        <p className="text-xs text-asa-error bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
      <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
        {loading ? "Creando cuenta..." : "Crear cuenta y unirme"}
      </button>
    </form>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const { data: invite, isLoading, isError } = useQuery<InvitationValidation>({
    queryKey: ["invite-validate", token],
    queryFn: () => apiClient.get(`/api/v1/invitations/validate/${token}`).then(r => r.data),
    retry: false,
  });

  return (
    <div className="min-h-screen bg-asa-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-asa-primary flex items-center justify-center shadow-sm">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-asa-text">ASA E-Learning</span>
        </div>

        <div className="bg-white rounded-2xl shadow-subtle border border-asa-border p-8">

          {/* Loading */}
          {isLoading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-6 bg-asa-border rounded w-3/4 mx-auto" />
              <div className="h-4 bg-asa-border rounded w-1/2 mx-auto" />
              <div className="h-10 bg-asa-border rounded" />
            </div>
          )}

          {/* Error / not found */}
          {isError && (
            <div className="text-center py-4">
              <AlertCircle className="w-12 h-12 mx-auto text-asa-error mb-3" />
              <h2 className="text-lg font-semibold text-asa-text mb-1">Invitación no encontrada</h2>
              <p className="text-sm text-asa-muted">Este enlace no es válido o ya no existe.</p>
            </div>
          )}

          {/* ACCEPTED */}
          {invite?.status === "ACCEPTED" && (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-3" />
              <h2 className="text-lg font-semibold text-asa-text mb-1">¡Ya estás matriculado!</h2>
              <p className="text-sm text-asa-muted mb-6">
                Estás inscrito en <strong>{invite.programName}</strong>.
              </p>
              <a href={`/programs/${invite.programId}`} className="btn-primary w-full justify-center">
                Ir al programa
              </a>
            </div>
          )}

          {/* EXPIRED */}
          {invite?.status === "EXPIRED" && (
            <div className="text-center py-4">
              <Clock className="w-12 h-12 mx-auto text-asa-muted mb-3" />
              <h2 className="text-lg font-semibold text-asa-text mb-1">Invitación vencida</h2>
              <p className="text-sm text-asa-muted">
                Este enlace ha expirado. Contacta al administrador del programa para recibir uno nuevo.
              </p>
            </div>
          )}

          {/* PENDING */}
          {invite?.status === "PENDING" && (
            <>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-asa-text mb-1">
                  {invite.userExists ? "Inicia sesión" : "Crea tu cuenta"}
                </h2>
                <p className="text-sm text-asa-muted">
                  Para unirte a <strong className="text-asa-text">{invite.programName}</strong>
                </p>
              </div>

              {invite.userExists
                ? <LoginFromInvite email={invite.email} token={token} programId={invite.programId} />
                : <RegisterFromInvite email={invite.email} token={token} programId={invite.programId} />
              }
            </>
          )}

        </div>
      </div>
    </div>
  );
}
