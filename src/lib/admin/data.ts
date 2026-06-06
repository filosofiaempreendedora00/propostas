import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/org";

// E-mails autorizados a ver o painel /admin (configurável por env).
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// O usuário logado é admin master?
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const user = await requireUser();
    const email = user.email?.toLowerCase();
    return !!email && adminEmails().includes(email);
  } catch {
    return false;
  }
}

export type AdminOrg = {
  id: string;
  name: string;
  plan: string;
  status: string;
  seatLimit: number;
  members: number;
  pending: number;
  ownerEmail: string | null;
  createdAt: string | null;
};

export type AdminEvent = {
  email: string;
  plan: string;
  status: string;
  provider: string | null;
  productId: string | null;
  updatedAt: string | null;
};

export type AdminOverview = {
  totals: {
    orgs: number;
    active: number;
    inactive: number;
    canceled: number;
    users: number;
    individual: number;
    time: number;
  };
  orgs: AdminOrg[];
  events: AdminEvent[];
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const orgsRaw = (await db.execute(sql`
    select
      o.id                                  as id,
      o.name                                as name,
      o.plan                                as plan,
      o.status                              as status,
      o.seat_limit                          as seat_limit,
      o.created_at                          as created_at,
      (select u.email from auth.users u where u.id = o.owner_id) as owner_email,
      (select count(*)::int from memberships m where m.org_id = o.id) as members,
      (select count(*)::int from invitations i
         where i.org_id = o.id and i.accepted_at is null)             as pending
    from organizations o
    order by o.created_at desc
  `)) as unknown as Array<{
    id: string;
    name: string;
    plan: string;
    status: string;
    seat_limit: number;
    created_at: Date | string | null;
    owner_email: string | null;
    members: number;
    pending: number;
  }>;

  const [{ n: users }] = (await db.execute(
    sql`select count(*)::int as n from auth.users`,
  )) as unknown as Array<{ n: number }>;

  const eventsRaw = (await db.execute(sql`
    select email, plan, status, provider, product_id, updated_at
    from billing_customers
    order by updated_at desc nulls last
    limit 50
  `)) as unknown as Array<{
    email: string;
    plan: string;
    status: string;
    provider: string | null;
    product_id: string | null;
    updated_at: Date | string | null;
  }>;

  const toIso = (d: Date | string | null) =>
    d == null ? null : d instanceof Date ? d.toISOString() : String(d);

  const orgs: AdminOrg[] = orgsRaw.map((o) => ({
    id: o.id,
    name: o.name,
    plan: o.plan,
    status: o.status,
    seatLimit: o.seat_limit,
    members: o.members,
    pending: o.pending,
    ownerEmail: o.owner_email,
    createdAt: toIso(o.created_at),
  }));

  const totals = {
    orgs: orgs.length,
    active: orgs.filter((o) => o.status === "active").length,
    inactive: orgs.filter((o) => o.status === "inactive").length,
    canceled: orgs.filter((o) => o.status === "canceled").length,
    users: Number(users) || 0,
    individual: orgs.filter((o) => o.plan === "individual").length,
    time: orgs.filter((o) => o.plan === "time").length,
  };

  const events: AdminEvent[] = eventsRaw.map((e) => ({
    email: e.email,
    plan: e.plan,
    status: e.status,
    provider: e.provider,
    productId: e.product_id,
    updatedAt: toIso(e.updated_at),
  }));

  return { totals, orgs, events };
}
