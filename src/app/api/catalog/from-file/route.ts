import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/org";
import { parseTranscript } from "@/lib/transcript/parse";
import { generateAndReplaceCatalog } from "@/lib/catalog/actions";
import { LimitError } from "@/lib/limits";

// Sobe um arquivo do NEGÓCIO (PDF/DOCX/TXT) → a IA extrai o pertinente e cria o
// catálogo (soluções/planos/consultor). Route handler (não server action) pra
// não bater no limite de 1MB de body — arquivos podem ser grandes. Reusa o
// parser do transcript e a MESMA geração de catálogo (generateAndReplaceCatalog).
export const runtime = "nodejs";
export const maxDuration = 60; // parse + IA leva alguns segundos

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB

export async function POST(req: NextRequest) {
  try {
    await requireUser(); // auth (a ação resolve a org internamente)
  } catch {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let file: File | null = null;
  try {
    const fd = await req.formData();
    const f = fd.get("file");
    if (f instanceof File) file = f;
  } catch {
    /* corpo ilegível */
  }
  if (!file) {
    return NextResponse.json(
      { error: "Envie um arquivo PDF, DOCX ou TXT." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Arquivo muito grande (máx. 12 MB)." },
      { status: 400 },
    );
  }

  // Parse → texto do negócio.
  let text: string;
  try {
    text = await parseTranscript(await file.arrayBuffer(), file.name, file.type);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Não consegui ler esse arquivo." },
      { status: 422 },
    );
  }

  // IA cria o catálogo a partir do texto extraído (mesma ação do fluxo digitado).
  try {
    const res = await generateAndReplaceCatalog(text);
    return NextResponse.json({ solutions: res.solutions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao gerar o catálogo.";
    const status = e instanceof LimitError ? 429 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
