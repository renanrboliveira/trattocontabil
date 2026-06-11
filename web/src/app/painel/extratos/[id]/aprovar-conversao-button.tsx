"use client";

import { useTransition } from "react";
import { aprovarConversaoAction } from "@/app/painel/actions";
import { Button } from "@/components/ui/button";

export function AprovarConversaoButton({ extratoId }: { extratoId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await aprovarConversaoAction(extratoId);
        });
      }}
    >
      {pending ? "Aprovando…" : "Aprovar conversão"}
    </Button>
  );
}
