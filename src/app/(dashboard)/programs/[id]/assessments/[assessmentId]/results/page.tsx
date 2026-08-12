"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Users, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Download, Pencil,
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/axios";
import { formatDate } from "@/lib/dates";
import { formatScore } from "@/lib/scores";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AnswerDetail {
  responseId: string;
  questionId: string;
  questionText: string;
  questionType: string;
  selectedOptionText: string;
  correct: boolean;
  pointsAwarded: number | null;
  maxPoints: number | null;
}

interface AttemptDetail {
  attemptId: string;
  userId: string;
  userEmail: string;
  totalScore: number | null;
  submittedAt: string | null;
  answers: AnswerDetail[];
}

interface UserResult {
  userId: string;
  userEmail: string;
  assessmentType: string;
  attemptCount: number;
  bestScore: number | null;
  lastAttemptAt: string | null;
  attempts: AttemptDetail[];
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LeaderResultsPage({
  params,
}: {
  params: Promise<{ id: string; assessmentId: string }>;
}) {
  const { id: programId, assessmentId } = use(params);
  const queryClient = useQueryClient();
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [activeAttemptIdx, setActiveAttemptIdx] = useState<Record<string, number>>({});
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});

  const gradeMutation = useMutation({
    mutationFn: ({ responseId, points }: { responseId: string; points: number }) =>
      apiClient.put(`/api/v1/responses/${responseId}/grade`, { points }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessment-results-grouped", assessmentId] });
    },
  });

  const { data: results = [], isLoading, isError } = useQuery<UserResult[]>({
    queryKey: ["assessment-results-grouped", assessmentId],
    queryFn: () =>
      apiClient.get(`/api/v1/assessments/${assessmentId}/results`).then(r => r.data),
    retry: 1,
  });

  const isSurvey = results.length > 0 && results[0].assessmentType === "SURVEY";
  const totalStudents = results.length;
  const avgScore = !isSurvey && results.length > 0
    ? results.reduce((s, r) => s + Number(r.bestScore ?? 0), 0) / results.length
    : null;
  const approved = !isSurvey
    ? results.filter(r => Number(r.bestScore ?? 0) >= 70).length
    : null;

  const exportCSV = () => {
    const headers = isSurvey
      ? ["Email", "Intentos", "Último envío"]
      : ["Email", "Intentos", "Mejor nota", "Aprobado", "Último envío"];
    const rows = results.map(r => isSurvey
      ? [r.userEmail, String(r.attemptCount), r.lastAttemptAt ? new Date(r.lastAttemptAt).toLocaleString("es-EC") : "—"]
      : [r.userEmail, String(r.attemptCount), r.bestScore != null ? Number(r.bestScore).toFixed(0) : "—",
          Number(r.bestScore ?? 0) >= 70 ? "Sí" : "No",
          r.lastAttemptAt ? new Date(r.lastAttemptAt).toLocaleString("es-EC") : "—"]
    );
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `resultados-${assessmentId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getAttemptIdx = (userId: string) => activeAttemptIdx[userId] ?? 0;
  const setAttemptIdx = (userId: string, idx: number) =>
    setActiveAttemptIdx(prev => ({ ...prev, [userId]: idx }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/programs/${programId}?tab=assessments`} className="btn-icon">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-asa-text">Resultados</h1>
            <p className="text-sm text-asa-muted">
              {totalStudents} estudiante{totalStudents !== 1 ? "s" : ""} completaron esta evaluación
            </p>
          </div>
        </div>
        {results.length > 0 && (
          <button onClick={exportCSV} className="btn-outline flex items-center gap-2">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        )}
      </div>

      {/* Summary stats */}
      {results.length > 0 && (
        <div className={`grid gap-4 ${isSurvey ? "grid-cols-1 max-w-xs" : "grid-cols-3"}`}>
          <div className="bg-white rounded-2xl border border-asa-border shadow-subtle p-5 text-center">
            <p className="text-2xl font-bold text-asa-text">{totalStudents}</p>
            <p className="text-xs text-asa-muted mt-0.5">Completaron</p>
          </div>
          {!isSurvey && avgScore !== null && (
            <>
              <div className="bg-white rounded-2xl border border-asa-border shadow-subtle p-5 text-center">
                <p className="text-2xl font-bold text-asa-text">{Math.round(avgScore)}</p>
                <p className="text-xs text-asa-muted mt-0.5">Promedio (mejor nota)</p>
              </div>
              <div className="bg-white rounded-2xl border border-asa-border shadow-subtle p-5 text-center">
                <p className="text-2xl font-bold text-green-600">{approved}</p>
                <p className="text-xs text-asa-muted mt-0.5">Aprobados (≥70)</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 bg-asa-border/40 rounded-xl animate-pulse" />)}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-sm font-medium text-red-700">No se pudieron cargar los resultados.</p>
          <p className="text-xs text-red-500 mt-1">Verifica que el servidor esté activo o que tengas permisos para ver esta evaluación.</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && results.length === 0 && (
        <div className="bg-white rounded-2xl border border-asa-border shadow-subtle p-14 text-center">
          <Users className="w-10 h-10 mx-auto text-asa-primary/30 mb-3" />
          <p className="text-asa-muted text-sm">Aún no hay intentos registrados para esta evaluación.</p>
        </div>
      )}

      {/* User rows */}
      {!isLoading && !isError && results.length > 0 && (
        <div className="space-y-2">
          {results.map(result => {
            const isExpanded = expandedUserId === result.userId;
            const scoreDisplay = formatScore(result.bestScore, result.assessmentType);
            const attemptIdx = getAttemptIdx(result.userId);
            const activeAttempt = result.attempts[attemptIdx];

            return (
              <div key={result.userId} className="bg-white rounded-xl border border-asa-border shadow-subtle overflow-hidden">
                {/* Row header */}
                <button
                  onClick={() => setExpandedUserId(isExpanded ? null : result.userId)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-asa-bg/50 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-asa-highlight flex items-center justify-center text-xs font-bold text-asa-primary shrink-0">
                    {result.userEmail.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-asa-text truncate">{result.userEmail}</p>
                    <p className="text-xs text-asa-muted">
                      {result.attemptCount} intento{result.attemptCount !== 1 ? "s" : ""}
                      {result.lastAttemptAt ? ` · ${formatDate(result.lastAttemptAt)}` : ""}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${scoreDisplay.colorClass}`}>
                    {scoreDisplay.label}
                  </span>
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-asa-muted shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-asa-muted shrink-0" />}
                </button>

                {/* Expanded detail */}
                {isExpanded && result.attempts.length > 0 && (
                  <div className="border-t border-asa-border">
                    {/* Attempt tabs */}
                    {result.attempts.length > 1 && (
                      <div className="flex gap-1 px-4 pt-3">
                        {result.attempts.map((attempt, idx) => (
                          <button
                            key={attempt.attemptId}
                            onClick={() => setAttemptIdx(result.userId, idx)}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                              attemptIdx === idx
                                ? "border-asa-primary bg-asa-highlight text-asa-primary font-medium"
                                : "border-asa-border text-asa-muted hover:border-asa-primary/40"
                            }`}
                          >
                            Intento {idx + 1}
                            {!isSurvey && attempt.totalScore != null && (
                              <span className="ml-1 opacity-70">· {Number(attempt.totalScore).toFixed(0)}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Attempt answers */}
                    <div className="px-4 pb-4 pt-3 space-y-2">
                      {activeAttempt && (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-asa-muted">
                              {activeAttempt.submittedAt ? formatDate(activeAttempt.submittedAt) : "—"}
                            </p>
                            {!isSurvey && activeAttempt.totalScore != null && (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${formatScore(activeAttempt.totalScore, result.assessmentType).colorClass}`}>
                                {Number(activeAttempt.totalScore).toFixed(0)} pts
                              </span>
                            )}
                          </div>
                          {activeAttempt.answers.length === 0 ? (
                            <p className="text-xs text-asa-muted">Sin respuestas registradas.</p>
                          ) : activeAttempt.answers.map((ans, i) => {
                            const isTextOpen = ans.questionType === "TEXT_OPEN";
                            const inputKey = ans.responseId ?? `${i}`;
                            const inputVal = gradeInputs[inputKey] ?? String(ans.pointsAwarded ?? 0);
                            const isGrading = gradeMutation.isPending && gradeMutation.variables?.responseId === ans.responseId;

                            return (
                              <div key={ans.questionId ?? i} className="py-2 border-b border-asa-border last:border-0">
                                <div className="flex items-start gap-3">
                                  <div className="mt-0.5 shrink-0">
                                    {isSurvey || isTextOpen
                                      ? <Pencil className="w-4 h-4 text-asa-primary/50" />
                                      : ans.correct
                                        ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        : <XCircle className="w-4 h-4 text-red-400" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-asa-text">{ans.questionText}</p>
                                    <p className={`text-xs mt-0.5 ${
                                      isSurvey || isTextOpen ? "text-asa-muted" : ans.correct ? "text-green-600" : "text-red-500"
                                    }`}>
                                      {ans.selectedOptionText}
                                    </p>
                                  </div>
                                  {!isSurvey && isTextOpen && ans.responseId && (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <input
                                        type="number"
                                        min={0}
                                        max={ans.maxPoints ?? 100}
                                        step="0.5"
                                        value={inputVal}
                                        onChange={e => setGradeInputs(prev => ({ ...prev, [inputKey]: e.target.value }))}
                                        className="w-16 text-xs border border-asa-border rounded-lg px-2 py-1 text-center focus:outline-none focus:border-asa-primary"
                                        disabled={isGrading}
                                      />
                                      <span className="text-xs text-asa-muted">/ {ans.maxPoints ?? 0}</span>
                                      <button
                                        onClick={() => {
                                          const pts = parseFloat(inputVal);
                                          if (!isNaN(pts)) gradeMutation.mutate({ responseId: ans.responseId, points: pts });
                                        }}
                                        disabled={isGrading}
                                        className="text-xs px-2 py-1 rounded-lg bg-asa-primary text-white hover:bg-asa-primary/90 transition-colors disabled:opacity-50"
                                      >
                                        {isGrading ? "…" : "Calificar"}
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {!isSurvey && isTextOpen && (
                                  <p className="text-xs text-asa-muted mt-1 pl-7">
                                    Nota actual: <span className="font-semibold text-asa-text">
                                      {ans.pointsAwarded != null ? Number(ans.pointsAwarded).toFixed(1) : "—"} pts
                                    </span>
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
