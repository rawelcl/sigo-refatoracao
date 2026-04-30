/**
 * Configura o agente HTTP global do Node (undici) para respeitar variaveis
 * de proxy corporativo: HTTPS_PROXY / HTTP_PROXY / ALL_PROXY (e variantes
 * em minusculas). Se NO_PROXY estiver definido, hosts listados sao excluidos
 * via EnvHttpProxyAgent.
 *
 * Importado uma unica vez por modulo que faz fetch externo.
 */

const KEY = Symbol.for("sigo.portal.proxyAgentInstalado");
const g = globalThis as unknown as Record<symbol, boolean | undefined>;

export function instalarProxyAgent(): string | null {
  if (g[KEY]) return null;
  g[KEY] = true;

  const proxy =
    process.env.HTTPS_PROXY ??
    process.env.https_proxy ??
    process.env.HTTP_PROXY ??
    process.env.http_proxy ??
    process.env.ALL_PROXY ??
    process.env.all_proxy;

  if (!proxy) return null;

  try {
    // import dinamico: undici vem embutido no Node 18+
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const undici = require("undici") as {
      ProxyAgent: new (uri: string) => unknown;
      EnvHttpProxyAgent?: new () => unknown;
      setGlobalDispatcher: (d: unknown) => void;
    };

    const agent = undici.EnvHttpProxyAgent
      ? new undici.EnvHttpProxyAgent()
      : new undici.ProxyAgent(proxy);
    undici.setGlobalDispatcher(agent);
    return proxy;
  } catch (e) {
    // Falha silenciosa: o fetch ainda funciona sem proxy quando nao ha bloqueio
    console.warn("[proxy] falha ao instalar ProxyAgent:", e);
    return null;
  }
}

// Auto-instala ao importar
instalarProxyAgent();
