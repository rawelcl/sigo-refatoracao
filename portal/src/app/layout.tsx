import type { Metadata } from "next";
import Link from "next/link";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Workflow } from "lucide-react";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";
import { NavLink } from "@/components/nav-link";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SIGO - Portal de Refatoracao",
  description: "Catalogo de rotinas analisadas e construtor de prompts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${jetbrains.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="app-bg min-h-full flex flex-col text-zinc-100">
        <Providers>
          <nav className="sticky top-0 z-30 border-b border-white/[0.07] bg-[rgba(10,10,12,0.75)] backdrop-blur-lg">
            <div className="mx-auto flex w-full max-w-6xl items-center gap-1 px-6 py-3">
              <Link
                href="/"
                className="mr-4 flex items-center gap-2.5 text-sm font-semibold tracking-tight"
              >
                <span className="relative flex size-8 items-center justify-center overflow-hidden rounded-lg text-white shadow-sm ring-1 ring-white/10"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, #7c3aed 0%, #1c1c20 60%, #4338ca 140%)",
                  }}
                >
                  <Workflow className="size-4" />
                  <span
                    className="absolute -right-0.5 -top-0.5 size-2 rounded-full ring-2 ring-[#0a0a0c]"
                    style={{ backgroundColor: "#a78bfa", boxShadow: "0 0 6px rgba(167,139,250,0.85)" }}
                  />
                </span>
                <span className="text-mono-tight leading-none">
                  sigo<span style={{ color: "#a78bfa" }}>/</span>refact
                </span>
              </Link>
              <NavLink href="/">Catalogo</NavLink>
              <NavLink href="/agentes">Agentes</NavLink>
              <NavLink href="/execucoes">Execucoes</NavLink>
              <NavLink href="/auth">Auth</NavLink>
            </div>
          </nav>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

