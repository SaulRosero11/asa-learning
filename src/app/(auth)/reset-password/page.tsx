"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { apiClient } from "@/lib/axios";

const schema = z.object({
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

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-asa-bg p-8">
        <div className="panel text-center">
          <p className="text-asa-error">Enlace inválido. Solicita uno nuevo.</p>
          <a href="/forgot-password" className="btn-primary mt-4 inline-flex">Solicitar enlace</a>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      await apiClient.post("/api/v1/auth/reset-password", { token, newPassword: data.newPassword });
      router.push("/login?reset=success");
    } catch (error: any) {
      setServerError(error?.response?.data?.message ?? "Error al restablecer la contraseña");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-asa-bg p-8">
      <div className="w-full max-w-md panel">
        <h2 className="text-display text-asa-text mb-2">Nueva contraseña</h2>
        <p className="text-muted text-asa-muted mb-6">
          Crea una contraseña segura para tu cuenta.
        </p>

        <div className="mb-4 p-3 bg-asa-highlight rounded-component text-sm text-asa-muted">
          La contraseña debe tener: mínimo 8 caracteres, una mayúscula, una minúscula y un número.
        </div>

        {serverError && (
          <div className="mb-4 p-3 bg-red-50 border border-asa-error rounded-component text-sm text-asa-error">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-muted text-asa-text mb-1">Nueva contraseña</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} className="input-field pr-10"
                {...register("newPassword")} aria-invalid={!!errors.newPassword} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-asa-muted">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center">
            {isSubmitting ? "Guardando..." : "Guardar nueva contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
