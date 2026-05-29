"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Newspaper, MessageSquare, Plus, Trash2, Reply, MoreVertical, ArrowLeft, ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/axios";
import { RichTextEditor } from "@/components/RichTextEditor";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NewsItem {
  id: string; programId: string; authorId: string; authorEmail: string;
  title: string; content: string; publishedAt: string;
}

interface ForumPost {
  id: string; forumId: string; parentPostId: string | null;
  authorId: string; authorEmail: string; content: string;
  deleted: boolean; createdAt: string; replies: ForumPost[];
}

interface CurrentUser { userId: string; email: string; roles: string[] }

// ── Fetch helpers ─────────────────────────────────────────────────────────────

const fetchMe = () => apiClient.get("/api/v1/auth/me").then(r => r.data as CurrentUser);
const fetchNews = (pid: string) => apiClient.get(`/api/v1/programs/${pid}/news?size=20`).then(r => r.data.content as NewsItem[]);
const fetchForum = (pid: string) => apiClient.get(`/api/v1/programs/${pid}/forum`).then(r => r.data as ForumPost[]);

// ── News Card (accordion) ─────────────────────────────────────────────────────

function NewsCard({ item, isLeader, onDelete }: { item: NewsItem; isLeader: boolean; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const preview = item.content.length > 120 ? item.content.slice(0, 120) + "…" : item.content;

  return (
    <div className="bg-white rounded-2xl border border-asa-border shadow-subtle overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-asa-text leading-snug">{item.title}</h3>
            <p className="text-xs text-asa-muted mt-1">
              {item.authorEmail} · {new Date(item.publishedAt).toLocaleDateString("es-EC")}
            </p>
          </div>
          {isLeader && (
            <button
              className="btn-icon text-asa-error hover:bg-red-50 shrink-0"
              onClick={() => confirm("¿Eliminar esta noticia?") && onDelete()}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateRows: expanded ? "1fr" : "0fr",
            transition: "grid-template-rows 280ms cubic-bezier(0.32, 0.72, 0, 1)",
            marginTop: expanded ? "0.75rem" : 0,
            transitionProperty: "grid-template-rows, margin-top",
          }}
        >
          <div className="overflow-hidden">
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: item.content }} />
          </div>
        </div>

        {!expanded && (
          <p className="text-sm text-asa-muted mt-2 line-clamp-2">{preview}</p>
        )}
      </div>

      {item.content.length > 120 && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-center gap-1 py-2.5 text-xs font-medium text-asa-primary hover:bg-asa-bg transition-colors border-t border-asa-border"
        >
          {expanded ? "Ver menos" : "Ver más"}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}

// ── News Tab ──────────────────────────────────────────────────────────────────

function NewsTab({ programId, isLeader }: { programId: string; isLeader: boolean }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState(""); const [content, setContent] = useState("");

  const { data: news = [] } = useQuery({ queryKey: ["news", programId], queryFn: () => fetchNews(programId) });

  const createMutation = useMutation({
    mutationFn: () => apiClient.post(`/api/v1/programs/${programId}/news`, { title, content }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["news", programId] }); setShowForm(false); setTitle(""); setContent(""); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/news/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["news", programId] }),
  });

  return (
    <div className="space-y-4">
      {isLeader && (
        <div className="flex justify-end">
          <button onClick={() => setShowForm(v => !v)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nueva noticia
          </button>
        </div>
      )}

      {showForm && isLeader && (
        <div className="panel space-y-3">
          <h3 className="font-semibold">Nueva noticia</h3>
          <input className="input-field" placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} />
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Contenido de la noticia..."
            minHeight="100px"
          />
          <div className="flex gap-2 justify-end">
            <button className="btn-outline" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn-primary" onClick={() => createMutation.mutate()} disabled={!title || !content || createMutation.isPending}>
              {createMutation.isPending ? "Publicando…" : "Publicar"}
            </button>
          </div>
        </div>
      )}

      {news.length === 0 && (
        <div className="panel text-center py-12 text-asa-muted">
          <Newspaper className="w-10 h-10 mx-auto mb-3 text-asa-primary/30" />
          <p>No hay noticias publicadas aún.</p>
        </div>
      )}

      {news.map(item => (
        <NewsCard key={item.id} item={item} isLeader={isLeader} onDelete={() => deleteMutation.mutate(item.id)} />
      ))}
    </div>
  );
}

// ── Forum Tab ─────────────────────────────────────────────────────────────────

