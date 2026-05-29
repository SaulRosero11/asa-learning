import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-asa-bg p-8">
      <div className="panel max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-asa-highlight flex items-center justify-center mx-auto">
          <FileQuestion className="w-8 h-8 text-asa-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-asa-primary">404</h1>
          <h2 className="text-xl font-semibold text-asa-text mt-2">
            Página no encontrada
          </h2>
          <p className="text-sm text-asa-muted mt-2">
            La página que buscas no existe o fue eliminada.
          </p>
        </div>
        <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2 mx-auto">
          <Home className="w-4 h-4" /> Ir al Dashboard
        </Link>
      </div>
    </div>
  );
}
