"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, UserPlus, Send, RefreshCw, Mail, UserCog, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/axios";
import { formatDate } from "@/lib/dates";
import { Drawer } from "@/components/Drawer";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Enrollment {
  id: string; programId: string; userId: string; userEmail: string;
  status: string; enrolledAt: string; finalGrade: number | null;
}

interface Invitation {
  id: string; email: string; status: "PENDING" | "ACCEPTED" | "EXPIRED";
  createdAt: string; expiresAt: string;
}

interface AdminUser {
  id: string; email: string; firstName?: string; lastName?: string;
  adminEligible: boolean; roles: string[];
}

interface Leader {
  id: string; email: string; firstName: string | null; lastName: string | null;
}

interface CurrentUser { userId: string; email: string; roles: string[] }

// ── Config ────────────────────────────────────────────────────────────────────

const ENROLLMENT_STATUS: Record<string, { label: string; color: string }> = {
  ENROLLED:  { label: "Matriculado",  color: "text-blue-700 bg-blue-50" },
  COMPLETED: { label: "Completado",   color: "text-green-700 bg-green-50" },
  DROPPED:   { label: "Abandonado",   color: "text-gray-500 bg-gray-100" },
};

const INVITE_STATUS: Record<string, { label: string; color: string }> = {
  PENDING:  { label: "Pendiente",  color: "text-amber-700 bg-amber-50" },
  ACCEPTED: { label: "Aceptada",   color: "text-green-700 bg-green-50" },
  EXPIRED:  { label: "Vencida",    color: "text-gray-500 bg-gray-100" },
};

// ── Main component ─────────────────────────────────────────────────────────────

