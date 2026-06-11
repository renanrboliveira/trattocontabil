"use client";

import { exportAlterdataAction } from "@/app/painel/actions";
import { Button } from "@/components/ui/button";

export function ExportAlterdataButton({ extratoId }: { extratoId: string }) {
  async function handleExport() {
    const result = await exportAlterdataAction(extratoId);
    if (!result.ok) {
      alert(result.message);
      return;
    }
    window.location.href = `/api/export/${result.exportId}`;
  }

  return (
    <Button type="button" onClick={handleExport}>
      Exportar Alterdata (CSV)
    </Button>
  );
}
