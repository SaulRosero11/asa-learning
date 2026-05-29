"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, X, Check } from "lucide-react";
import { apiClient } from "@/lib/axios";

const profileSchema = z.object({
  firstName:   z.string().min(2, "Mínimo 2 caracteres"),
  lastName:    z.string().min(2, "Mínimo 2 caracteres"),
  phoneNumber: z.string().optional(),
});
type ProfileFormData = z.infer<typeof profileSchema>;

async function fetchProfile() {
  const res = await apiClient.get("/api/v1/users/profile");
  return res.data;
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: profile, isLoading } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: ProfileFormData) => apiClient.put("/api/v1/users/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEditing(false);
    },
  });

  const startEditing = () => {
    reset({ firstName: profile?.firstName, lastName: profile?.lastName, phoneNumber: profile?.phoneNumber });
    setEditing(true);
  };

  if (isLoading) {
    return <div className="panel animate-pulse h-48" />;
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-display text-asa-text">Mi Perfil</h1>
        {!editing && (
          <button onClick={startEditing} className="btn-outline">
            <Pencil size={16} /> Editar
          </button>
        )}
      </div>

      <div className="panel">
        {/* Role badges */}
        <div className="flex gap-2 mb-6">
          {profile?.roles?.map((role: string) => (
            <span key={role} className="badge badge-default">{role}</span>
          ))}
          {profile?.adminEligible && (
            <span className="badge badge-info">Dominio ASA</span>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-muted text-asa-text mb-1">Nombre *</label>
                <input className="input-field" {...register("firstName")} />
                {errors.firstName && <p className="mt-1 text-sm text-asa-error">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-muted text-asa-text mb-1">Apellido *</label>
                <input className="input-field" {...register("lastName")} />
                {errors.lastName && <p className="mt-1 text-sm text-asa-error">{errors.lastName.message}</p>}
              </div>
            </div>
            <div>
              <label className="block text-muted text-asa-text mb-1">Teléfono</label>
              <input className="input-field" {...register("phoneNumber")} />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditing(false)} className="btn-outline">
                <X size={16} /> Cancelar
              </button>
              <button type="submit" disabled={mutation.isPending} className="btn-primary">
                <Check size={16} /> {mutation.isPending ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        ) : (
          <dl className="space-y-4">
            {[
              ["Correo electrónico", profile?.email],
              ["Nombre", profile?.firstName],
              ["Apellido", profile?.lastName],
              ["Teléfono", profile?.phoneNumber || "—"],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-label text-asa-muted">{label}</dt>
                <dd className="text-body text-asa-text mt-0.5">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
