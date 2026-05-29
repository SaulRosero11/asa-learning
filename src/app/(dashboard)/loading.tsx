export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-9 bg-asa-border rounded-lg w-48" />
      <div className="h-4 bg-asa-border rounded w-72" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-panel h-24" />
        ))}
      </div>
      <div className="panel h-56" />
    </div>
  );
}
