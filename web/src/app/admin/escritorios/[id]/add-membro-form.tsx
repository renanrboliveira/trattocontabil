"use client";

import { useActionState } from "react";
import { addMembroAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Field, inputClassName, selectClassName } from "@/components/ui/field";

export function AddMembroForm({ escritorioId }: { escritorioId: string }) {
  const [state, formAction, pending] = useActionState(addMembroAction, null);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="escritorio_id" value={escritorioId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="E-mail do usuário" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            required
            className={inputClassName()}
          />
        </Field>

        <Field label="Papel" htmlFor="role">
          <select id="role" name="role" className={selectClassName()}>
            <option value="admin">Admin</option>
            <option value="operador">Operador</option>
          </select>
        </Field>
      </div>

      <Field
        label="Senha inicial"
        htmlFor="password"
        hint="Gerada automaticamente se o usuário não existir"
      >
        <input
          id="password"
          name="password"
          type="text"
          className={inputClassName()}
          placeholder="Opcional"
        />
      </Field>

      {state?.message && (
        <p
          className={`rounded-lg px-4 py-3 text-sm ${
            state.ok
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Vincular usuário"}
      </Button>
    </form>
  );
}
