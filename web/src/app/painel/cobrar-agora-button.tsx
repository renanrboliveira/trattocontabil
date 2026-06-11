"use client";

import { useTransition } from "react";
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

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await cobrarAgoraAction(clienteId, competenciaId);
        });
      }}
    >
      {pending ? "Enviando…" : "Cobrar agora"}
    </Button>
  );
}
