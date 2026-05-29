"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { apiClient } from "@/lib/axios";

const loginSchema = z.object({
  email: z.string().email("Correo inválido").min(1, "El correo es obligatorio"),
  password: z.string().min(1, "La contraseña es obligatoria"),
  rememberDevice: z.boolean(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberDevice: false },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      const response = await apiClient.post("/api/v1/auth/login", data);
      const user = response.data;

      if (user.mustChangePassword) {
        router.push("/change-password");
      } else if (!user.onboardingCompleted) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? "Credenciales inválidas";
      setServerError(msg);
    }
  };

  const handleGoogleLogin = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
    window.location.href = `${backendUrl}/oauth2/authorization/google`;
  };

  return (
    <div className="min-h-screen flex">
      {/* Mitad izquierda — imagen/branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-asa-primary flex-col justify-center items-center p-12">
        <div className="text-white text-center">
          <h1 className="text-4xl font-bold mb-4">ASA E-Learning</h1>
          <p className="text-lg opacity-80 max-w-sm">
            Plataforma de capacitación de la ONG Solidaridad y Acción
          </p>
        </div>
      </div>

      {/* Mitad derecha — formulario */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-asa-bg">
        <div className="w-full max-w-md">
          <div className="panel">
            <h2 className="text-display text-asa-text mb-2">Iniciar sesión</h2>
            <p className="text-muted text-asa-muted mb-8">
              Accede a tu cuenta de ASA E-Learning
            </p>

            {/* Botón Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 btn-outline mb-6"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar con Google
            </button>

            <div className="flex items-center gap-4 mb-6">
              <hr className="flex-1 border-asa-border" />
              <span className="text-label text-asa-muted">o</span>
              <hr className="flex-1 border-asa-border" />
            </div>

            {/* Formulario Email/Contraseña */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {serverError && (
                <div className="p-3 bg-red-50 border border-asa-error rounded-component text-sm text-asa-error">
                  {serverError}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-muted text-asa-text mb-1">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  className="input-field"
                  placeholder="tu@email.com"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-asa-error">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-muted text-asa-text mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="input-field pr-10"
                    placeholder="Tu contraseña"
                    aria-invalid={!!errors.password}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-asa-muted hover:text-asa-text"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-asa-error">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-asa-border accent-asa-primary"
                    {...register("rememberDevice")}
                  />
                  <span className="text-muted text-asa-muted">Recordar este dispositivo (30 días)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full justify-center"
              >
                {isSubmitting ? "Iniciando sesión..." : "Iniciar sesión"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <a href="/forgot-password" className="text-muted text-asa-primary hover:underline">
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
