"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiClient } from "@/lib/axios";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OnboardingQuestion {
  id: string; label: string; fieldKey: string; type: string;
  options: string[] | null; required: boolean;
}

// ── Step 1 schema (static) ────────────────────────────────────────────────────

const step1Schema = z.object({
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
  phoneNumber: z
    .string()
    .regex(/^0[2-9]\d{8}$/, "Número ecuatoriano de 10 dígitos (ej: 0991234567)")
    .or(z.literal(""))
    .optional(),
});

type Step1Data = z.infer<typeof step1Schema>;

// ── Dynamic question field ─────────────────────────────────────────────────────

function DynamicQuestionField({
  question,
  register,
  error,
}: {
  question: OnboardingQuestion;
  register: any;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-asa-text mb-1.5">
        {question.label}
        {question.required && <span className="text-asa-error ml-1">*</span>}
      </label>

      {question.type === "SELECT" ? (
        <select
          {...register(question.fieldKey)}
          className={`input-field ${error ? "error" : ""}`}
        >
          <option value="">Selecciona…</option>
          {(question.options ?? []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          {...register(question.fieldKey)}
          type={question.type === "NUMBER" ? "number" : "text"}
          className={`input-field ${error ? "error" : ""}`}
          placeholder={question.type === "NUMBER" ? "0" : "Tu respuesta…"}
          min={question.type === "NUMBER" ? 0 : undefined}
        />
      )}
      {error && <p className="mt-1 text-xs text-asa-error">{error}</p>}
    </div>
  );
}

const STEPS = ["Datos personales", "Información sociodemográfica", "Confirmación"];

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep]   = useState(0);
  const [step1Data, setStep1Data]       = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data]       = useState<Record<string, string> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 form
  const form1 = useForm<Step1Data>({ resolver: zodResolver(step1Schema) });
  const handleStep1 = (data: Step1Data) => { setStep1Data(data); setCurrentStep(1); };

  // Fetch dynamic questions
  const { data: questions = [], isLoading: loadingQuestions } = useQuery<OnboardingQuestion[]>({
    queryKey: ["onboarding-questions"],
    queryFn: () => apiClient.get("/api/v1/onboarding/questions").then(r => r.data),
    enabled: currentStep >= 1,
  });

  // Build dynamic Zod schema from questions
  const dynamicSchema = z.object(
    Object.fromEntries(
      questions.map(q => [
        q.fieldKey,
        q.required
          ? z.string().min(1, "Requerido")
          : z.string().optional(),
      ])
    )
  );

  const form2 = useForm({
    resolver: zodResolver(dynamicSchema),
  });

  const handleStep2 = (data: Record<string, string | undefined>) => {
    setStep2Data(data as Record<string, string>);
    setCurrentStep(2);
  };

  const handleSubmit = async () => {
    if (!step1Data) return;
    setIsSubmitting(true);
    try {
      await apiClient.post("/api/v1/users/onboarding", {
        firstName:       step1Data.firstName,
        lastName:        step1Data.lastName,
        phoneNumber:     step1Data.phoneNumber || null,
        demographicData: step2Data ?? {},
      });
      router.push("/dashboard");
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-asa-bg flex items-center justify-center p-6">
      <div className="w-full max-w-xl">

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {STEPS.map((step, i) => (
              <span key={step} className={`text-xs font-medium ${i <= currentStep ? "text-asa-primary" : "text-asa-muted"}`}>
                {step}
              </span>
            ))}
          </div>
          <div className="h-2 bg-asa-border rounded-full">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%`, backgroundColor: "var(--color-asa-primary)" }}
            />
          </div>
          <p className="text-xs text-asa-muted mt-1">Paso {currentStep + 1} de {STEPS.length}</p>
        </div>

        <div className="bg-white rounded-2xl border border-asa-border shadow-subtle p-8">

          {/* Step 1: Personal data (static) */}
          {currentStep === 0 && (
            <>
              <h2 className="text-xl font-bold text-asa-text mb-6">Cuéntanos sobre ti</h2>
              <form onSubmit={form1.handleSubmit(handleStep1)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-asa-text mb-1.5">Nombre *</label>
                  <input className="input-field" placeholder="Tu nombre" {...form1.register("firstName")} />
                  {form1.formState.errors.firstName && (
                    <p className="mt-1 text-xs text-asa-error">{form1.formState.errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-asa-text mb-1.5">Apellido *</label>
                  <input className="input-field" placeholder="Tu apellido" {...form1.register("lastName")} />
                  {form1.formState.errors.lastName && (
                    <p className="mt-1 text-xs text-asa-error">{form1.formState.errors.lastName.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-asa-text mb-1.5">
                    Teléfono
                    <span className="text-xs text-asa-muted font-normal ml-1.5">(opcional, 10 dígitos)</span>
                  </label>
                  <input
                    className={`input-field ${form1.formState.errors.phoneNumber ? "error" : ""}`}
                    placeholder="0991234567"
                    maxLength={10}
                    {...form1.register("phoneNumber")}
                  />
                  {form1.formState.errors.phoneNumber && (
                    <p className="mt-1 text-xs text-asa-error">{form1.formState.errors.phoneNumber.message}</p>
                  )}
                  <p className="mt-1 text-xs text-asa-muted">Celular: 09XXXXXXXX · Fijo: 0X-XXXXXXX</p>
                </div>
                <button type="submit" className="btn-primary w-full justify-center mt-2">Continuar</button>
              </form>
            </>
          )}

          {/* Step 2: Dynamic sociodemographic questions */}
          {currentStep === 1 && (
            <>
              <h2 className="text-xl font-bold text-asa-text mb-1">Datos sociodemográficos</h2>
              <p className="text-sm text-asa-muted mb-6">
                Esta información nos ayuda a medir el impacto social de nuestros programas.
              </p>

              {loadingQuestions ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="space-y-1.5 animate-pulse">
                      <div className="h-4 bg-asa-border rounded w-1/3" />
                      <div className="h-10 bg-asa-border rounded" />
                    </div>
                  ))}
                  <div className="h-10 bg-asa-border rounded mt-4" />
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-asa-muted mb-6">No hay preguntas configuradas por el administrador.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setCurrentStep(0)} className="btn-outline flex-1 justify-center">Atrás</button>
                    <button onClick={() => { setStep2Data({}); setCurrentStep(2); }} className="btn-primary flex-1 justify-center">Continuar</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={form2.handleSubmit(handleStep2)} className="space-y-4">
                  {questions.map(q => (
                    <DynamicQuestionField
                      key={q.id}
                      question={q}
                      register={form2.register}
                      error={(form2.formState.errors as any)[q.fieldKey]?.message}
                    />
                  ))}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setCurrentStep(0)} className="btn-outline flex-1 justify-center">
                      Atrás
                    </button>
                    <button type="submit" className="btn-primary flex-1 justify-center">Continuar</button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* Step 3: Confirmation */}
          {currentStep === 2 && (
            <>
              <h2 className="text-xl font-bold text-asa-text mb-1">¡Casi listo!</h2>
              <p className="text-sm text-asa-muted mb-6">Confirma tus datos antes de continuar.</p>
              <div className="space-y-3 mb-6">
                <div className="p-4 bg-asa-bg rounded-xl">
                  <p className="text-xs text-asa-muted mb-0.5">Nombre completo</p>
                  <p className="text-sm font-medium text-asa-text">{step1Data?.firstName} {step1Data?.lastName}</p>
                </div>
                {step1Data?.phoneNumber && (
                  <div className="p-4 bg-asa-bg rounded-xl">
                    <p className="text-xs text-asa-muted mb-0.5">Teléfono</p>
                    <p className="text-sm font-medium text-asa-text">{step1Data.phoneNumber}</p>
                  </div>
                )}
                {step2Data && Object.entries(step2Data).filter(([, v]) => v).map(([k, v]) => {
                  const q = questions.find(q => q.fieldKey === k);
                  return (
                    <div key={k} className="p-4 bg-asa-bg rounded-xl">
                      <p className="text-xs text-asa-muted mb-0.5">{q?.label ?? k}</p>
                      <p className="text-sm font-medium text-asa-text">{v}</p>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setCurrentStep(1)} className="btn-outline flex-1 justify-center">Atrás</button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="btn-primary flex-1 justify-center"
                >
                  {isSubmitting ? "Guardando..." : "Completar registro"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
