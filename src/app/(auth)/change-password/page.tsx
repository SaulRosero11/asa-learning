"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { apiClient } from "@/lib/axios";

const schema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[a-z]/, "Debe contener al menos una minúscula")
    .regex(/[0-9]/, "Debe contener al menos un número"),
  confirmPassword: z.string().min(1, "Confirma tu contraseña"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});
type FormData = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      await apiClient.post("/api/v1/auth/change-password", {
        currentPassword: data.currentPassword || null,
        newPassword: data.newPassword,
      });
      router.push("/dashboard");
    } catch (error: any) {
      setServerError(error?.response?.data?.message ?? "Error al cambiar la contraseña");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-asa-bg p-8">
      <div className="w-full max-w-md panel">
        <div className="mb-6 p-4 bg-asa-highlight rounded-panel border border-asa-primary/20">
          <h2 className="text-heading text-asa-primary mb-1">Acción requerida</h2>
          <p className="text-muted text-asa-muted">
            Por seguridad, debes crear una nueva contraseña antes de continuar.
          </p>
        </div>

        <h3 className="text-heading text-asa-text mb-6">Establecer nueva contraseña</h3>

        {serverError && (
          <div className="mb-4 p-3 bg-red-50 border border-asa-error rounded-component text-sm text-asa-error">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-muted text-asa-text mb-1">Nueva contraseña</label>
            <div className="relative">
              <input type={showNew ? "text" : "password"} className="input-field pr-10"
                {...register("newPassword")} aria-invalid={!!errors.newPassword} />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-asa-muted">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.newPassword && <p className="mt-1 text-sm text-asa-error">{errors.newPassword.message}</p>}
          </div>
          <div>
            <label className="block text-muted text-asa-text mb-1">Confirmar contraseña</label>
            <input type="password" className="input-field" {...register("confirmPassword")}
              aria-invalid={!!errors.confirmPassword} />
            {errors.confirmPassword && <p className="mt-1 text-sm text-asa-error">{errors.confirmPassword.message}</p>}
          </div>
          <div className="text-sm text-asa-muted">
            Requisitos: mínimo 8 caracteres · una mayúscula · una minúscula · un número
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center">
            {isSubmitting ? "Guardando..." : "Establecer contraseña y continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}
