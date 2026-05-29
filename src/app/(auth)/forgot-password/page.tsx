"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiClient } from "@/lib/axios";

const schema = z.object({
  email: z.string().email("Correo inválido").min(1, "El correo es obligatorio"),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await apiClient.post("/api/v1/auth/forgot-password", data);
    } catch {
      // Silenciar error — respuesta siempre genérica
    } finally {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-asa-bg p-8">
      <div className="w-full max-w-md panel">
        <h2 className="text-display text-asa-text mb-2">¿Olvidaste tu contraseña?</h2>

        {submitted ? (
          <div className="text-center py-6">
            <p className="text-body text-asa-text mb-2">
              Si el correo existe en el sistema, recibirás un enlace para restablecer tu contraseña.
            </p>
            <p className="text-muted text-asa-muted">Revisa también tu carpeta de spam.</p>
            <a href="/login" className="btn-primary mt-6 inline-flex">
              Volver al inicio de sesión
            </a>
          </div>
        ) : (
          <>
            <p className="text-muted text-asa-muted mb-6">
              Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-muted text-asa-text mb-1">
                  Correo electrónico
                </label>
                <input id="email" type="email" className="input-field"
                  placeholder="tu@email.com" {...register("email")}
                  aria-invalid={!!errors.email} />
                {errors.email && <p className="mt-1 text-sm text-asa-error">{errors.email.message}</p>}
              </div>
              <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center">
                {isSubmitting ? "Enviando..." : "Enviar enlace"}
              </button>
            </form>
            <div className="mt-4 text-center">
              <a href="/login" className="text-muted text-asa-primary hover:underline">
                Volver al inicio de sesión
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