function ForumPost({ post, programId, isLeader, onReply, onDelete }: {
  post: ForumPost; programId: string; isLeader: boolean;
  onReply: (parentId: string) => void; onDelete: (id: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="space-y-2">
      <div className={`panel p-4 ${post.parentPostId ? "ml-8 border-l-2 border-asa-primary/20" : ""}`}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-asa-highlight flex items-center justify-center text-xs font-bold text-asa-primary shrink-0">
            {post.authorEmail.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-asa-text">{post.authorEmail}</span>
              <span className="text-xs text-asa-muted">{new Date(post.createdAt).toLocaleString("es-EC")}</span>
            </div>
            {post.deleted ? (
              <p className="text-sm text-asa-muted italic">Mensaje eliminado</p>
            ) : (
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
            )}
          </div>

          {/* Actions */}
          <div className="relative shrink-0">
            {!post.deleted && (
              <div className="flex items-center gap-1">
                {!post.parentPostId && (
                  <button className="btn-icon" onClick={() => onReply(post.id)} title="Responder">
                    <Reply className="w-3.5 h-3.5" />
                  </button>
                )}
                {isLeader && (
                  <button className="btn-icon" onClick={() => setShowMenu(v => !v)}>
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            {showMenu && (
              <div className="absolute right-0 top-8 bg-white border border-asa-border rounded-lg shadow-card z-10 py-1 min-w-[140px]">
                <button className="w-full text-left px-3 py-2 text-sm text-asa-error hover:bg-red-50 flex items-center gap-2"
                  onClick={() => { onDelete(post.id); setShowMenu(false); }}>
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {post.replies?.map(reply => (
        <ForumPost key={reply.id} post={reply} programId={programId}
          isLeader={isLeader} onReply={onReply} onDelete={onDelete} />
      ))}
    </div>
  );
}

function ForumTab({ programId, isLeader }: { programId: string; isLeader: boolean }) {
  const queryClient = useQueryClient();
  const [newPostContent, setNewPostContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const { data: posts = [] } = useQuery({ queryKey: ["forum", programId], queryFn: () => fetchForum(programId) });

  const createMutation = useMutation({
    mutationFn: (params: { content: string; parentPostId: string | null }) =>
      apiClient.post(`/api/v1/programs/${programId}/forum/posts`, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum", programId] });
      setNewPostContent("");
      setReplyTo(null);
      setReplyContent("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/forums/posts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forum", programId] }),
  });

  return (
    <div className="space-y-4">
      {/* New post form */}
      <div className="panel space-y-3">
        <h3 className="text-sm font-semibold text-asa-text">Nuevo mensaje</h3>
        <RichTextEditor
          value={newPostContent}
          onChange={setNewPostContent}
          placeholder="Escribe un nuevo mensaje en el foro..."
          minHeight="80px"
        />
        <div className="flex justify-end">
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => createMutation.mutate({ content: newPostContent, parentPostId: null })}
            disabled={!newPostContent.replace(/<[^>]+>/g, "").trim() || createMutation.isPending}
          >
            <MessageSquare className="w-4 h-4" />
            {createMutation.isPending ? "Publicando…" : "Publicar"}
          </button>
        </div>
      </div>

      {posts.length === 0 && (
        <div className="panel text-center py-12 text-asa-muted">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 text-asa-primary/30" />
          <p>El foro está vacío. ¡Sé el primero en publicar!</p>
        </div>
      )}

      {posts.map(post => (
        <div key={post.id}>
          <ForumPost post={post} programId={programId}
            isLeader={isLeader}
            onReply={id => { setReplyTo(replyTo === id ? null : id); setReplyContent(""); }}
            onDelete={id => { if (confirm("¿Eliminar este mensaje?")) deleteMutation.mutate(id); }} />

          {/* Inline reply editor at the bottom of the thread */}
          {replyTo === post.id && (
            <div className="ml-8 mt-2 panel space-y-3 border-l-2 border-asa-primary/20">
              <div className="flex items-center gap-2 text-xs text-asa-primary">
                <Reply className="w-3.5 h-3.5" />
                Respondiendo a este hilo
              </div>
              <RichTextEditor
                value={replyContent}
                onChange={setReplyContent}
                placeholder="Escribe tu respuesta..."
                minHeight="80px"
              />
              <div className="flex gap-2 justify-end">
                <button className="btn-outline text-sm" onClick={() => { setReplyTo(null); setReplyContent(""); }}>
                  Cancelar
                </button>
                <button
                  className="btn-primary flex items-center gap-2 text-sm"
                  onClick={() => createMutation.mutate({ content: replyContent, parentPostId: post.id })}
                  disabled={!replyContent.replace(/<[^>]+>/g, "").trim() || createMutation.isPending}
                >
                  <Reply className="w-3.5 h-3.5" />
                  {createMutation.isPending ? "Enviando…" : "Responder"}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CommunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: programId } = use(params);
  const [tab, setTab] = useState<"news" | "forum">("news");

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const isLeader = user?.roles?.some(r => ["PROGRAM_LEADER", "ADMIN", "SUPER_ADMIN"].includes(r)) ?? false;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/programs" className="btn-icon">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold text-asa-text">Comunidad</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-asa-bg rounded-xl p-1 w-fit">
        <button onClick={() => setTab("news")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "news" ? "bg-white text-asa-primary shadow-subtle" : "text-asa-muted hover:text-asa-text"
          }`}>
          <Newspaper className="w-4 h-4" /> Noticias
        </button>
        <button onClick={() => setTab("forum")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "forum" ? "bg-white text-asa-primary shadow-subtle" : "text-asa-muted hover:text-asa-text"
          }`}>
          <MessageSquare className="w-4 h-4" /> Foro
        </button>
      </div>

      {tab === "news"  && <NewsTab  programId={programId} isLeader={isLeader} />}
      {tab === "forum" && <ForumTab programId={programId} isLeader={isLeader} />}
    </div>
  );
}
