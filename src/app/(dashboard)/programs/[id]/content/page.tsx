"use client";

import { useState, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Circle,
  BookOpen,
  Video,
  FileText,
  ExternalLink,
  ArrowLeft,
  ChevronRight,
  ChevronDown as ChevronDownIcon,
  GripVertical,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiClient } from "@/lib/axios";
import Link from "next/link";
import { Drawer } from "@/components/Drawer";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  contentType: "VIDEO" | "TEXT" | "PDF";
  contentUrl: string | null;
  orderIndex: number;
  completed: boolean;
}

interface Module {
  id: string;
  programId: string;
  title: string;
  orderIndex: number;
  lessons: Lesson[];
  totalLessons: number;
  completedLessons: number;
  createdAt: string;
}

interface CurrentUser {
  userId: string;
  email: string;
  roles: string[];
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchMe(): Promise<CurrentUser> {
  const res = await apiClient.get("/api/v1/auth/me");
  return res.data;
}

async function fetchModules(programId: string): Promise<Module[]> {
  const res = await apiClient.get(`/api/v1/programs/${programId}/modules`);
  return res.data;
}

// ── Video embed helper ────────────────────────────────────────────────────────

function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  const ytMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return url; // fallback: use as-is
}

// ── Lesson Content Renderer (task 4.7) ────────────────────────────────────────

