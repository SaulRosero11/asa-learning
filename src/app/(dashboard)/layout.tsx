import { Sidebar } from "./Sidebar";
import { PageHeader } from "@/components/PageHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-asa-bg overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="px-10 py-9 max-w-6xl mx-auto min-h-full">
          <PageHeader />
          {children}
        </div>
      </main>
    </div>
  );
}
