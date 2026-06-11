import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function isWorkerAuthorized(request: Request): boolean {
  const workerSecret = request.headers.get("x-worker-secret");
  if (workerSecret && workerSecret === process.env.WORKER_SECRET) {
    return true;
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  return Boolean(
    cronSecret && authHeader === `Bearer ${cronSecret}`
  );
}

async function runWorker() {
  const admin = createAdminClient();
  const { processPendingJobs } = await import("@/lib/pipeline/process");
  return processPendingJobs(admin);
}

export async function GET(request: Request) {
  if (!isWorkerAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runWorker();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  if (!isWorkerAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runWorker();
  return NextResponse.json(result);
}
