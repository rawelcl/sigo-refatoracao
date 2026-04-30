import {
  emitter,
  lerEventos,
  obterExec,
  type Evento,
} from "@/lib/exec-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sseChunk(ev: Evento): string {
  return `event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const enviar = (ev: Evento) => {
        try {
          controller.enqueue(enc.encode(sseChunk(ev)));
        } catch {
          /* fechado */
        }
      };

      // 1. Replay dos eventos persistidos
      const eventos = await lerEventos(id);
      for (const ev of eventos) enviar(ev);

      const exec = obterExec(id);
      if (!exec || (exec.status !== "running" && exec.status !== "awaiting")) {
        // Ja terminou: envia done e fecha
        enviar({
          ts: Date.now(),
          type: "done",
          data: {
            status: exec?.status ?? "done",
            error: exec?.error,
          },
        });
        controller.close();
        return;
      }

      // 2. Inscreve para novos eventos
      const em = emitter(id);
      if (!em) {
        controller.close();
        return;
      }
      const onEv = (ev: Evento) => enviar(ev);
      const onClose = () => {
        try {
          controller.close();
        } catch {
          /* noop */
        }
        em.off("evento", onEv);
        em.off("close", onClose);
      };
      em.on("evento", onEv);
      em.on("close", onClose);

      // Heartbeat para manter conexao viva
      const hb = setInterval(() => {
        try {
          controller.enqueue(enc.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(hb);
        }
      }, 15_000);
      em.once("close", () => clearInterval(hb));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
