import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export const dynamic = "force-dynamic";

// Keep-alive: o Vercel Cron chama esta rota 1×/dia. Uma query leve mantém o
// projeto Supabase ativo, evitando o auto-pause do plano free por inatividade.
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
