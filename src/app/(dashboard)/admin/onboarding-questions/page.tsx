"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit3, Trash2, ClipboardList, X, GripVertical } from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { apiClient } from "@/lib/axios";
import { Drawer } from "@/components/Drawer";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OnboardingQuestion {
  id: string; label: string; fieldKey: string; type: string;
  options: string[] | null; displayOrder: number; required: boolean; active: boolean;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const questionSchema = z.object({
  label:    z.string().min(3, "Mínimo 3 caracteres"),
  fieldKey: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Solo letras, números y guiones bajos"),
  type:     z.enum(["TEXT", "NUMBER", "SELECT"]),
  required: z.boolean(),
  options:  z.array(z.string()).optional(),
}).refine(d => d.type !== "SELECT" || (d.options && d.options.length >= 2), {
  message: "Agrega al menos 2 opciones",
  path: ["options"],
});

type QuestionForm = z.infer<typeof questionSchema>;

const TYPE_LABELS: Record<string, string> = { TEXT: "Texto", NUMBER: "Número", SELECT: "Selección" };
const TYPE_COLORS: Record<string, string> = {
  TEXT:   "bg-blue-50 text-blue-700",
  NUMBER: "bg-amber-50 text-amber-700",
  SELECT: "bg-purple-50 text-purple-700",
};

// ── Sortable question row ─────────────────────────────────────────────────────

function SortableQuestionRow({
  question, index, onEdit, onDelete, onToggleActive, isUpdating,
}: {
  question: OnboardingQuestion;
  index: number;
  onEdit: (q: OnboardingQuestion) => void;
  onDelete: (q: OnboardingQuestion) => void;
  onToggleActive: (q: OnboardingQuestion) => void;
  isUpdating: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-xl border border-asa-border shadow-subtle p-4 flex items-center gap-3"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-asa-muted hover:text-asa-text cursor-grab active:cursor-grabbing p-1 shrink-0"
        title="Arrastrar para reordenar"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Order badge */}
      <span className="text-xs font-bold text-asa-primary bg-asa-highlight rounded-full w-6 h-6 flex items-center justify-center shrink-0">
        {index + 1}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-asa-text">{question.label}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[question.type] ?? "bg-gray-100 text-gray-600"}`}>
            {TYPE_LABELS[question.type] ?? question.type}
          </span>
          {question.required && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">Obligatoria</span>
          )}
        </div>
        <p className="text-xs text-asa-muted font-mono mt-0.5">{question.fieldKey}</p>
      </div>

      {/* Active toggle */}
      <button
        onClick={() => onToggleActive(question)}
        disabled={isUpdating}
        className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 transition-colors ${
          question.active ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
        }`}
      >
        {question.active ? "Activa" : "Inactiva"}
      </button>

      <button onClick={() => onEdit(question)} className="btn-icon shrink-0">
        <Edit3 className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => onDelete(question)} className="btn-icon text-asa-error hover:bg-red-50 shrink-0">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Question Form ─────────────────────────────────────────────────────────────

function QuestionFormContent({
  defaultValues, isEdit, onSubmit, isPending, onCancel,
}: {
  defaultValues?: Partial<QuestionForm>;
  isEdit?: boolean;
  onSubmit: (data: QuestionForm) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const { register, handleSubmit, watch, control, setValue, formState: { errors } } = useForm<QuestionForm>({
    resolver: zodResolver(questionSchema),
    defaultValues: { type: "TEXT", required: true, options: [], ...defaultValues },
  });

  const type = watch("type");
  const options = watch("options") ?? [];
  const [optInput, setOptInput] = useState("");

  const addOption = () => {
    const t = optInput.trim();
    if (t && !options.includes(t)) { setValue("options", [...options, t]); setOptInput(""); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-asa-text mb-1.5">Texto de la pregunta *</label>
        <input {...register("label")} className={`input-field ${errors.label ? "error" : ""}`} placeholder="¿Cuál es tu ocupación?" />
        {errors.label && <p className="text-xs text-asa-error mt-1">{errors.label.message}</p>}
      </div>

      {!isEdit && (
        <div>
          <label className="block text-sm font-medium text-asa-text mb-1.5">
            Clave de campo *
            <span className="text-xs text-asa-muted font-normal ml-1">(inmutable después de crear)</span>
          </label>
          <input {...register("fieldKey")} className={`input-field font-mono ${errors.fieldKey ? "error" : ""}`} placeholder="occupation" />
          {errors.fieldKey && <p className="text-xs text-asa-error mt-1">{errors.fieldKey.message}</p>}
        </div>
      )}

      {!isEdit && (
        <div>
          <label className="block text-sm font-medium text-asa-text mb-1.5">Tipo</label>
          <select {...register("type")} className="input-field">
            <option value="TEXT">Texto libre</option>
            <option value="NUMBER">Número</option>
            <option value="SELECT">Selección (opciones)</option>
          </select>
        </div>
      )}

      {type === "SELECT" && (
        <div>
          <label className="block text-sm font-medium text-asa-text mb-1.5">Opciones</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text" value={optInput} onChange={e => setOptInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
              className="input-field flex-1" placeholder="Agregar opción…"
            />
            <button type="button" onClick={addOption} className="btn-outline px-3">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {options.map((opt, i) => (
              <span key={i} className="flex items-center gap-1 text-xs bg-asa-highlight text-asa-primary px-2 py-0.5 rounded-full">
                {opt}
                <button type="button" onClick={() => setValue("options", options.filter((_, j) => j !== i))}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          {errors.options && <p className="text-xs text-asa-error mt-1">{errors.options.message}</p>}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Controller name="required" control={control} render={({ field }) => (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={field.value} onChange={field.onChange} className="w-4 h-4 accent-asa-primary" />
            <span className="text-sm text-asa-text">Respuesta obligatoria</span>
          </label>
        )} />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-outline flex-1 justify-center">Cancelar</button>
        <button type="submit" disabled={isPending} className="btn-primary flex-1 justify-center">
          {isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear pregunta"}
        </button>
      </div>
    </form>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OnboardingQuestionsPage() {
  const queryClient = useQueryClient();
  const [drawerMode, setDrawerMode]     = useState<"create" | "edit" | null>(null);
  const [editing, setEditing]           = useState<OnboardingQuestion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OnboardingQuestion | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data: questions = [], isLoading } = useQuery<OnboardingQuestion[]>({
    queryKey: ["admin-onboarding-questions"],
    queryFn: () => apiClient.get("/api/v1/admin/onboarding-questions").then(r => r.data),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-onboarding-questions"] });

  const createMutation = useMutation({
    mutationFn: (data: QuestionForm) => apiClient.post("/api/v1/admin/onboarding-questions", data),
    onSuccess: () => { invalidate(); setDrawerMode(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<QuestionForm & { active: boolean; displayOrder: number }> }) =>
      apiClient.put(`/api/v1/admin/onboarding-questions/${id}`, data),
    onSuccess: () => { invalidate(); setDrawerMode(null); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/admin/onboarding-questions/${id}`),
    onSuccess: () => { invalidate(); setDeleteTarget(null); },
  });

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = questions.findIndex(q => q.id === active.id);
    const newIndex = questions.findIndex(q => q.id === over.id);
    const reordered = arrayMove(questions, oldIndex, newIndex);

    // Optimistic update
    queryClient.setQueryData<OnboardingQuestion[]>(["admin-onboarding-questions"], reordered);

    // Persist changed displayOrders in parallel
    const promises = reordered
      .map((q, i) => ({ q, newOrder: i + 1 }))
      .filter(({ q, newOrder }) => q.displayOrder !== newOrder)
      .map(({ q, newOrder }) =>
        apiClient.put(`/api/v1/admin/onboarding-questions/${q.id}`, {
          label: q.label, options: q.options, required: q.required,
          active: q.active, displayOrder: newOrder,
        })
      );

    await Promise.all(promises);
    invalidate();
  };

  const openEdit = (q: OnboardingQuestion) => { setEditing(q); setDrawerMode("edit"); };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-asa-text">Preguntas de onboarding</h1>
          <p className="text-sm text-asa-muted mt-0.5">{questions.length} pregunta{questions.length !== 1 ? "s" : ""} configuradas</p>
        </div>
        <button onClick={() => setDrawerMode("create")} className="btn-primary">
          <Plus className="w-4 h-4" /> Nueva pregunta
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-asa-border/40 rounded-xl animate-pulse" />)}
        </div>
      ) : questions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-asa-border shadow-subtle p-14 text-center">
          <ClipboardList className="w-10 h-10 mx-auto text-asa-primary/30 mb-3" />
          <p className="text-asa-muted text-sm">No hay preguntas configuradas. Crea la primera.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {questions.map((q, i) => (
                <SortableQuestionRow
                  key={q.id}
                  question={q}
                  index={i}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                  onToggleActive={q => updateMutation.mutate({ id: q.id, data: {
                    label: q.label, options: q.options ?? undefined, required: q.required,
                    displayOrder: q.displayOrder, active: !q.active,
                  }})}
                  isUpdating={updateMutation.isPending}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Create drawer */}
      <Drawer open={drawerMode === "create"} onClose={() => setDrawerMode(null)} title="Nueva pregunta">
        <QuestionFormContent
          onSubmit={data => createMutation.mutate(data)}
          isPending={createMutation.isPending}
          onCancel={() => setDrawerMode(null)}
        />
      </Drawer>

      {/* Edit drawer */}
      <Drawer open={drawerMode === "edit"} onClose={() => { setDrawerMode(null); setEditing(null); }} title="Editar pregunta">
        {editing && (
          <QuestionFormContent
            isEdit
            defaultValues={{
              label: editing.label, fieldKey: editing.fieldKey,
              type: editing.type as "TEXT" | "NUMBER" | "SELECT",
              required: editing.required, options: editing.options ?? [],
            }}
            onSubmit={data => updateMutation.mutate({ id: editing.id, data: {
              label: data.label, options: data.options,
              required: data.required, active: editing.active,
              displayOrder: editing.displayOrder,
            }})}
            isPending={updateMutation.isPending}
            onCancel={() => { setDrawerMode(null); setEditing(null); }}
          />
        )}
      </Drawer>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="¿Eliminar pregunta?"
        description={`Se eliminará "${deleteTarget?.label}". Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
      {deleteMutation.isError && (
        <div className="fixed bottom-4 right-4 bg-white border border-asa-error rounded-xl shadow-lg px-4 py-3 text-sm text-asa-error max-w-sm">
          {(deleteMutation.error as any)?.response?.data?.message ?? "No se puede eliminar esta pregunta."}
        </div>
      )}
    </div>
  );
}
