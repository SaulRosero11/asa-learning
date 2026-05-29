"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, ArrowLeft, Trophy } from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/axios";

interface QuestionResult {
  questionId: string;
  questionText: string;
  pointsAwarded: number;
  weight: number;
  wasCorrect: boolean;
}

interface AttemptResult {
  attemptId: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  status: string;
  endTime: string;
  questionResults: QuestionResult[] | null;
}

// CSS-based donut chart (no recharts needed for MVP)
function ScoreDonut({ percentage }: { percentage: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (percentage / 100) * circ;

  const color =
    percentage >= 70 ? "#22C55E" : percentage >= 50 ? "#F59E0B" : "#EF4444";

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg viewBox="0 0 120 120" className="rotate-[-90deg] w-full h-full">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#EAEAEA" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>
          {Math.round(percentage)}%
        </span>
        <span className="text-xs text-asa-muted">puntaje</span>
      </div>
    </div>
  );
}

export default function AssessmentResultPage({
  params,
}: {
  params: Promise<{ id: string; assessmentId: string }>;
}) {
  const { id: programId, assessmentId } = use(params);
  const searchParams = useSearchParams();
  const attemptId = searchParams.get("attempt");

  const { data: attempts, isLoading } = useQuery<AttemptResult[]>({
    queryKey: ["my-attempts", assessmentId],
    queryFn: () =>
      apiClient
        .get(`/api/v1/assessments/${assessmentId}/my-attempts`)
        .then((r) => r.data),
    enabled: !attemptId,
  });

  // If attemptId is in URL, find it from the list or use first
  const result = attempts?.[0] ?? null;
  const percentage = result?.percentage ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-asa-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="panel text-center py-12 max-w-lg mx-auto">
        <p className="text-asa-muted">No se encontraron resultados para esta evaluación.</p>
        <Link
          href={`/programs/${programId}/assessments`}
          className="btn-outline inline-flex mt-4"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
      </div>
    );
  }

  const passed = percentage >= 70;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href={`/programs/${programId}/assessments`}
        className="flex items-center gap-1.5 text-sm text-asa-muted hover:text-asa-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Ver todas las evaluaciones
      </Link>

      {/* Score card */}
      <div className="panel text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Trophy className={`w-6 h-6 ${passed ? "text-asa-gold" : "text-asa-muted"}`} />
          <h1 className="text-xl font-bold">
            {passed ? "¡Excelente resultado!" : "Evaluación completada"}
          </h1>
        </div>

        <ScoreDonut percentage={Number(percentage)} />

        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-asa-text">
              {Number(result.totalScore).toFixed(1)}
            </p>
            <p className="text-asa-muted text-xs">puntos obtenidos</p>
          </div>
          <div className="w-px h-10 bg-asa-border" />
          <div className="text-center">
            <p className="text-2xl font-bold text-asa-text">
              {Number(result.maxScore).toFixed(1)}
            </p>
            <p className="text-asa-muted text-xs">puntos posibles</p>
          </div>
        </div>

        {result.endTime && (
          <p className="text-xs text-asa-muted">
            Completado el {new Date(result.endTime).toLocaleString("es-EC")}
          </p>
        )}
      </div>

      {/* Question-by-question feedback (EXAM only) */}
      {result.questionResults && result.questionResults.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-asa-text">Retroalimentación por pregunta</h2>
          {result.questionResults.map((qr, i) => (
            <div
              key={qr.questionId}
              className={`panel flex items-start gap-3 p-4 border-l-4 ${
                qr.wasCorrect ? "border-l-asa-success" : "border-l-asa-error"
              }`}
            >
              {qr.wasCorrect ? (
                <CheckCircle2 className="w-5 h-5 text-asa-success shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-asa-error shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-asa-text">
                  {i + 1}. {qr.questionText}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs font-medium ${qr.wasCorrect ? "text-asa-success" : "text-asa-error"}`}>
                    {qr.wasCorrect ? "Correcto" : "Incorrecto"}
                  </span>
                  {Number(qr.weight) > 0 && (
                    <span className="text-xs text-asa-muted">
                      {Number(qr.pointsAwarded).toFixed(1)} / {Number(qr.weight).toFixed(1)} pts
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
