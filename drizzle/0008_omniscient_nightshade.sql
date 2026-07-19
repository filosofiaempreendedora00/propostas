-- Só cria a tabela funnel_events (+ índices). As demais mudanças que o
-- drizzle-kit empacotou (ai_generations, consultants.whatsapp_optin,
-- organizations.acquisition_*/source) JÁ foram aplicadas ao banco manualmente
-- em migrações anteriores fora do drizzle — o snapshot só estava desatualizado.
-- Aplicar aquelas de novo quebraria com "already exists". IF NOT EXISTS deixa
-- este arquivo idempotente e seguro de rodar no SQL Editor do Supabase.
CREATE TABLE IF NOT EXISTS "funnel_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"anon_id" text,
	"event" text NOT NULL,
	"device" text,
	"path" text,
	"params" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "funnel_events_org_idx" ON "funnel_events" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "funnel_events_event_idx" ON "funnel_events" USING btree ("event");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "funnel_events_created_idx" ON "funnel_events" USING btree ("created_at");
