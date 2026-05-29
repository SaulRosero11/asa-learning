"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-asa-bg p-8">
      <div className="panel max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-asa-error" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-asa-text">Algo salió mal</h1>
          <p className="text-sm text-asa-muted mt-2">
            Ocurrió un error inesperado. Puedes intentar recargar la página.
          </p>
          {error.digest && (
            <p className="text-xs text-asa-muted mt-1 font-mono">
              Código: {error.digest}
            </p>
          )}
        </div>
        <button
          onClick={reset}
          className="btn-primary flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" /> Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
