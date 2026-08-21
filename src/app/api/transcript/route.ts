import { type NextRequest, NextResponse } from "next/server";
import { and, count, eq, sql } from "drizzle-orm";
import { requireUser, requireOrgId } from "@/lib/auth/org";
import { parseTranscript } from "@/lib/transcript/parse";
import { generateBlocksFromTranscript } from "@/lib/catalog/ai";
import { db } from "@/lib/db/client";
import { aiGenerations } from "@/lib/db/schema";
import { DAILY_PROPOSAL_GENERATIONS } from "@/lib/limits";

// Transcript da call → proposta personalizada. Route handler (não server action)
// pra não bater no limite de 1MB de body das actions — transcripts podem ser
// grandes. Parse (PDF/DOCX/TXT) + IA no servidor; devolve os blocos + clientName.
export const runtime = "nodejs";
export const maxDuration = 60; // parse + IA leva alguns segundos

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB

export async function POST(req: NextRequest) {
  // Auth (rota protegida pelo proxy, mas confirmamos + pegamos a org).
  let orgId: string;
  let email: string | null;
  try {
    const user = await requireUser();
    email = user.email ?? null;
    orgId = await requireOrgId();
  } catch {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // Trava anti-abuso SILENCIOSA: no máximo DAILY_PROPOSAL_GENERATIONS gerações de
  // proposta por IA (transcript) por org em 24h — vale ATÉ PRA ASSINANTE PAGO,
  // pra um cliente abusivo não drenar o custo de IA. Sem contador ("X/10"): só
  // barra ao estourar, com mensagem genérica que não revela o mecanismo.
  try {
    const [{ c }] = await db
      .select({ c: count() })
      .from(aiGenerations)
      .where(
        and(
          eq(aiGenerations.orgId, orgId),
          eq(aiGenerations.kind, "transcript"),
          sql`${aiGenerations.createdAt} > now() - interval '24 hours'`,
        ),
      );
    if (Number(c) >= DAILY_PROPOSAL_GENERATIONS) {
      return NextResponse.json(
        {
          error:
            "Muitas gerações por IA em pouco tempo. Pra proteger o serviço, novas gerações liberam em algumas horas — enquanto isso você pode editar e baixar as propostas normalmente.",
        },
        { status: 429 },
      );
    }
  } catch (e) {
    // erro de contagem (ex.: tabela ausente) → não bloqueia a geração
    console.error("[transcript] contagem de cota falhou:", e);
  }

  // Arquivo do multipart.
  let file: File | null = null;
  try {
    const fd = await req.formData();
    const f = fd.get("file");
    if (f instanceof File) file = f;
  } catch {
    /* corpo ilegível */
  }
  if (!file) {
    return NextResponse.json({ error: "Envie um arquivo PDF, DOCX ou TXT." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Arquivo muito grande (máx. 12 MB)." }, { status: 400 });
  }

  // Parse → texto.
  let transcript: string;
  try {
    const buf = await file.arrayBuffer();
    transcript = await parseTranscript(buf, file.name, file.type);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Não consegui ler esse arquivo." },
      { status: 422 },
    );
  }

  // IA → blocos personalizados.
  try {
    const { clientName, blocks, usage } = await generateBlocksFromTranscript(transcript);
    // Log de custo (não bloqueia a resposta se falhar).
    try {
      await db.insert(aiGenerations).values({
        orgId,
        userEmail: email,
        kind: "transcript",
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        solutions: 0,
      });
    } catch (e) {
      console.error("[transcript] log de custo falhou:", e);
    }
    return NextResponse.json({ clientName, blocks });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao gerar a proposta." },
      { status: 500 },
    );
  }
}
