import { Sidebar } from "./Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-asa-bg overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="px-10 py-9 max-w-6xl mx-auto min-h-full">{children}</div>
      </main>
    </div>
  );
}
