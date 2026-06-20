import { createSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Recebe o retorno do OAuth (Google) e dos links de recuperação de senha.
// Troca o `code` por uma sessão (PKCE) e segue para `next`.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/inicio";

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Falhou (sem code ou troca inválida) → volta pro login com aviso.
  return NextResponse.redirect(`${origin}/login?erro=oauth`);
}
