"use client";

import { use, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ArrowLeft, CheckSquare, Circle, AlignLeft, GripVertical } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/axios";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Option { id: string; text: string; isCorrect: boolean }
interface Question {
  id: string;
  text: string;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TEXT_OPEN";
  weight: number;
  options: Option[];
}

let nextId = 1;
const uid = () => `tmp-${nextId++}`;

function toDatetimeLocal(isoStr: string | null | undefined): string {
  if (!isoStr) return "";
  return new Date(isoStr).toISOString().slice(0, 16);
}

const QUESTION_TYPE_CONFIG = {
  SINGLE_CHOICE:   { label: "Opción única",   icon: <Circle className="w-4 h-4" /> },
  MULTIPLE_CHOICE: { label: "Opción múltiple", icon: <CheckSquare className="w-4 h-4" /> },
  TEXT_OPEN:       { label: "Respuesta libre", icon: <AlignLeft className="w-4 h-4" /> },
} as const;

// ── Assessment Creator / Editor ───────────────────────────────────────────────

export default function NewAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: programId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditMode = !!editId;

  // Basic info
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"EXAM" | "SURVEY">("EXAM");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [published, setPublished] = useState(false);
  const [moduleId, setModuleId] = useState<string | null>(null);

  // Questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionErrors, setQuestionErrors] = useState<Record<string, string>>({});

  // Edit confirm dialog
  const [showAttemptsWarning, setShowAttemptsWarning] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any>(null);

  // Fetch existing assessment for edit mode
  const { data: editAssessment, isLoading: loadingEdit } = useQuery({
    queryKey: ["assessment-edit", editId],
    queryFn: () => apiClient.get(`/api/v1/assessments/${editId}`).then(r => r.data),
    enabled: !!editId,
  });

  // Pre-fill state when edit data loads
  useEffect(() => {
    if (!editAssessment) return;
    setTitle(editAssessment.title ?? "");
    setType(editAssessment.type ?? "EXAM");
    setStartDate(toDatetimeLocal(editAssessment.startDate));
    setEndDate(toDatetimeLocal(editAssessment.endDate));
    setMaxAttempts(editAssessment.maxAttempts ?? 1);
    setPublished(editAssessment.published ?? false);
    setModuleId(editAssessment.moduleId ?? null);
    if (Array.isArray(editAssessment.questions)) {
      setQuestions(editAssessment.questions.map((q: any) => ({
        id: q.id,
        text: q.questionText ?? "",
        type: q.questionType ?? "SINGLE_CHOICE",
        weight: Number(q.weight ?? 0),
        options: (q.options ?? []).map((o: any) => ({
          id: o.id,
          text: o.optionText ?? "",
          isCorrect: o.isCorrect ?? false,
        })),
      })));
    }
  }, [editAssessment]);

  const [saveError, setSaveError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient.post(`/api/v1/programs/${programId}/assessments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments", programId] });
      router.push(`/programs/${programId}/assessments`);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message ?? error?.message ?? "Error desconocido al crear la evaluación";
      setSaveError(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient.put(`/api/v1/assessments/${editId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments", programId] });
      router.push(`/programs/${programId}/assessments`);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message ?? error?.message ?? "Error desconocido al guardar los cambios";
      setSaveError(msg);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  // ── Question DnD ──────────────────────────────────────────────────────────

  const questionSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleQuestionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setQuestions(prev => arrayMove(
      prev,
      prev.findIndex(q => q.id === active.id),
      prev.findIndex(q => q.id === over.id),
    ));
  };

  // ── Question helpers ──────────────────────────────────────────────────────

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: uid(),
        text: "",
        type: "SINGLE_CHOICE",
        weight: type === "SURVEY" ? 0 : 1,
        options: [
          { id: uid(), text: "", isCorrect: false },
          { id: uid(), text: "", isCorrect: false },
        ],
      },
    ]);
  };

  const updateQuestion = (id: string, patch: Partial<Question>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const addOption = (qId: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId
          ? { ...q, options: [...q.options, { id: uid(), text: "", isCorrect: false }] }
          : q
      )
    );
  };

  const updateOption = (qId: string, oId: string, patch: Partial<Option>) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q;
        let options = q.options.map((o) => (o.id === oId ? { ...o, ...patch } : o));
        if (patch.isCorrect && q.type === "SINGLE_CHOICE") {
          options = options.map((o) => ({ ...o, isCorrect: o.id === oId }));
        }
        return { ...q, options };
      })
    );
  };

  const removeOption = (qId: string, oId: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId ? { ...q, options: q.options.filter((o) => o.id !== oId) } : q
      )
    );
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const buildPayload = (overridePublished: boolean) => {
    const errors: Record<string, string> = {};
    const mappedQuestions = questions.map((q, idx) => {
      if (!q.text.trim()) {
        errors[q.id] = "El texto de la pregunta es requerido.";
      }
      const isChoice = q.type !== "TEXT_OPEN";
      const filteredOptions = isChoice ? q.options.filter((o) => o.text.trim() !== "") : [];
      if (!errors[q.id] && isChoice && filteredOptions.length === 0) {
        errors[q.id] = "La pregunta debe tener al menos una opción con texto.";
      }
      const isExam = type === "EXAM";
      if (!errors[q.id] && isExam && isChoice && !filteredOptions.some((o) => o.isCorrect)) {
        errors[q.id] = "Debes marcar al menos una respuesta correcta en evaluaciones calificadas.";
      }
      return {
        questionText: q.text,
        questionType: q.type,
        weight: type === "SURVEY" ? 0 : q.weight,
        orderIndex: idx,
        options: filteredOptions.map((o) => ({ optionText: o.text, isCorrect: o.isCorrect })),
      };
    });
    return {
      errors,
      payload: {
        title: title.trim(),
        type,
        moduleId: moduleId || null,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        maxAttempts,
        published: overridePublished,
        questions: mappedQuestions,
      },
    };
  };

  const doSubmit = (payload: any) => {
    setSaveError(null);
    if (isEditMode) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleSubmit = (overridePublished: boolean) => {
    setSaveError(null);
    if (!title.trim()) return alert("El título es requerido.");
    const { errors, payload } = buildPayload(overridePublished);
    if (Object.keys(errors).length > 0) {
      setQuestionErrors(errors);
      return;
    }
    setQuestionErrors({});

    if (isEditMode && editAssessment && (editAssessment.attemptsUsed ?? 0) > 0) {
      setPendingPayload(payload);
      setShowAttemptsWarning(true);
    } else {
      doSubmit(payload);
    }
  };

  if (isEditMode && loadingEdit) {
    return (
      <div className="space-y-4 max-w-3xl">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-asa-border/40 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <ConfirmDialog
        open={showAttemptsWarning}
        title="¿Editar esta evaluación?"
        description="Esta evaluación tiene intentos registrados. Guardar los cambios eliminará todos los intentos y respuestas existentes. Esta acción no se puede deshacer."
        confirmLabel="Sí, editar y borrar intentos"
        destructive
        isPending={isPending}
        onConfirm={() => {
          setShowAttemptsWarning(false);
          if (pendingPayload) doSubmit(pendingPayload);
        }}
        onCancel={() => {
          setShowAttemptsWarning(false);
          setPendingPayload(null);
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn-icon">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-2xl font-bold text-asa-text">
          {isEditMode ? "Editar evaluación" : "Nueva evaluación"}
        </h1>
      </div>

      {/* ── Sección 1: Información básica ── */}
      <div className="panel space-y-4">
        <h2 className="font-semibold text-asa-text">Información básica</h2>

        <div>
          <label className="block text-sm font-medium mb-1">Título *</label>
          <input
            className="input-field"
            placeholder="Ej. Examen final — Módulo 1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Type toggle */}
        <div>
          <label className="block text-sm font-medium mb-2">Tipo</label>
          <div className="flex gap-3">
            {(["EXAM", "SURVEY"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  type === t
                    ? "border-asa-primary bg-asa-highlight text-asa-primary"
                    : "border-asa-border text-asa-muted hover:border-asa-primary/40"
                }`}
              >
                {t === "EXAM" ? "Examen (con nota)" : "Encuesta (sin nota)"}
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Fecha de inicio</label>
            <input
              type="datetime-local"
              className="input-field"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fecha de cierre</label>
            <input
              type="datetime-local"
              className="input-field"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Max attempts + Publish */}
        <div className="flex items-center gap-6">
          <div>
            <label className="block text-sm font-medium mb-1">Intentos permitidos</label>
            <input
              type="number"
              min={1}
              max={10}
              className="input-field w-24"
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
            />
          </div>
          <div className="flex items-center gap-2 mt-5">
            <input
              type="checkbox"
              id="published"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="w-4 h-4 accent-asa-primary"
            />
            <label htmlFor="published" className="text-sm font-medium cursor-pointer">
              {isEditMode ? "Publicado" : "Publicar inmediatamente"}
            </label>
          </div>
        </div>
      </div>

      {/* ── Sección 2: Preguntas ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-asa-text">
            Preguntas <span className="text-asa-muted font-normal">({questions.length})</span>
          </h2>
          <button onClick={addQuestion} className="btn-outline text-sm flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Agregar pregunta
          </button>
        </div>

        {questions.length === 0 && (
          <div className="panel text-center py-8 text-asa-muted border-2 border-dashed border-asa-border">
            <p className="text-sm">Aún no hay preguntas. Haz clic en "Agregar pregunta".</p>
          </div>
        )}

        <DndContext
          sensors={questionSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleQuestionDragEnd}
        >
          <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
            {questions.map((question, qIdx) => (
              <SortableQuestionWrapper
                key={question.id}
                question={question}
                index={qIdx}
                isSurvey={type === "SURVEY"}
                error={questionErrors[question.id]}
                onUpdate={(patch) => {
                  updateQuestion(question.id, patch);
                  if (questionErrors[question.id]) {
                    setQuestionErrors((prev) => {
                      const n = { ...prev };
                      delete n[question.id];
                      return n;
                    });
                  }
                }}
                onRemove={() => removeQuestion(question.id)}
                onAddOption={() => addOption(question.id)}
                onUpdateOption={(oId, patch) => updateOption(question.id, oId, patch)}
                onRemoveOption={(oId) => removeOption(question.id, oId)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* ── Error banner ── */}
      {saveError && (
        <div className="rounded-xl border border-asa-error/30 bg-red-50 px-4 py-3 text-sm text-asa-error flex items-start gap-2">
          <span className="font-semibold shrink-0">Error:</span>
          <span>{saveError}</span>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={() => router.back()} className="btn-outline">
          Cancelar
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => handleSubmit(false)}
            className="btn-outline"
            disabled={isPending}
          >
            Guardar borrador
          </button>
          <button
            onClick={() => handleSubmit(isEditMode ? published : true)}
            className="btn-primary"
            disabled={isPending}
          >
            {isPending ? "Guardando…" : isEditMode ? "Guardar cambios" : "Publicar evaluación"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sortable Question Wrapper ─────────────────────────────────────────────────

function SortableQuestionWrapper({
  question, index, isSurvey, error, onUpdate, onRemove, onAddOption, onUpdateOption, onRemoveOption,
}: {
  question: Question;
  index: number;
  isSurvey: boolean;
  error?: string;
  onUpdate: (patch: Partial<Question>) => void;
  onRemove: () => void;
  onAddOption: () => void;
  onUpdateOption: (oId: string, patch: Partial<Option>) => void;
  onRemoveOption: (oId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <QuestionEditor
        question={question}
        index={index}
        isSurvey={isSurvey}
        error={error}
        dragHandleProps={{ ...attributes, ...listeners }}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onAddOption={onAddOption}
        onUpdateOption={onUpdateOption}
        onRemoveOption={onRemoveOption}
      />
    </div>
  );
}

// ── Sortable Option Row ───────────────────────────────────────────────────────

function SortableOptionRow({
  option, questionType, isSurvey, onUpdate, onRemove, canRemove, placeholder,
}: {
  option: Option;
  questionType: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TEXT_OPEN";
  isSurvey: boolean;
  onUpdate: (patch: Partial<Option>) => void;
  onRemove: () => void;
  canRemove: boolean;
  placeholder: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: option.id });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button {...attributes} {...listeners} className="text-asa-muted hover:text-asa-text cursor-grab active:cursor-grabbing p-1 shrink-0">
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      {!isSurvey && (
        <input
          type={questionType === "SINGLE_CHOICE" ? "radio" : "checkbox"}
          checked={option.isCorrect}
          onChange={e => onUpdate({ isCorrect: e.target.checked })}
          className="w-4 h-4 accent-asa-primary shrink-0"
          title="Marcar como respuesta correcta"
        />
      )}
      <input
        className="input-field flex-1 py-2 text-sm"
        placeholder={placeholder}
        value={option.text}
        onChange={e => onUpdate({ text: e.target.value })}
      />
      {canRemove && (
        <button type="button" className="btn-icon text-asa-error hover:bg-red-50 shrink-0" onClick={onRemove}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ── Question Editor ───────────────────────────────────────────────────────────

function QuestionEditor({
  question,
  index,
  isSurvey,
  error,
  dragHandleProps,
  onUpdate,
  onRemove,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
}: {
  question: Question;
  index: number;
  isSurvey: boolean;
  error?: string;
  dragHandleProps?: Record<string, any>;
  onUpdate: (patch: Partial<Question>) => void;
  onRemove: () => void;
  onAddOption: () => void;
  onUpdateOption: (oId: string, patch: Partial<Option>) => void;
  onRemoveOption: (oId: string) => void;
}) {
  const showOptions = question.type !== "TEXT_OPEN";

  const optionSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleOptionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = question.options.findIndex(o => o.id === active.id);
    const newIndex = question.options.findIndex(o => o.id === over.id);
    onUpdate({ options: arrayMove(question.options, oldIndex, newIndex) });
  };

  return (
    <div className={`panel space-y-4 ${error ? "border-asa-error" : ""}`}>
      {error && <p className="text-xs text-asa-error font-medium">{error}</p>}
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-1.5 mt-1 text-asa-muted">
          <button
            type="button"
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing p-0.5 hover:text-asa-text"
            title="Arrastrar para reordenar"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">{index + 1}.</span>
        </div>
        <div className="flex-1 space-y-3">
          <textarea
            className="input-field resize-none min-h-[60px]"
            placeholder="Escribe la pregunta aquí..."
            value={question.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
          />

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex gap-1.5">
              {(Object.keys(QUESTION_TYPE_CONFIG) as (keyof typeof QUESTION_TYPE_CONFIG)[]).map(
                (t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onUpdate({ type: t })}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                      question.type === t
                        ? "border-asa-primary bg-asa-highlight text-asa-primary"
                        : "border-asa-border text-asa-muted hover:border-asa-primary/40"
                    }`}
                  >
                    {QUESTION_TYPE_CONFIG[t].icon}
                    {QUESTION_TYPE_CONFIG[t].label}
                  </button>
                )
              )}
            </div>

            {!isSurvey && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-asa-muted">Puntaje:</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  className="input-field w-16 text-sm py-1"
                  value={question.weight}
                  onChange={(e) => onUpdate({ weight: Number(e.target.value) })}
                />
              </div>
            )}
          </div>

          {showOptions && (
            <div className="space-y-2">
              <DndContext sensors={optionSensors} collisionDetection={closestCenter} onDragEnd={handleOptionDragEnd}>
                <SortableContext items={question.options.map(o => o.id)} strategy={verticalListSortingStrategy}>
                  {question.options.map((option, idx) => (
                    <SortableOptionRow
                      key={option.id}
                      option={option}
                      questionType={question.type}
                      isSurvey={isSurvey}
                      placeholder={`Opción ${idx + 1}`}
                      onUpdate={patch => onUpdateOption(option.id, patch)}
                      onRemove={() => onRemoveOption(option.id)}
                      canRemove={question.options.length > 2}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <button
                type="button"
                onClick={onAddOption}
                className="text-sm text-asa-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar opción
              </button>
              {!isSurvey && (
                <p className="text-xs text-asa-muted">
                  {question.type === "SINGLE_CHOICE"
                    ? "Selecciona el radio de la respuesta correcta."
                    : "Marca todas las respuestas correctas."}
                </p>
              )}
            </div>
          )}

          {question.type === "TEXT_OPEN" && (
            <div className="p-3 rounded-lg bg-asa-bg border border-dashed border-asa-border text-sm text-asa-muted">
              {isSurvey
                ? "El participante escribirá su respuesta libremente."
                : "El estudiante escribirá su respuesta libremente. La calificación es manual."}
            </div>
          )}
        </div>

        <button
          type="button"
          className="btn-icon text-asa-error hover:bg-red-50 shrink-0 mt-1"
          onClick={onRemove}
          title="Eliminar pregunta"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
