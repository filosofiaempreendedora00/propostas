import { createSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Encerra a sessão e volta pro login.
export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });
}
