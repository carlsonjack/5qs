-- Add app_variant to conversations and leads
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "app_variant" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "app_variant" text;



