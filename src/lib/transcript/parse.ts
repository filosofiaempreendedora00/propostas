import "server-only";

import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

// Extrai o TEXTO cru de um transcript enviado (PDF, DOCX ou TXT), no servidor.
// Libs puras-JS (sem binário nativo) → rodam em serverless. Erro claro se o
// formato não bater ou o arquivo vier ilegível/vazio.
export type TranscriptKind = "pdf" | "docx" | "txt";

export function kindOf(filename: string, mime: string): TranscriptKind | null {
  const name = (filename || "").toLowerCase();
  if (mime.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (
    mime.includes("word") ||
    mime.includes("officedocument.wordprocessing") ||
    name.endsWith(".docx")
  )
    return "docx";
  if (mime.startsWith("text/") || name.endsWith(".txt")) return "txt";
  return null;
}

export async function parseTranscript(
  buf: ArrayBuffer,
  filename: string,
  mime: string,
): Promise<string> {
  const kind = kindOf(filename, mime);
  if (!kind) {
    throw new Error("Formato não suportado. Envie um arquivo PDF, DOCX ou TXT.");
  }

  let text = "";
  if (kind === "pdf") {
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const res = await extractText(pdf, { mergePages: true });
    text = Array.isArray(res.text) ? res.text.join("\n") : res.text;
  } else if (kind === "docx") {
    const res = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
    text = res.value;
  } else {
    text = new TextDecoder("utf-8").decode(buf);
  }

  text = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (text.length < 40) {
    throw new Error(
      "Não consegui ler texto suficiente desse arquivo. Se for um PDF escaneado (imagem), envie a transcrição em texto (TXT) ou DOCX.",
    );
  }
  return text;
}
