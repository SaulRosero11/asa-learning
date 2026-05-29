"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CheckCircle2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/axios";

interface Option { id: string; optionText: string; isCorrect: null }
interface Question {
  id: string;
  questionText: string;
  questionType: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TEXT_OPEN";
  weight: number;
  orderIndex: number;
  options: Option[];
}
interface Assessment {
  id: string;
  title: string;
  type: string;
  maxAttempts: number;
  attemptsUsed: number;
  questions: Question[];
}

type Answers = Record<string, { selectedOptionId?: string; selectedOptionIds?: string[]; textResponse?: string }>;

export default function PlayAssessmentPage({
  params,
}: {
  params: Promise<{ id: string; assessmentId: string }>;
}) {
  const { id: programId, assessmentId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: assessment, isLoading } = useQuery<Assessment>({
    queryKey: ["assessment", assessmentId],
    queryFn: () =>
      apiClient.get(`/api/v1/assessments/${assessmentId}`).then((r) => r.data),
  });

  const submitMutation = useMutation({
    mutationFn: (payload: any) =>
      apiClient.post(`/api/v1/assessments/${assessmentId}/submit`, payload),
    onSuccess: (res) => {
      const attemptId = res.data.attemptId;
      queryClient.invalidateQueries({ queryKey: ["assessments", programId] });
      queryClient.invalidateQueries({ queryKey: ["assessment", assessmentId] });
      router.push(`/programs/${programId}/assessments/${assessmentId}/result?attempt=${attemptId}`);
    },
  });

  if (isLoading || !assessment) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-asa-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const questions = assessment.questions ?? [];
  const total = questions.length;
  const current = questions[currentIdx];
  const progress = total > 0 ? Math.round(((currentIdx + 1) / total) * 100) : 0;
  const answeredCount = Object.keys(answers).length;

  const handleAnswer = (questionId: string, update: Answers[string]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: update }));
  };

  const handleSubmit = () => {
    const payload = {
      answers: questions.map((q) => {
        const a = answers[q.id] ?? {};
        return {
          questionId: q.id,
          selectedOptionId: a.selectedOptionId ?? null,
          selectedOptionIds: a.selectedOptionIds ?? [],
          textResponse: a.textResponse ?? null,
        };
      }),
    };
    submitMutation.mutate(payload);
  };

  if (showConfirm) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 pt-12">
        <div className="panel space-y-4">
          <div className="w-16 h-16 rounded-full bg-asa-highlight flex items-center justify-center mx-auto">
            <Send className="w-8 h-8 text-asa-primary" />
          </div>
          <h2 className="text-xl font-bold">¿Listo para enviar?</h2>
          <p className="text-asa-muted text-sm">
            Has respondido <strong>{answeredCount}</strong> de <strong>{total}</strong> preguntas.
            {answeredCount < total && (
              <span className="text-amber-600 block mt-1">
                Hay {total - answeredCount} pregunta(s) sin responder.
              </span>
            )}
          </p>
          <p className="text-xs text-asa-muted">
            Una vez enviado, no podrás modificar tus respuestas.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => setShowConfirm(false)} className="btn-outline">
            Volver a revisar
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary"
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? "Enviando…" : "Confirmar envío"}
          </button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-asa-text">{assessment.title}</h1>
        <p className="text-sm text-asa-muted">
          Pregunta {currentIdx + 1} de {total}
        </p>
      </div>

      {/* Question card */}
      <div className="panel space-y-5 min-h-[300px]">
        <p className="text-base font-medium text-asa-text leading-relaxed">
          {current.questionText}
        </p>

        {/* Options */}
        {current.questionType !== "TEXT_OPEN" ? (
          <div className="space-y-2.5">
            {current.options.map((option) => {
              const a = answers[current.id] ?? {};
              const isSelected =
                current.questionType === "SINGLE_CHOICE"
                  ? a.selectedOptionId === option.id
                  : a.selectedOptionIds?.includes(option.id) ?? false;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    if (current.questionType === "SINGLE_CHOICE") {
                      handleAnswer(current.id, { selectedOptionId: option.id });
                    } else {
                      const prev = answers[current.id]?.selectedOptionIds ?? [];
                      const next = prev.includes(option.id)
                        ? prev.filter((id) => id !== option.id)
                        : [...prev, option.id];
                      handleAnswer(current.id, { selectedOptionIds: next });
                    }
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border-2 transition-all text-sm ${
                    isSelected
                      ? "border-asa-primary bg-asa-highlight text-asa-primary font-medium"
                      : "border-asa-border hover:border-asa-primary/40 text-asa-text"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected ? "border-asa-primary" : "border-asa-border"
                    }`}>
                      {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-asa-primary" />}
                    </span>
                    {option.optionText}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <textarea
            className="input-field min-h-[120px] resize-none"
            placeholder="Escribe tu respuesta aquí..."
            value={answers[current.id]?.textResponse ?? ""}
            onChange={(e) =>
              handleAnswer(current.id, { textResponse: e.target.value })
            }
          />
        )}
      </div>

      {/* Bottom progress + navigation */}
      <div className="space-y-3">
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-asa-border rounded-full overflow-hidden">
            <div
              className="h-full bg-asa-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-asa-muted shrink-0">{progress}%</span>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            className="btn-outline flex items-center gap-1.5 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>

          {currentIdx < total - 1 ? (
            <button
              onClick={() => setCurrentIdx((i) => i + 1)}
              className="btn-primary flex items-center gap-1.5"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="btn-primary flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Revisar y enviar
            </button>
          )}
        </div>

        {/* Question dots */}
        <div className="flex gap-1.5 justify-center flex-wrap">
          {questions.map((q, i) => {
            const answered = !!answers[q.id];
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(i)}
                className={`w-6 h-6 rounded-full text-xs font-medium transition-all ${
                  i === currentIdx
                    ? "bg-asa-primary text-white"
                    : answered
                    ? "bg-asa-primary/20 text-asa-primary"
                    : "bg-asa-border text-asa-muted"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
