export default function AdminUsersLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-asa-border rounded-lg w-40" />
      <div className="panel space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-asa-border rounded-lg" />
        ))}
      </div>
    </div>
  );
}
