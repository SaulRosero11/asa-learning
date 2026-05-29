"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, BookOpen, Users, LogOut, GraduationCap, ClipboardList } from "lucide-react";
import { apiClient } from "@/lib/axios";

interface CurrentUser { userId: string; email: string; roles: string[] }
interface NavItem { href: string; label: string; icon: React.ReactNode; roles?: string[]; exact?: boolean }

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, exact: true },
  { href: "/programs",  label: "Programas",  icon: <BookOpen className="w-5 h-5" /> },
  { href: "/admin/users", label: "Usuarios", icon: <Users className="w-5 h-5" />, roles: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/admin/students", label: "Estudiantes", icon: <GraduationCap className="w-5 h-5" />, roles: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/admin/onboarding-questions", label: "Onboarding", icon: <ClipboardList className="w-5 h-5" />, roles: ["ADMIN", "SUPER_ADMIN"] },
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin", ADMIN: "Administrador",
  PROGRAM_LEADER: "Líder de Programa", STUDENT: "Estudiante",
};

function getRoleLabel(roles: string[]): string {
  for (const r of ["SUPER_ADMIN", "ADMIN", "PROGRAM_LEADER", "STUDENT"]) {
    if (roles.includes(r)) return ROLE_LABELS[r];
  }
  return "Usuario";
}

function Tooltip({ text }: { text: string }) {
  return (
    <span className="
      absolute left-14 z-50 px-2.5 py-1.5 text-xs font-medium text-white bg-asa-text
      rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100
      pointer-events-none transition-all duration-150 shadow-card
      -translate-x-1.5 group-hover:translate-x-0
    ">{text}</span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: () => apiClient.get("/api/v1/auth/me").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiClient.post("/api/v1/auth/logout"),
    onSettled: () => { queryClient.clear(); router.push("/login"); },
  });

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.some((r) => user?.roles?.includes(r))
  );
  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "??";

  return (
    <aside
      className="w-16 shrink-0 h-screen flex flex-col bg-white overflow-visible"
      style={{ boxShadow: "var(--shadow-sidebar)", borderRight: "1px solid var(--color-asa-border)" }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-center shrink-0" style={{ borderBottom: "1px solid var(--color-asa-border)" }}>
        <div
          className="w-9 h-9 rounded-xl bg-asa-primary flex items-center justify-center"
          style={{ boxShadow: "0 2px 8px rgba(107,63,200,0.4)" }}
        >
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col items-center gap-1.5 py-5">
        {visibleItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative group w-10 h-10 rounded-xl flex items-center justify-center
                transition-all duration-150
                ${active
                  ? "bg-asa-primary text-white"
                  : "text-asa-muted hover:bg-asa-highlight hover:text-asa-primary"}
              `}
              style={active ? { boxShadow: "0 2px 8px rgba(107,63,200,0.35)" } : undefined}
            >
              {item.icon}
              <Tooltip text={item.label} />
            </Link>
          );
        })}
      </nav>

      {/* Profile + Logout */}
      <div
        className="flex flex-col items-center gap-2 pb-4 pt-3 shrink-0"
        style={{ borderTop: "1px solid var(--color-asa-border)" }}
      >
        <Link
          href="/profile"
          className="relative group w-10 h-10 rounded-full bg-asa-primary flex items-center justify-center text-xs font-bold text-white transition-all hover:scale-105"
          style={{ boxShadow: "0 2px 6px rgba(107,63,200,0.3)" }}
        >
          {initials}
          <span className="
            absolute left-14 z-50 min-w-[160px] px-3 py-2 text-xs font-medium text-white bg-asa-text
            rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150
          " style={{ boxShadow: "var(--shadow-card)" }}>
            <span className="block truncate font-semibold">{user?.email}</span>
            <span className="block text-white/50 mt-0.5 font-normal">{user?.roles ? getRoleLabel(user.roles) : ""}</span>
          </span>
        </Link>

        <button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="relative group w-10 h-10 rounded-xl flex items-center justify-center text-asa-muted hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-50"
        >
          <LogOut className="w-4 h-4" />
          <Tooltip text="Cerrar sesión" />
        </button>
      </div>
    </aside>
  );
}
