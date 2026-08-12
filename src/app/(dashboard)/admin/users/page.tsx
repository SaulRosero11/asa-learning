"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Plus, Shield, Users, KeyRound, X } from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/axios";
import { Drawer } from "@/components/Drawer";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const ASSIGNABLE_ROLES = ["PROGRAM_LEADER", "ADMIN"];

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN:    "bg-purple-100 text-purple-700",
  ADMIN:          "bg-asa-highlight text-asa-primary",
  PROGRAM_LEADER: "bg-blue-50 text-blue-700",
  STUDENT:        "bg-gray-100 text-gray-600",
};

// ── Create user form schema ────────────────────────────────────────────────────

const createUserSchema = z.object({
  email: z
    .string()
    .email("Correo inválido")
    .endsWith("@solidaridadyaccion.org", "Solo se permiten correos @solidaridadyaccion.org"),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .max(64, "Máximo 64 caracteres")
    .regex(/[A-Z]/, "Debe tener al menos una letra mayúscula")
    .regex(/[a-z]/, "Debe tener al menos una letra minúscula")
    .regex(/[0-9]/, "Debe tener al menos un número"),
  role: z.enum(["PROGRAM_LEADER", "ADMIN"]),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

async function fetchUsers(page = 0) {
  const res = await apiClient.get(`/api/v1/admin/users?page=${page}&size=20`);
  return res.data;
}

// ── UserCard ──────────────────────────────────────────────────────────────────

function UserCard({ user, onAssignRole, onRevokeRole, onResetPassword, revoking }: {
  user: any;
  onAssignRole: (user: any) => void;
  onRevokeRole: (userId: string, roleName: string) => void;
  onResetPassword: (user: any) => void;
  revoking: boolean;
}) {
  const initials = user.email ? user.email.slice(0, 2).toUpperCase() : "??";
  const displayName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : null;

  return (
    <div className="bg-white rounded-2xl border border-asa-border shadow-subtle p-5 flex flex-col gap-4">
      {/* Header */}
      <Link href={`/admin/users/${user.id}`} className="flex items-start gap-3 hover:opacity-80 transition-opacity">
        <div className="w-11 h-11 rounded-full bg-asa-highlight flex items-center justify-center text-sm font-bold text-asa-primary shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          {displayName && (
            <p className="font-semibold text-asa-text text-sm">{displayName}</p>
          )}
          <p className={`text-sm truncate ${displayName ? "text-asa-muted" : "font-semibold text-asa-text"}`}>
            {user.email}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {user.active ? "Activo" : "Inactivo"}
            </span>
            {user.adminEligible && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-asa-highlight text-asa-primary">
                ASA elegible
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Roles */}
      <div className="flex flex-wrap gap-1.5">
        {user.roles?.length === 0 && (
          <span className="text-xs text-asa-muted">Sin roles</span>
        )}
        {user.roles?.map((r: string) => (
          <span key={r} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[r] ?? "bg-gray-100 text-gray-600"}`}>
            {r.replace(/_/g, " ")}
            {ASSIGNABLE_ROLES.includes(r) && (
              <button
                onClick={() => onRevokeRole(user.id, r)}
                disabled={revoking}
                className="ml-0.5 opacity-60 hover:opacity-100"
                title={`Revocar ${r}`}
              >×</button>
            )}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {user.adminEligible && (
          <button
            onClick={() => onAssignRole(user)}
            className="btn-outline w-full justify-center text-sm"
          >
            <Shield className="w-3.5 h-3.5" /> Asignar rol
          </button>
        )}
        <button
          onClick={() => onResetPassword(user)}
          className="btn-outline w-full justify-center text-sm text-amber-600 border-amber-200 hover:border-amber-400 hover:text-amber-700"
        >
          <KeyRound className="w-3.5 h-3.5" /> Restablecer contraseña
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch]               = useState("");
  const [selectedUser, setSelectedUser]   = useState<any>(null);
  const [selectedRole, setSelectedRole]   = useState("PROGRAM_LEADER");
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [resetTarget, setResetTarget]     = useState<any>(null);
  const [resetSuccess, setResetSuccess]   = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchUsers() });

  const assignMutation = useMutation({
    mutationFn: ({ userId, roleName }: { userId: string; roleName: string }) =>
      apiClient.post(`/api/v1/admin/users/${userId}/roles`, { roleName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSelectedUser(null);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: ({ userId, roleName }: { userId: string; roleName: string }) =>
      apiClient.delete(`/api/v1/admin/users/${userId}/roles/${roleName}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateUserForm) => apiClient.post("/api/v1/admin/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDrawerOpen(false);
      createForm.reset();
    },
  });

  const resetMutation = useMutation({
    mutationFn: (userId: string) => apiClient.post(`/api/v1/admin/users/${userId}/reset-password`),
    onSuccess: () => {
      setResetSuccess(`Email de restablecimiento enviado a ${resetTarget?.email}`);
      setResetTarget(null);
      setTimeout(() => setResetSuccess(null), 4000);
    },
  });

  const createForm = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: "", password: "", role: "PROGRAM_LEADER" },
  });

  const users: any[] = data?.content ?? [];
  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.firstName?.toLowerCase().includes(search.toLowerCase()) ||
    u.lastName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Toast */}
      {resetSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <span>✓</span> {resetSuccess}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-asa-text">Gestión de Usuarios</h1>
          <p className="text-sm text-asa-muted mt-0.5">{data?.totalElements ?? 0} usuarios registrados</p>
        </div>
        <button onClick={() => setDrawerOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Nuevo usuario
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-asa-muted" size={16} />
        <input
          type="text"
          placeholder="Buscar por nombre o correo..."
          className="input-field pl-10"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* User cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-52 bg-asa-border/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-asa-border shadow-subtle p-14 text-center">
          <Users className="w-10 h-10 mx-auto text-asa-primary/30 mb-3" />
          <p className="text-asa-muted text-sm">No se encontraron usuarios.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((user: any) => (
            <UserCard
              key={user.id}
              user={user}
              onAssignRole={setSelectedUser}
              onRevokeRole={(userId, roleName) => revokeMutation.mutate({ userId, roleName })}
              onResetPassword={setResetTarget}
              revoking={revokeMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Assign role modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden" style={{ boxShadow: "var(--shadow-elevated)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-asa-border">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-asa-primary" />
                <h3 className="text-base font-semibold text-asa-text">Asignar rol</h3>
              </div>
              <button onClick={() => setSelectedUser(null)} className="btn-icon">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="p-3 bg-asa-bg rounded-xl">
                <p className="text-xs text-asa-muted mb-0.5">Usuario</p>
                <p className="text-sm font-medium text-asa-text">{selectedUser.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-asa-text mb-1.5">Rol a asignar</label>
                <select
                  className="input-field"
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                >
                  <option value="PROGRAM_LEADER">Líder de programa</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              {assignMutation.isError && (
                <p className="text-xs text-asa-error bg-red-50 rounded-lg px-3 py-2">
                  Error al asignar el rol. Inténtalo de nuevo.
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setSelectedUser(null)} className="btn-outline flex-1 justify-center">
                  Cancelar
                </button>
                <button
                  onClick={() => assignMutation.mutate({ userId: selectedUser.id, roleName: selectedRole })}
                  disabled={assignMutation.isPending}
                  className="btn-primary flex-1 justify-center"
                >
                  {assignMutation.isPending ? "Asignando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset password confirm dialog */}
      <ConfirmDialog
        open={!!resetTarget}
        title="¿Restablecer contraseña?"
        description={`Se enviará un email de restablecimiento a ${resetTarget?.email}. El usuario deberá crear una nueva contraseña.`}
        confirmLabel="Enviar email"
        isPending={resetMutation.isPending}
        onConfirm={() => resetMutation.mutate(resetTarget?.id)}
        onCancel={() => setResetTarget(null)}
      />

      {/* Create user drawer */}
      <Drawer open={drawerOpen} onClose={() => { setDrawerOpen(false); createForm.reset(); }} title="Nuevo usuario">
        <form onSubmit={createForm.handleSubmit(data => createMutation.mutate(data))} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-asa-text mb-1.5">Correo institucional</label>
            <input
              {...createForm.register("email")}
              type="email"
              placeholder="nombre@solidaridadyaccion.org"
              className={`input-field ${createForm.formState.errors.email ? "error" : ""}`}
            />
            {createForm.formState.errors.email && (
              <p className="text-xs text-asa-error mt-1">{createForm.formState.errors.email.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-asa-text mb-1.5">Contraseña temporal</label>
            <input
              {...createForm.register("password")}
              type="password"
              placeholder="Mínimo 8 caracteres"
              className={`input-field ${createForm.formState.errors.password ? "error" : ""}`}
            />
            {createForm.formState.errors.password && (
              <p className="text-xs text-asa-error mt-1">{createForm.formState.errors.password.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-asa-text mb-1.5">Rol inicial</label>
            <select {...createForm.register("role")} className="input-field">
              <option value="PROGRAM_LEADER">Líder de programa</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          {createMutation.isError && (
            <p className="text-xs text-asa-error bg-red-50 rounded-lg px-3 py-2">
              Error al crear el usuario. Verifica que el correo no esté en uso.
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setDrawerOpen(false); createForm.reset(); }} className="btn-outline flex-1 justify-center">
              Cancelar
            </button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1 justify-center">
              {createMutation.isPending ? "Creando..." : "Crear usuario"}
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
