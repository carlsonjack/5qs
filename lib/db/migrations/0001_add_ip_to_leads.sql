-- Add ip_address column to leads table
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "ip_address" text;



