import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { convertPdfWithCascade } from "@/lib/pdf/convert";
import {
  classifyEvalResult,
  estimateCostBrl,
  type EvalExtratoReport,
  type Gabarito,
} from "@/lib/pdf/eval-compare";
import { validatePdfExtraction } from "@/lib/pdf/validate";

const EVAL_DIRS = ["sintetico", "anonimizados"] as const;

async function listPdfPairs(evalRoot: string) {
  const pairs: Array<{ pdfPath: string; gabaritoPath: string; dir: string }> = [];

  for (const dir of EVAL_DIRS) {
    const folder = path.join(evalRoot, dir);
    let entries: string[] = [];
    try {
      entries = await readdir(folder);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.endsWith(".pdf")) continue;
      const base = entry.replace(/\.pdf$/i, "");
      pairs.push({
        pdfPath: path.join(folder, `${base}.pdf`),
        gabaritoPath: path.join(folder, `${base}.gabarito.json`),
        dir,
      });
    }
  }

  return pairs;
}

function printTable(reports: EvalExtratoReport[]) {
  const header = [
    "Arquivo",
    "Banco",
    "Modelo",
    "Validação",
    "Resultado",
    "Erros",
    "Custo R$",
  ];
  console.log(header.join("\t"));

  for (const report of reports) {
    console.log(
      [
        report.file,
        report.banco,
        report.model,
        report.validationOk ? "ok" : report.validationMotivo ?? "fail",
        report.result,
        String(report.errors),
        report.costBrl.toFixed(2),
      ].join("\t")
    );
  }
}

function summarize(reports: EvalExtratoReport[]) {
  const total = reports.length;
  const pass = reports.filter((r) => r.result === "Pass").length;
  const passTriage = reports.filter((r) => r.result === "Pass-with-triage").length;
  const fail = reports.filter((r) => r.result === "Fail").length;
  const acerto = total > 0 ? (pass / total) * 100 : 0;
  const avgCost =
    total > 0
      ? reports.reduce((sum, r) => sum + r.costBrl, 0) / total
      : 0;

  console.log("\nResumo");
  console.log(`Total: ${total}`);
  console.log(`Pass: ${pass}`);
  console.log(`Pass-with-triage: ${passTriage}`);
  console.log(`Fail: ${fail}`);
  console.log(`Acerto (Pass/total): ${acerto.toFixed(1)}%`);
  console.log(`Custo médio/doc: R$ ${avgCost.toFixed(2)}`);

  const byModel = new Map<string, { count: number; cost: number }>();
  for (const report of reports) {
    const current = byModel.get(report.model) ?? { count: 0, cost: 0 };
    current.count += 1;
    current.cost += report.costBrl;
    byModel.set(report.model, current);
  }

  console.log("\nPor modelo");
  for (const [model, stats] of byModel) {
    console.log(
      `${model}: ${stats.count} docs, média R$ ${(stats.cost / stats.count).toFixed(2)}`
    );
  }
}

async function main() {
  const evalRoot = path.resolve(process.cwd(), "../docs/knowledge/eval-set");
  const pairs = await listPdfPairs(evalRoot);

  if (pairs.length === 0) {
    console.log(
      `Nenhum par PDF+gabarito em ${evalRoot}/{sintetico,anonimizados}/`
    );
    process.exit(0);
  }

  const reports: EvalExtratoReport[] = [];

  for (const pair of pairs) {
    const buffer = await readFile(pair.pdfPath);
    const gabarito = JSON.parse(
      await readFile(pair.gabaritoPath, "utf8")
    ) as Gabarito;
    const conversion = await convertPdfWithCascade(buffer);
    const validation = validatePdfExtraction(conversion.best.extraction);
    const classified = classifyEvalResult(
      conversion.best.extraction,
      gabarito,
      validation.ok
    );
    const costBrl = estimateCostBrl(
      conversion.best.model,
      conversion.best.inputTokens,
      conversion.best.outputTokens
    );

    reports.push({
      file: path.basename(pair.pdfPath),
      banco: gabarito.banco_nome ?? conversion.best.extraction.banco_nome,
      model: conversion.best.model,
      validationOk: validation.ok,
      validationMotivo: validation.ok ? undefined : validation.motivo,
      result: classified.result,
      errors: classified.errors,
      inputTokens: conversion.best.inputTokens,
      outputTokens: conversion.best.outputTokens,
      costBrl,
    });
  }

  printTable(reports);
  summarize(reports);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
