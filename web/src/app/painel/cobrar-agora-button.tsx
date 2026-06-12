"use client";

import { useState, useTransition } from "react";
import { cobrarAgoraAction } from "@/app/painel/actions";
import { Button } from "@/components/ui/button";

export function CobrarAgoraButton({
  clienteId,
  competenciaId,
}: {
  clienteId: string;
  competenciaId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setFeedback(null);
          startTransition(async () => {
            try {
              const result = await cobrarAgoraAction(clienteId, competenciaId);
              setFeedback(result);
            } catch {
              setFeedback({
                ok: false,
                message: "Erro inesperado ao enviar cobrança",
              });
            }
          });
        }}
      >
        {pending ? "Enviando…" : "Cobrar agora"}
      </Button>
      {feedback ? (
        <span
          className={`max-w-xs text-[12px] ${
            feedback.ok ? "text-[var(--muted-foreground)]" : "text-[#b91c1c]"
          }`}
        >
          {feedback.message}
        </span>
      ) : null}
    </div>
  );
}
