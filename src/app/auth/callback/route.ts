import { eq } from "drizzle-orm";
import { createSupabaseServer } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { memberships } from "@/lib/db/schema";
import { NextResponse } from "next/server";

// Recebe o retorno do OAuth (Google) e dos links de recuperação de senha.
// Troca o `code` por uma sessão (PKCE) e segue para `next`.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/inicio";

  if (code) {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      let dest = next;
      // Cadastro novo via Google? Usuário de primeira viagem ainda NÃO tem
      // membership (a org só nasce no 1º acesso ao app, depois daqui). Isso
      // diferencia cadastro novo de login recorrente → marca ?novo=1 p/ disparar
      // o CompleteRegistration uma única vez. (Só no fluxo de login: next=/inicio.)
      const userId = data.user?.id ?? data.session?.user?.id;
      if (userId && next === "/inicio") {
        try {
          const existing = await db
            .select({ id: memberships.id })
            .from(memberships)
            .where(eq(memberships.userId, userId))
            .limit(1);
          if (!existing.length) dest = "/inicio?novo=1";
        } catch {
          /* na dúvida, segue sem o flag (não dispara) */
        }
      }
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  // Falhou (sem code ou troca inválida) → volta pro login com aviso.
  return NextResponse.redirect(`${origin}/login?erro=oauth`);
}
