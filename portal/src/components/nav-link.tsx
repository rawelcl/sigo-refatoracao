"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const ativo =
    href === "/"
      ? pathname === "/" || pathname.startsWith("/rotinas")
      : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`relative rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
        ativo
          ? "text-zinc-50"
          : "text-zinc-400 hover:text-zinc-100"
      }`}
    >
      {children}
      {ativo && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-2.5 -bottom-3 h-px rounded-full"
          style={{ backgroundColor: "#8b5cf6", boxShadow: "0 0 8px rgba(139,92,246,0.6)" }}
        />
      )}
    </Link>
  );
}
