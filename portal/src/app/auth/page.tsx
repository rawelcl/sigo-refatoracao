"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, LogIn, LogOut, KeyRound, ExternalLink, Copy, Check } from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";

type AuthStatus =
  | { logged: false; source: null }
  | { logged: true; source: "env" }
  | {
      logged: true;
      source: "device-flow";
      user_login?: string;
      obtained_at: number;
      scope: string;
    };

type DeviceCode = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
};

export default function AuthPage() {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [device, setDevice] = useState<DeviceCode | null>(null);
  const [iniciando, setIniciando] = useState(false);
  const [aguardando, setAguardando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const pollRef = useRef<number | null>(null);

  const carregarStatus = async () => {
    try {
      const r = await fetch("/api/auth/status", { cache: "no-store" });
      const j = (await r.json()) as AuthStatus;
      setStatus(j);
    } catch (e) {
      toast.error(String(e));
    }
  };

  useEffect(() => {
    void carregarStatus();
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  const iniciarLogin = async () => {
    setIniciando(true);
    try {
      const r = await fetch("/api/auth/device-start", { method: "POST" });
      const j = await r.json();
      if (!r.ok) {
        toast.error(j.erro?.error_description ?? `Falha (${r.status})`);
        return;
      }
      setDevice(j);
      setAguardando(true);
      // abre verification_uri em nova aba e copia o codigo
      try {
        await navigator.clipboard.writeText(j.user_code);
        toast.success("Codigo copiado. Cole na pagina aberta.");
      } catch {
        /* ignora */
      }
      window.open(j.verification_uri, "_blank", "noopener,noreferrer");

      // polling
      const interval = (j.interval ?? 5) * 1000;
      pollRef.current = window.setInterval(async () => {
        const pr = await fetch("/api/auth/device-poll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_code: j.device_code }),
        });
        const pj = await pr.json();
        if (pj.ok) {
          if (pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setAguardando(false);
          setDevice(null);
          toast.success(`Autenticado${pj.user_login ? ` como ${pj.user_login}` : ""}`);
          await carregarStatus();
        } else if (pj.error && pj.error !== "authorization_pending" && pj.error !== "slow_down") {
          if (pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setAguardando(false);
          setDevice(null);
          toast.error(pj.error_description ?? pj.error);
        }
      }, interval);
    } finally {
      setIniciando(false);
    }
  };

  const sair = async () => {
    const r = await fetch("/api/auth/status", { method: "DELETE" });
    if (r.ok) {
      toast.success("Sessao encerrada");
      await carregarStatus();
    } else {
      toast.error("Falha ao encerrar");
    }
  };

  const copiarCodigo = async () => {
    if (!device) return;
    try {
      await navigator.clipboard.writeText(device.user_code);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1500);
    } catch {
      toast.error("Nao foi possivel copiar");
    }
  };

  return (
    <PageShell>
      <PageHeader
        titulo="Autenticacao"
        descricao="Login no GitHub Copilot via Device Flow."
      />

      <div className="card-tech p-4">
        {status === null ? (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Loader2 className="size-4 animate-spin" />
            consultando status...
          </div>
        ) : status.logged ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-emerald-400" />
              <span className="text-sm font-semibold text-zinc-100">
                Autenticado
              </span>
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300 ring-1 ring-emerald-500/30">
                {status.source}
              </span>
            </div>
            <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              {"user_login" in status && status.user_login && (
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Usuario
                  </dt>
                  <dd className="font-mono text-zinc-200">{status.user_login}</dd>
                </div>
              )}
              {"scope" in status && status.scope && (
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Escopo
                  </dt>
                  <dd className="font-mono text-zinc-200">{status.scope}</dd>
                </div>
              )}
              {"obtained_at" in status && (
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Obtido em
                  </dt>
                  <dd className="font-mono text-zinc-200">
                    {new Date(status.obtained_at).toLocaleString("pt-BR", {
                      hour12: false,
                    })}
                  </dd>
                </div>
              )}
            </dl>
            {status.source === "device-flow" && (
              <button
                onClick={sair}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-500/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
              >
                <LogOut className="size-3.5" />
                Sair
              </button>
            )}
            {status.source === "env" && (
              <p className="text-[11px] italic text-zinc-500">
                Token vindo de variavel de ambiente (GITHUB_TOKEN/COPILOT_TOKEN). Nao
                pode ser revogado pela UI.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-zinc-400" />
              <span className="text-sm text-zinc-300">Nao autenticado</span>
            </div>
            <p className="text-xs text-zinc-500">
              Faca login com sua conta GitHub para que o agente possa chamar a API
              do Copilot.
            </p>

            {!device ? (
              <button
                onClick={iniciarLogin}
                disabled={iniciando}
                className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
                style={{
                  background: "linear-gradient(180deg, #8b5cf6 0%, #7c3aed 100%)",
                  boxShadow:
                    "0 1px 0 rgba(255,255,255,0.10) inset, 0 6px 18px -6px rgba(139,92,246,0.55)",
                }}
              >
                {iniciando ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <LogIn className="size-3.5" />
                )}
                Iniciar Device Flow
              </button>
            ) : (
              <div className="rounded-md border border-violet-500/30 bg-violet-500/[0.05] p-3">
                <div className="mb-2 text-[10px] uppercase tracking-wider text-zinc-400">
                  Codigo de autorizacao
                </div>
                <div className="flex items-center gap-2">
                  <code className="rounded bg-[#0a0a0c] px-3 py-1.5 font-mono text-lg font-bold tracking-[0.2em] text-violet-300">
                    {device.user_code}
                  </code>
                  <button
                    onClick={copiarCodigo}
                    className="rounded-md border border-white/[0.10] bg-[#1a1a1f] p-1.5 text-zinc-300 hover:text-violet-300"
                    aria-label="Copiar"
                  >
                    {copiado ? (
                      <Check className="size-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>
                <a
                  href={device.verification_uri}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] text-violet-300 hover:underline"
                >
                  <ExternalLink className="size-3" />
                  {device.verification_uri}
                </a>
                {aguardando && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <Loader2 className="size-3 animate-spin" />
                    aguardando aprovacao...
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