export function StudentsTab({ programId, isAdmin }: { programId: string; isAdmin?: boolean }) {
  const queryClient = useQueryClient();
  const [leaderDrawer, setLeaderDrawer]       = useState(false);
  const [inviteDrawer, setInviteDrawer]       = useState(false);
  const [selectedLeader, setSelectedLeader]   = useState<string>("");
  const [emailInput, setEmailInput]           = useState("");
  const [emails, setEmails]                   = useState<string[]>([]);
  const [inviteSent, setInviteSent]           = useState(false);
  const [resendTarget, setResendTarget]       = useState<Invitation | null>(null);
  const [removeLeaderTarget, setRemoveLeaderTarget] = useState<Leader | null>(null);

  // Current user
  const { data: me } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: () => apiClient.get("/api/v1/auth/me").then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const isLeader = me?.roles?.some(r => ["PROGRAM_LEADER", "ADMIN", "SUPER_ADMIN"].includes(r)) ?? false;

  // Enrollments
  const { data: enrollData, isLoading: loadingEnroll } = useQuery<{ content: Enrollment[] }>({
    queryKey: ["enrollments", programId],
    queryFn: () => apiClient.get(`/api/v1/programs/${programId}/enrollments?size=50`).then(r => r.data),
  });

  // Invitations
  const { data: inviteData, isLoading: loadingInvites } = useQuery<{ content: Invitation[] }>({
    queryKey: ["invitations", programId],
    queryFn: () => apiClient.get(`/api/v1/programs/${programId}/invitations?size=50`).then(r => r.data),
    enabled: isLeader,
  });

  // Admin-eligible users for leader assignment
  const { data: eligibleUsers } = useQuery<{ content: AdminUser[] }>({
    queryKey: ["admin-users-eligible"],
    queryFn: () => apiClient.get("/api/v1/admin/users?size=100").then(r => r.data),
    enabled: leaderDrawer,
    select: d => ({ content: d.content.filter((u: AdminUser) => u.adminEligible) }),
  });

  // Mutations
  const assignLeaderMutation = useMutation({
    mutationFn: (userId: string) =>
      apiClient.post(`/api/v1/programs/${programId}/leaders`, { userId }),
    onSuccess: () => {
      setLeaderDrawer(false);
      setSelectedLeader("");
      queryClient.invalidateQueries({ queryKey: ["program-leaders", programId] });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: () => apiClient.post(`/api/v1/programs/${programId}/invitations`, { emails }),
    onSuccess: () => {
      setInviteSent(true);
      setEmails([]);
      queryClient.invalidateQueries({ queryKey: ["invitations", programId] });
    },
  });

  const resendMutation = useMutation({
    mutationFn: (invitationId: string) =>
      apiClient.post(`/api/v1/invitations/${invitationId}/resend`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations", programId] });
      setResendTarget(null);
    },
  });

  // Leaders
  const { data: leadersData = [] } = useQuery<Leader[]>({
    queryKey: ["program-leaders", programId],
    queryFn: () => apiClient.get(`/api/v1/programs/${programId}/leaders`).then(r => r.data),
  });

  const removeLeaderMutation = useMutation({
    mutationFn: (userId: string) =>
      apiClient.delete(`/api/v1/programs/${programId}/leaders/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-leaders", programId] });
      setRemoveLeaderTarget(null);
    },
  });

  const enrollments = enrollData?.content ?? [];
  const invitations = inviteData?.content ?? [];
  const eligible = eligibleUsers?.content ?? [];

  const addEmail = () => {
    const t = emailInput.trim();
    if (t && !emails.includes(t)) { setEmails(prev => [...prev, t]); setEmailInput(""); }
  };

  return (
    <div className="space-y-6">
      {/* Enrolled students */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-asa-text flex items-center gap-2">
            <Users className="w-4 h-4 text-asa-primary" />
            Matriculados
            <span className="text-xs text-asa-muted font-normal">({enrollments.length})</span>
          </h3>
          {isAdmin && (
            <button onClick={() => setLeaderDrawer(true)} className="btn-outline text-sm">
              <UserPlus className="w-3.5 h-3.5" /> Asignar líder
            </button>
          )}
        </div>

        {loadingEnroll ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-14 bg-asa-border/40 rounded-xl animate-pulse" />)}
          </div>
        ) : enrollments.length === 0 ? (
          <div className="bg-white rounded-xl border border-asa-border shadow-subtle p-10 text-center">
            <Users className="w-9 h-9 mx-auto text-asa-primary/30 mb-2" />
            <p className="text-asa-muted text-sm">Aún no hay estudiantes matriculados.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {enrollments.map(e => {
              const sc = ENROLLMENT_STATUS[e.status] ?? ENROLLMENT_STATUS.ENROLLED;
              return (
                <div key={e.id} className="bg-white rounded-xl border border-asa-border p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-asa-highlight flex items-center justify-center text-sm font-bold text-asa-primary shrink-0">
                    {e.userEmail.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-asa-text text-sm truncate">{e.userEmail}</p>
                    <p className="text-xs text-asa-muted">Matriculado: {formatDate(e.enrolledAt)}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${sc.color}`}>
                    {sc.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Invitations — leaders only */}
      {isLeader && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-asa-text flex items-center gap-2">
              <Mail className="w-4 h-4 text-asa-primary" />
              Invitaciones
              <span className="text-xs text-asa-muted font-normal">({invitations.length})</span>
            </h3>
            <button onClick={() => { setInviteDrawer(true); setInviteSent(false); }} className="btn-primary text-sm">
              <Send className="w-3.5 h-3.5" /> Invitar estudiantes
            </button>
          </div>

          {loadingInvites ? (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="h-12 bg-asa-border/40 rounded-xl animate-pulse" />)}
            </div>
          ) : invitations.length === 0 ? (
            <div className="bg-white rounded-xl border border-asa-border shadow-subtle p-8 text-center">
              <Send className="w-8 h-8 mx-auto text-asa-primary/30 mb-2" />
              <p className="text-sm text-asa-muted">No se han enviado invitaciones aún.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invitations.map(inv => {
                const sc = INVITE_STATUS[inv.status] ?? INVITE_STATUS.PENDING;
                const canResend = inv.status === "PENDING" || inv.status === "EXPIRED";
                return (
                  <div key={inv.id} className="bg-white rounded-xl border border-asa-border p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-asa-text truncate">{inv.email}</p>
                      <p className="text-xs text-asa-muted">Enviada: {formatDate(inv.createdAt)}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${sc.color}`}>
                      {sc.label}
                    </span>
                    {canResend && (
                      <button
                        onClick={() => setResendTarget(inv)}
                        className="btn-icon shrink-0"
                        title="Reenviar invitación"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Leaders section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-asa-text flex items-center gap-2">
            <UserCog className="w-4 h-4 text-asa-primary" />
            Líderes
            <span className="text-xs text-asa-muted font-normal">({leadersData.length})</span>
          </h3>
        </div>
        {leadersData.length === 0 ? (
          <div className="bg-white rounded-xl border border-asa-border shadow-subtle p-8 text-center">
            <UserCog className="w-8 h-8 mx-auto text-asa-primary/30 mb-2" />
            <p className="text-sm text-asa-muted">Sin líderes asignados.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leadersData.map(l => {
              const displayName = l.firstName && l.lastName ? `${l.firstName} ${l.lastName}` : l.email;
              return (
                <div key={l.id} className="bg-white rounded-xl border border-asa-border p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-asa-highlight flex items-center justify-center text-sm font-bold text-asa-primary shrink-0">
                    {l.email.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-asa-text truncate">{displayName}</p>
                    {l.firstName && <p className="text-xs text-asa-muted truncate">{l.email}</p>}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => setRemoveLeaderTarget(l)}
                      className="btn-icon text-asa-error hover:bg-red-50 shrink-0"
                      title="Remover líder"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Remove leader confirm */}
      <ConfirmDialog
        open={!!removeLeaderTarget}
        title="¿Remover líder?"
        description={`${removeLeaderTarget?.firstName ? `${removeLeaderTarget.firstName} ${removeLeaderTarget.lastName}` : removeLeaderTarget?.email} dejará de ser líder de este programa.`}
        confirmLabel="Remover"
        destructive
        isPending={removeLeaderMutation.isPending}
        onConfirm={() => removeLeaderTarget && removeLeaderMutation.mutate(removeLeaderTarget.id)}
        onCancel={() => setRemoveLeaderTarget(null)}
      />

      {/* Assign leader drawer */}
      <Drawer
        open={leaderDrawer}
        onClose={() => { setLeaderDrawer(false); setSelectedLeader(""); }}
        title="Asignar líder de programa"
      >
        <div className="space-y-5">
          <p className="text-sm text-asa-muted">
            Selecciona un usuario con dominio ASA para asignarlo como líder de este programa.
          </p>
          <div>
            <label className="block text-sm font-medium text-asa-text mb-1.5">Usuario elegible</label>
            <select className="input-field" value={selectedLeader} onChange={e => setSelectedLeader(e.target.value)}>
              <option value="">Seleccionar usuario…</option>
              {eligible.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
            </select>
          </div>
          {assignLeaderMutation.isError && (
            <p className="text-xs text-asa-error bg-red-50 rounded-lg px-3 py-2">
              Error al asignar líder.
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setLeaderDrawer(false); setSelectedLeader(""); }} className="btn-outline flex-1 justify-center">
              Cancelar
            </button>
            <button
              onClick={() => selectedLeader && assignLeaderMutation.mutate(selectedLeader)}
              disabled={!selectedLeader || assignLeaderMutation.isPending}
              className="btn-primary flex-1 justify-center"
            >
              {assignLeaderMutation.isPending ? "Asignando..." : "Asignar"}
            </button>
          </div>
        </div>
      </Drawer>

      {/* Invite drawer */}
      <Drawer
        open={inviteDrawer}
        onClose={() => { setInviteDrawer(false); setEmails([]); setEmailInput(""); setInviteSent(false); }}
        title="Invitar estudiantes"
      >
        {inviteSent ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
              <Send className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-asa-text">¡Invitaciones enviadas!</p>
              <p className="text-sm text-asa-muted mt-1">Los correos recibirán el enlace en breve.</p>
            </div>
            <button
              onClick={() => { setInviteDrawer(false); setEmails([]); setInviteSent(false); }}
              className="btn-primary"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-asa-text mb-1.5">
                Correos electrónicos
                <span className="text-xs text-asa-muted font-normal ml-1">(Enter para agregar)</span>
              </label>
              <div
                className="input-field min-h-[80px] flex flex-wrap gap-1.5 cursor-text"
                onClick={() => document.getElementById("inviteEmailInput")?.focus()}
              >
                {emails.map(e => (
                  <span key={e} className="flex items-center gap-1 text-xs bg-asa-highlight text-asa-primary px-2 py-0.5 rounded-full">
                    {e}
                    <button onClick={() => setEmails(prev => prev.filter(x => x !== e))} className="hover:opacity-70">×</button>
                  </span>
                ))}
                <input
                  id="inviteEmailInput"
                  type="email"
                  className="flex-1 min-w-[160px] border-none outline-none bg-transparent text-sm"
                  placeholder={emails.length === 0 ? "estudiante@email.com" : ""}
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addEmail(); } }}
                />
              </div>
              {emailInput && (
                <button onClick={addEmail} className="mt-1 text-xs text-asa-primary hover:underline">
                  + Agregar "{emailInput}"
                </button>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setInviteDrawer(false); setEmails([]); setEmailInput(""); }} className="btn-outline flex-1 justify-center">
                Cancelar
              </button>
              <button
                onClick={() => inviteMutation.mutate()}
                disabled={emails.length === 0 || inviteMutation.isPending}
                className="btn-primary flex-1 justify-center"
              >
                {inviteMutation.isPending ? "Enviando..." : `Invitar (${emails.length})`}
              </button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Resend confirm dialog */}
      <ConfirmDialog
        open={!!resendTarget}
        title="¿Reenviar invitación?"
        description={`Se enviará nuevamente el enlace de invitación a ${resendTarget?.email}. La invitación se renovará por 7 días.`}
        confirmLabel="Reenviar"
        isPending={resendMutation.isPending}
        onConfirm={() => resendTarget && resendMutation.mutate(resendTarget.id)}
        onCancel={() => setResendTarget(null)}
      />
    </div>
  );
}
