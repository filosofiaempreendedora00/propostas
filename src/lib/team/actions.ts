"use server";

import { and, count, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { organizations, memberships, invitations } from "@/lib/db/schema";
import { requireUser, requireOrgId } from "@/lib/auth/org";
import { LimitError } from "@/lib/limits";

export type TeamMember = { userId: string; email: string; role: string };
export type TeamInvite = { id: string; email: string };
export type Team = {
  plan: string;
  seatLimit: number;
  used: number;
  myRole: string;
  myId: string;
  members: TeamMember[];
  invitations: TeamInvite[];
};

async function ownerGuard(orgId: string, userId: string) {
  const [me] = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId)))
    .limit(1);
  if (me?.role !== "owner") throw new Error("Só o dono da conta pode gerenciar a equipe.");
}

export async function getTeam(): Promise<Team> {
  const user = await requireUser();
  const orgId = await requireOrgId();
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  const members = (await db.execute(sql`
    select m.user_id as user_id, m.role as role, u.email as email
    from memberships m
    join auth.users u on u.id = m.user_id
    where m.org_id = ${orgId}
    order by case when m.role = 'owner' then 0 else 1 end, u.email
  `)) as unknown as Array<{ user_id: string; role: string; email: string }>;

  const invs = await db
    .select({ id: invitations.id, email: invitations.email })
    .from(invitations)
    .where(and(eq(invitations.orgId, orgId), isNull(invitations.acceptedAt)));

  const myRole = members.find((m) => m.user_id === user.id)?.role ?? "member";

  return {
    plan: org.plan,
    seatLimit: org.seatLimit,
    used: members.length + invs.length,
    myRole,
    myId: user.id,
    members: members.map((m) => ({
      userId: m.user_id,
      email: m.email,
      role: m.role,
    })),
    invitations: invs,
  };
}

export async function inviteMember(emailRaw: string): Promise<void> {
  const user = await requireUser();
  const orgId = await requireOrgId();
  await ownerGuard(orgId, user.id);

  const email = emailRaw.trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error("E-mail inválido.");

  const [org] = await db
    .select({ seatLimit: organizations.seatLimit })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  const [{ c: m }] = await db
    .select({ c: count() })
    .from(memberships)
    .where(eq(memberships.orgId, orgId));
  const [{ c: i }] = await db
    .select({ c: count() })
    .from(invitations)
    .where(and(eq(invitations.orgId, orgId), isNull(invitations.acceptedAt)));
  if (Number(m) + Number(i) >= (org?.seatLimit ?? 1)) {
    throw new LimitError(
      `Limite de ${org?.seatLimit ?? 1} assentos atingido. Remova alguém para liberar.`,
    );
  }

  // Já tem conta? adiciona direto. Senão, deixa convite pendente.
  const existing = (await db.execute(
    sql`select id from auth.users where lower(email) = ${email} limit 1`,
  )) as unknown as Array<{ id: string }>;

  if (existing[0]) {
    const [already] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(eq(memberships.orgId, orgId), eq(memberships.userId, existing[0].id)),
      )
      .limit(1);
    if (already) throw new Error("Essa pessoa já está na equipe.");
    await db
      .insert(memberships)
      .values({ orgId, userId: existing[0].id, role: "member" })
      .onConflictDoNothing();
    return;
  }

  const [dupe] = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(
      and(
        eq(invitations.orgId, orgId),
        eq(invitations.email, email),
        isNull(invitations.acceptedAt),
      ),
    )
    .limit(1);
  if (dupe) throw new Error("Convite já enviado para esse e-mail.");

  await db.insert(invitations).values({
    orgId,
    email,
    role: "member",
    invitedBy: user.id,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 dias
  });
}

export async function removeMember(memberUserId: string): Promise<void> {
  const user = await requireUser();
  const orgId = await requireOrgId();
  await ownerGuard(orgId, user.id);
  // Nunca remove o dono.
  await db
    .delete(memberships)
    .where(
      and(
        eq(memberships.orgId, orgId),
        eq(memberships.userId, memberUserId),
        ne(memberships.role, "owner"),
      ),
    );
}

export async function cancelInvite(inviteId: string): Promise<void> {
  const user = await requireUser();
  const orgId = await requireOrgId();
  await ownerGuard(orgId, user.id);
  await db
    .delete(invitations)
    .where(and(eq(invitations.id, inviteId), eq(invitations.orgId, orgId)));
}
