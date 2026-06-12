import { waitUntil } from "@vercel/functions";

function workerBaseUrl(): string | null {
  // Preferir o domínio público: VERCEL_URL é a URL gerada do deployment,
  // que fica atrás do Deployment Protection (401) em produção.
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3001";
  }
  return null;
}

/** Dispara processamento da fila sem bloquear (webhook / pós-retry). */
export function triggerWorkerProcess(): void {
  const base = workerBaseUrl();
  const secret = process.env.WORKER_SECRET;
  if (!base || !secret) return;

  // waitUntil mantém a function viva até o fetch sair — fire-and-forget
  // puro é descartado quando a resposta retorna no serverless.
  waitUntil(
    fetch(`${base}/api/worker/process`, {
      method: "POST",
      headers: { "x-worker-secret": secret },
    }).catch(() => {
      // Falha silenciosa — cron diário cobre
    })
  );
}
