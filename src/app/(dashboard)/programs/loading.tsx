export default function ProgramsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 bg-asa-border rounded-lg w-32" />
        <div className="h-10 bg-asa-border rounded-lg w-36" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-panel h-48" />
        ))}
      </div>
    </div>
  );
}
