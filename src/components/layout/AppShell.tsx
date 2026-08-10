"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { FileText, LayoutDashboard, Sparkles, FileImage } from "lucide-react";
import { FLOW_VERSION_LABEL } from "@/lib/constants/flow-version";

const NAV = [
  { href: "/", label: "Upload", icon: FileText },
  { href: "/admin", label: "Admin", icon: LayoutDashboard },
  { href: "/flow", label: "Flow preview", icon: Sparkles },
  { href: "/pdf-preview", label: "Employee PDF", icon: FileImage },
];

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-salt">
      <header className="border-b border-alpine/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logos/BrainStorm_Horizontal_Black.svg"
              alt="BrainStorm"
              width={130}
              height={14}
              className="h-3.5 w-auto"
            />
            <div className="border-l border-alpine/15 pl-3">
              <p className="text-sm font-semibold text-alpine">
                AUP Mobilization {FLOW_VERSION_LABEL}
              </p>
              <p className="text-xs text-alpine/60">
                Upload → Parse → PDF → BSI export
              </p>
            </div>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    "inline-flex items-center gap-2 rounded-pill px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-alpine text-white"
                      : "text-alpine/70 hover:bg-salt-dark hover:text-alpine"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {(title || subtitle) && (
        <div className="border-b border-alpine/5 bg-white/60">
          <div className="mx-auto max-w-7xl px-6 py-8">
            {title && (
              <h1 className="font-display text-3xl font-medium text-alpine">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mt-2 max-w-2xl text-alpine/70">{subtitle}</p>
            )}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>

      <footer className="mt-12 border-t border-alpine/10 py-6 text-center text-xs text-alpine/50">
        BSI AUP Mobilization {FLOW_VERSION_LABEL} — internal tooling, not legal advice.
      </footer>
    </div>
  );
}
