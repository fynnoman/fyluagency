export default function GlobalLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded-md bg-surface-2" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="h-24 rounded-lg bg-surface-2" />
        <div className="h-24 rounded-lg bg-surface-2" />
        <div className="h-24 rounded-lg bg-surface-2" />
        <div className="h-24 rounded-lg bg-surface-2" />
      </div>
      <div className="h-64 rounded-lg bg-surface-2" />
    </div>
  );
}
