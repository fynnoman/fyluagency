"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Sparkles,
  FileText,
  Settings as SettingsIcon,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/format";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/kunden", label: "Kunden", icon: Users },
  { href: "/leads", label: "Leads", icon: Sparkles },
  { href: "/rechnungen", label: "Rechnungen", icon: FileText },
  { href: "/einstellungen", label: "Einstellungen", icon: SettingsIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex w-60 flex-col border-r border-border bg-surface sticky top-0 h-screen">
      <div className="px-5 py-6 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-accent text-accent-fg grid place-items-center text-sm font-semibold">
            F
          </div>
          <span className="font-semibold tracking-tight">Fylu Agency</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-accent text-accent-fg font-medium"
                  : "text-text-muted hover:bg-surface-2 hover:text-text"
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-border">
        <Link
          href="/rechnungen/neu"
          className="btn btn-primary w-full justify-center"
        >
          <Plus size={14} /> Neue Rechnung
        </Link>
      </div>
    </aside>
  );
}
