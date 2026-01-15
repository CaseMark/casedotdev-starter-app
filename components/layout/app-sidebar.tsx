"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  House,
  MagnifyingGlass,
  FolderOpen,
  Gear,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; weight?: "regular" | "fill" }>;
}

const mainNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: House },
  { label: "Cases", href: "/cases", icon: Briefcase },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-background flex flex-col h-full">
      {/* Logo / Brand */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <FolderOpen size={24} weight="fill" className="text-foreground" />
          <span className="font-semibold text-foreground">Discovery</span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {mainNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2  text-sm transition-colors",
                isActive
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon size={20} weight={isActive ? "fill" : "regular"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Settings */}
      <div className="p-4 border-t border-border">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2  text-sm transition-colors",
            pathname === "/settings"
              ? "bg-muted text-foreground font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Gear size={20} />
          Settings
        </Link>
      </div>
    </aside>
  );
}
