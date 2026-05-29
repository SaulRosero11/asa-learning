"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/axios";

type State = "loading" | "success" | "error";

export default function RedeemInvitationPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get("token");
  const [state, setState] = useState<State>("loading");
  const [message, setMessage]  = useState("");

  useEffect(() => {
    if (!token) { setState("error"); setMessage("Enlace de invitación inválido."); return; }

    apiClient.post("/api/v1/invitations/redeem", { token })
      .then(() => { setState("success"); setTimeout(() => router.push("/programs"), 2500); })
      .catch(err => {
        setState("error");
        setMessage(err?.response?.data?.message ?? "El enlace ha expirado o ya fue utilizado.");
      });
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-asa-bg p-8">
      <div className="panel w-full max-w-md text-center">
        {state === "loading" && (
          <>
            <div className="w-12 h-12 border-4 border-asa-primary border-t-transparent
              rounded-full animate-spin mx-auto mb-4" />
            <p className="text-body text-asa-text">Procesando tu invitación...</p>
          </>
        )}
        {state === "success" && (
          <>
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✓</span>
            </div>
            <h2 className="text-heading text-asa-text mb-2">¡Bienvenido/a!</h2>
            <p className="text-muted text-asa-muted">Te has matriculado exitosamente. Redirigiendo...</p>
          </>
        )}
        {state === "error" && (
          <>
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-asa-error">✕</span>
            </div>
            <h2 className="text-heading text-asa-text mb-2">No se pudo procesar</h2>
            <p className="text-muted text-asa-muted mb-6">{message}</p>
            <a href="/login" className="btn-primary inline-flex">Ir al inicio</a>
          </>
        )}
      </div>
    </div>
  );
}
