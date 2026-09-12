import { listWorkspaces, getCurrentWorkspaceId } from "@/lib/workspace";
import WorkspaceSwitcher from "./WorkspaceSwitcher";

export default async function TopBar() {
  const [items, currentId] = await Promise.all([
    listWorkspaces(),
    getCurrentWorkspaceId(),
  ]);
  return (
    <div className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-14 flex items-center gap-4">
        <WorkspaceSwitcher
          initialItems={items.map((w) => ({ id: w.id, name: w.name, slug: w.slug }))}
          initialCurrentId={currentId}
        />
      </div>
    </div>
  );
}