function LessonContent({ lesson }: { lesson: Lesson }) {
  if (lesson.contentType === "VIDEO") {
    const embedUrl = lesson.contentUrl ? getEmbedUrl(lesson.contentUrl) : null;
    if (!embedUrl) return <p className="text-asa-muted">Sin contenido de video.</p>;
    return (
      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          title={lesson.title}
        />
      </div>
    );
  }

  if (lesson.contentType === "PDF") {
    return (
      <div className="panel flex flex-col items-center gap-4 py-12">
        <FileText className="w-12 h-12 text-asa-primary" />
        <p className="text-asa-muted">Documento PDF</p>
        {lesson.contentUrl ? (
          <a
            href={lesson.contentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" /> Abrir PDF
          </a>
        ) : (
          <p className="text-sm text-asa-muted">Sin URL de documento.</p>
        )}
      </div>
    );
  }

  // TEXT
  if (!lesson.contentUrl) {
    return <p className="text-asa-muted text-sm">Esta lección no tiene contenido.</p>;
  }
  return (
    <div
      className="prose max-w-none"
      dangerouslySetInnerHTML={{ __html: lesson.contentUrl }}
    />
  );
}

// ── Student Study View ────────────────────────────────────────────────────────

function StudentStudyView({
  programId,
  modules,
}: {
  programId: string;
  modules: Module[];
}) {
  const queryClient = useQueryClient();
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(modules.map((m) => m.id))
  );

  const completeMutation = useMutation({
    mutationFn: (lessonId: string) =>
      apiClient.post(`/api/v1/lessons/${lessonId}/complete`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["modules", programId] }),
  });

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const contentTypeIcon = (type: string) => {
    if (type === "VIDEO") return <Video className="w-3.5 h-3.5" />;
    if (type === "PDF") return <FileText className="w-3.5 h-3.5" />;
    return <BookOpen className="w-3.5 h-3.5" />;
  };

  const sortedModules = [...modules].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="space-y-4">
      {sortedModules.length === 0 && (
        <div className="panel text-center py-12 text-asa-muted">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-asa-primary/30" />
          <p>Este programa aún no tiene contenido.</p>
        </div>
      )}

      {sortedModules.map((module) => {
        const progress =
          module.totalLessons > 0
            ? Math.round((module.completedLessons / module.totalLessons) * 100)
            : 0;
        const isExpanded = expandedModules.has(module.id);

        return (
          <div key={module.id} className="bg-white rounded-2xl border border-asa-border shadow-subtle overflow-hidden">
            {/* Module accordion header */}
            <button
              onClick={() => toggleModule(module.id)}
              className="w-full flex items-center gap-3 p-4 hover:bg-asa-bg transition-colors text-left"
            >
              <ChevronDownIcon
                className={`w-4 h-4 text-asa-primary shrink-0 transition-transform duration-[280ms] ${isExpanded ? "" : "-rotate-90"}`}
                style={{ transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)" }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-asa-text truncate">{module.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 bg-asa-primary/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-asa-primary rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-asa-muted shrink-0">
                    {module.completedLessons}/{module.totalLessons}
                  </span>
                </div>
              </div>
            </button>

            {/* Lessons — CSS grid trick for smooth height transition */}
            <div
              style={{
                display: "grid",
                gridTemplateRows: isExpanded ? "1fr" : "0fr",
                transition: "grid-template-rows 280ms cubic-bezier(0.32, 0.72, 0, 1)",
              }}
            >
              <div className="overflow-hidden">
                <div className="border-t border-asa-border divide-y divide-asa-border/50">
                  {module.lessons.map((lesson) => (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLesson(lesson)}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-asa-bg transition-colors text-left"
                    >
                      {lesson.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-asa-primary shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-asa-muted shrink-0" />
                      )}
                      <span className="flex-1 text-sm text-asa-text truncate">{lesson.title}</span>
                      <span className="text-asa-muted shrink-0">
                        {contentTypeIcon(lesson.contentType)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Lesson Drawer */}
      <Drawer
        open={!!selectedLesson}
        onClose={() => setSelectedLesson(null)}
        title={selectedLesson?.title ?? ""}
      >
        {selectedLesson && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <ContentTypeBadge type={selectedLesson.contentType} />
              {!selectedLesson.completed ? (
                <button
                  className="btn-primary flex items-center gap-2 text-sm"
                  onClick={() => completeMutation.mutate(selectedLesson.id)}
                  disabled={completeMutation.isPending}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {completeMutation.isPending ? "Guardando…" : "Marcar completada"}
                </button>
              ) : (
                <span className="flex items-center gap-1.5 text-sm text-asa-primary font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Completada
                </span>
              )}
            </div>
            <LessonContent lesson={selectedLesson} />
          </div>
        )}
      </Drawer>
    </div>
  );
}

// ── Sortable Module Item ──────────────────────────────────────────────────────

function SortableModuleItem({
  module,
  header,
  children,
}: {
  module: Module;
  header: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: module.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="panel space-y-3"
    >
      <div className="flex items-center gap-2">
        <button
          className="btn-icon cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
          title="Arrastrar para reordenar"
        >
          <GripVertical className="w-4 h-4 text-asa-muted" />
        </button>
        {header}
      </div>
      {children}
    </div>
  );
}

// ── Leader Editor (task 4.5) ──────────────────────────────────────────────────

const moduleSchema = z.object({ title: z.string().min(2, "Mínimo 2 caracteres") });
type ModuleForm = z.infer<typeof moduleSchema>;

const lessonSchema = z.object({
  title: z.string().min(2, "Mínimo 2 caracteres"),
  contentType: z.enum(["TEXT", "VIDEO", "PDF"]),
  contentUrl: z.string().optional(),
});
type LessonForm = z.infer<typeof lessonSchema>;

function LeaderEditor({
  programId,
  modules,
}: {
  programId: string;
  modules: Module[];
}) {
  const queryClient = useQueryClient();
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [lessonModal, setLessonModal] = useState<{
    type: "create" | "edit";
    moduleId: string;
    lesson?: Lesson;
  } | null>(null);
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const refetch = () =>
    queryClient.invalidateQueries({ queryKey: ["modules", programId] });

  const createModuleMutation = useMutation({
    mutationFn: (title: string) =>
      apiClient.post(`/api/v1/programs/${programId}/modules`, { title }),
    onSuccess: refetch,
  });

  const updateModuleMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      apiClient.put(`/api/v1/modules/${id}`, { title }),
    onSuccess: () => {
      setEditingModule(null);
      refetch();
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/modules/${id}`),
    onSuccess: refetch,
  });

  const reorderModuleMutation = useMutation({
    mutationFn: ({ id, orderIndex }: { id: string; orderIndex: number }) =>
      apiClient.put(`/api/v1/modules/${id}/reorder`, { orderIndex }),
  });

  const createLessonMutation = useMutation({
    mutationFn: (data: LessonForm & { moduleId: string }) =>
      apiClient.post(`/api/v1/modules/${data.moduleId}/lessons`, {
        title: data.title,
        contentType: data.contentType,
        contentUrl: data.contentUrl || null,
      }),
    onSuccess: () => {
      setLessonModal(null);
      refetch();
    },
  });

  const updateLessonMutation = useMutation({
    mutationFn: (data: LessonForm & { id: string }) =>
      apiClient.put(`/api/v1/lessons/${data.id}`, {
        title: data.title,
        contentUrl: data.contentUrl || null,
      }),
    onSuccess: () => {
      setLessonModal(null);
      refetch();
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/lessons/${id}`),
    onSuccess: refetch,
  });

  const sortedModules = [...modules].sort((a, b) => a.orderIndex - b.orderIndex);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = sortedModules.findIndex((m) => m.id === active.id);
    const newIdx = sortedModules.findIndex((m) => m.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const reordered = [...sortedModules];
    const [moved] = reordered.splice(oldIdx, 1);
    reordered.splice(newIdx, 0, moved);

    reordered.forEach((m, idx) => {
      if (m.orderIndex !== idx) {
        reorderModuleMutation.mutate({ id: m.id, orderIndex: idx });
      }
    });

    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/programs"
            className="flex items-center gap-1.5 text-sm text-asa-muted hover:text-asa-primary"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h2 className="text-2xl font-bold text-asa-text">Editor de contenido</h2>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => createModuleMutation.mutate("Nuevo módulo")}
          disabled={createModuleMutation.isPending}
        >
          <Plus className="w-4 h-4" /> Agregar módulo
        </button>
      </div>

      {sortedModules.length === 0 && (
        <div className="panel text-center py-12 text-asa-muted">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-asa-primary/30" />
          <p>Aún no hay módulos. Haz clic en "Agregar módulo" para comenzar.</p>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortedModules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
          {sortedModules.map((module) => {
            const isExpanded = expandedModules.has(module.id);
            const isEditing = editingModule === module.id;

            return (
              <SortableModuleItem
                key={module.id}
                module={module}
                header={
                  <>
                    <button
                      onClick={() => toggleModule(module.id)}
                      className="btn-icon"
                      aria-label={isExpanded ? "Colapsar módulo" : "Expandir módulo"}
                    >
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      />
                    </button>

                    {isEditing ? (
                      <InlineEdit
                        defaultValue={module.title}
                        onSave={(title) =>
                          updateModuleMutation.mutate({ id: module.id, title })
                        }
                        onCancel={() => setEditingModule(null)}
                      />
                    ) : (
                      <span className="flex-1 font-semibold">{module.title}</span>
                    )}

                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        className="btn-icon"
                        onClick={() => setEditingModule(module.id)}
                        aria-label="Editar título del módulo"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        className="btn-icon text-asa-error hover:bg-red-50"
                        onClick={() => {
                          if (confirm("¿Eliminar este módulo y todas sus lecciones?")) {
                            deleteModuleMutation.mutate(module.id);
                          }
                        }}
                        aria-label="Eliminar módulo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                }
              >
                {isExpanded && (
                  <div className="pl-8 space-y-2">
                    {module.lessons.length === 0 && (
                      <p className="text-sm text-asa-muted">
                        Sin lecciones. Agrega una abajo.
                      </p>
                    )}
                    {module.lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-asa-bg transition-colors"
                      >
                        <ContentTypeBadge type={lesson.contentType} />
                        <button
                          className="flex-1 text-sm text-left hover:text-asa-primary transition-colors truncate"
                          onClick={() => setPreviewLesson(lesson)}
                          title="Ver lección"
                        >
                          {lesson.title}
                        </button>
                        <button
                          className="btn-icon"
                          aria-label="Editar lección"
                          onClick={() =>
                            setLessonModal({
                              type: "edit",
                              moduleId: module.id,
                              lesson,
                            })
                          }
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="btn-icon text-asa-error hover:bg-red-50"
                          aria-label="Eliminar lección"
                          onClick={() => {
                            if (confirm("¿Eliminar esta lección?")) {
                              deleteLessonMutation.mutate(lesson.id);
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <button
                      className="btn-outline flex items-center gap-2 text-sm"
                      onClick={() =>
                        setLessonModal({ type: "create", moduleId: module.id })
                      }
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar lección
                    </button>
                  </div>
                )}
              </SortableModuleItem>
            );
          })}
        </SortableContext>
      </DndContext>

      {/* Lesson Modal */}
      {lessonModal && (
        <LessonModal
          type={lessonModal.type}
          lesson={lessonModal.lesson}
          onClose={() => setLessonModal(null)}
          onSubmit={(data) => {
            if (lessonModal.type === "create") {
              createLessonMutation.mutate({ ...data, moduleId: lessonModal.moduleId });
            } else if (lessonModal.lesson) {
              updateLessonMutation.mutate({ ...data, id: lessonModal.lesson.id });
            }
          }}
          isPending={createLessonMutation.isPending || updateLessonMutation.isPending}
        />
      )}

      {/* Lesson preview Drawer */}
      <Drawer
        open={!!previewLesson}
        onClose={() => setPreviewLesson(null)}
        title={previewLesson?.title ?? "Lección"}
      >
        {previewLesson && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ContentTypeBadge type={previewLesson.contentType} />
            </div>
            <LessonContent lesson={previewLesson} />
          </div>
        )}
      </Drawer>
    </div>
  );
}

// ── Inline Edit ───────────────────────────────────────────────────────────────

function InlineEdit({
  defaultValue,
  onSave,
  onCancel,
}: {
  defaultValue: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="flex items-center gap-2 flex-1">
      <input
        className="input-field flex-1 text-sm"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(value);
          if (e.key === "Escape") onCancel();
        }}
        autoFocus
      />
      <button className="btn-primary text-xs px-3 py-1" onClick={() => onSave(value)}>
        Guardar
      </button>
    </div>
  );
}

// ── Content Type Badge ────────────────────────────────────────────────────────

function ContentTypeBadge({ type }: { type: string }) {
  const config = {
    VIDEO: { label: "VIDEO", icon: <Video className="w-3 h-3" />, color: "text-blue-600 bg-blue-50" },
    PDF:   { label: "PDF",   icon: <FileText className="w-3 h-3" />, color: "text-red-600 bg-red-50" },
    TEXT:  { label: "TEXTO", icon: <BookOpen className="w-3 h-3" />, color: "text-green-600 bg-green-50" },
  } as const;
  const c = config[type as keyof typeof config] ?? config.TEXT;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${c.color}`}>
      {c.icon} {c.label}
    </span>
  );
}

// ── Lesson Modal ──────────────────────────────────────────────────────────────

function LessonModal({
  type,
  lesson,
  onClose,
  onSubmit,
  isPending,
}: {
  type: "create" | "edit";
  lesson?: Lesson;
  onClose: () => void;
  onSubmit: (data: LessonForm) => void;
  isPending: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LessonForm>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: lesson?.title ?? "",
      contentType: lesson?.contentType ?? "TEXT",
      contentUrl: lesson?.contentUrl ?? "",
    },
  });

  const contentType = watch("contentType");
  const contentLabel =
    contentType === "VIDEO"
      ? "URL del video (YouTube / Vimeo)"
      : contentType === "PDF"
      ? "URL del PDF"
      : "Contenido";
  const contentPlaceholder =
    contentType === "VIDEO"
      ? "https://www.youtube.com/watch?v=..."
      : "https://ejemplo.com/documento.pdf";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        style={{ boxShadow: "var(--shadow-elevated)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-asa-border shrink-0">
          <div className="flex items-center gap-3">
            {type === "create"
              ? <Plus className="w-5 h-5 text-asa-primary" />
              : <Edit3 className="w-5 h-5 text-asa-primary" />
            }
            <h2 className="text-lg font-semibold text-asa-text">
              {type === "create" ? "Nueva lección" : "Editar lección"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-asa-text mb-1.5">
                Título <span className="text-asa-error">*</span>
              </label>
              <input
                className={`input-field w-full ${errors.title ? "error" : ""}`}
                placeholder="Ej. Introducción al módulo"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-xs text-asa-error mt-1">{errors.title.message}</p>
              )}
            </div>

            {type === "create" && (
              <div>
                <label className="block text-sm font-medium text-asa-text mb-1.5">Tipo de contenido</label>
                <select className="input-field w-full" {...register("contentType")}>
                  <option value="TEXT">Texto enriquecido</option>
                  <option value="VIDEO">Video (YouTube / Vimeo)</option>
                  <option value="PDF">PDF</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-asa-text mb-1.5">{contentLabel}</label>
              {contentType === "TEXT" ? (
                <RichTextEditor
                  value={lesson?.contentUrl ?? ""}
                  onChange={(html) => setValue("contentUrl", html)}
                  placeholder="Escribe el contenido de la lección aquí..."
                  minHeight="200px"
                />
              ) : (
                <>
                  <input
                    className="input-field w-full"
                    placeholder={contentPlaceholder}
                    {...register("contentUrl")}
                  />
                  <p className="mt-1 text-xs text-asa-muted">
                    {contentType === "VIDEO"
                      ? "Soporta YouTube y Vimeo"
                      : "URL directa al archivo PDF"}
                  </p>
                </>
              )}
            </div>

            {/* Footer inside form */}
            <div className="flex justify-end gap-3 pt-3 border-t border-asa-border">
              <button type="button" className="btn-outline" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={isPending}>
                {isPending
                  ? "Guardando…"
                  : type === "create"
                  ? "Crear lección"
                  : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProgramContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: programId } = use(params);

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });

  const { data: modules = [], isLoading: loadingModules } = useQuery({
    queryKey: ["modules", programId],
    queryFn: () => fetchModules(programId),
    enabled: !!programId,
  });

  if (loadingUser || loadingModules) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-asa-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const isLeader = user?.roles?.some((r) =>
    ["PROGRAM_LEADER", "ADMIN", "SUPER_ADMIN"].includes(r)
  );

  if (isLeader) {
    return <LeaderEditor programId={programId} modules={modules} />;
  }

  return <StudentStudyView programId={programId} modules={modules} />;
}
