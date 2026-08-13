"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  programs: "Programas",
  profile: "Mi Perfil",
  history: "Historial",
  users: "Usuarios",
  students: "Estudiantes",
  "onboarding-questions": "Preguntas de Onboarding",
  content: "Contenido",
  assessments: "Evaluaciones",
  community: "Comunidad",
  play: "Realizar evaluación",
  results: "Resultados",
  result: "Mi resultado",
  new: "Nueva evaluación",
};

const SKIP = new Set(["admin"]);

function isDynamic(s: string) {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) ||
    /^\d+$/.test(s)
  );
}

function parsePath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let path = "";
  let title = "";

  for (const seg of segments) {
    path += `/${seg}`;
    if (SKIP.has(seg) || isDynamic(seg)) continue;
    const label = LABELS[seg] ?? seg;
    crumbs.push({ label, href: path });
    title = label;
  }

  return { crumbs, title: title || "Dashboard" };
}

export function PageHeader() {
  const pathname = usePathname();
  const { crumbs, title } = parsePath(pathname);
  const showBreadcrumbs = crumbs.length > 1;

  return (
    <div className="mb-8 space-y-2">
      <div
        className="bg-white rounded-2xl border border-asa-border overflow-hidden"
        style={{ boxShadow: "var(--shadow-subtle)" }}
      >
        <div className="h-2 bg-asa-primary w-full" />
        <div className="flex items-center gap-5 px-6 py-5">
          <div
            className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 bg-asa-primary flex items-center justify-center"
            style={{ boxShadow: "0 2px 8px rgba(107,63,200,0.3)" }}
          >
            <img
              src="/logo.jpg"
              alt="ASA"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-asa-primary mb-0.5">
              Solidaridad y Acción
            </p>
            <h1 className="text-2xl font-bold text-asa-text leading-tight">{title}</h1>
            <p className="text-sm text-asa-muted mt-0.5">
              Plataforma de capacitación profesional ASA E-Learning
            </p>
          </div>
        </div>
      </div>

      {showBreadcrumbs && (
        <nav className="flex items-center gap-1.5 px-1 text-sm" aria-label="Breadcrumb">
          {crumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-asa-border flex-shrink-0" />
              )}
              {i < crumbs.length - 1 ? (
                <Link
                  href={crumb.href}
                  className="text-asa-muted hover:text-asa-primary transition-colors duration-150"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-asa-text font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
    </div>
  );
}
