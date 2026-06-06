import "server-only";

import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { billingCustomers, organizations } from "@/lib/db/schema";

// Aplica a assinatura (billing_customers) na org indicada, se existir uma
// assinatura pro e-mail. Sem assinatura, não mexe na org.
export async function applyEntitlementToOrg(
  orgId: string,
  email: string | null | undefined,
) {
  if (!email) return;
  const [ent] = await db
    .select()
    .from(billingCustomers)
    .where(eq(billingCustomers.email, email.toLowerCase()))
    .limit(1);
  if (!ent) return;
  await db
    .update(organizations)
    .set({
      plan: ent.plan,
      seatLimit: ent.seatLimit,
      status: ent.status,
      billingProvider: ent.provider ?? "kiwify",
      billingRef: ent.subscriptionId ?? null,
    })
    .where(eq(organizations.id, orgId));
}

// Dado um e-mail, acha a org do dono (se já tiver conta) e aplica a assinatura.
export async function applyEntitlementByEmail(email: string) {
  const e = email.toLowerCase();
  const rows = (await db.execute(sql`
    select m.org_id as org_id
    from memberships m
    join auth.users u on u.id = m.user_id
    where lower(u.email) = ${e} and m.role = 'owner'
    limit 1
  `)) as unknown as Array<{ org_id: string }>;
  const orgId = rows[0]?.org_id;
  if (orgId) await applyEntitlementToOrg(orgId, e);
}
