import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Create connection
const connectionString = process.env.POSTGRES_URL_NON_POOLING!;

if (!connectionString) {
  throw new Error("POSTGRES_URL_NON_POOLING environment variable is required");
}

// Create the connection
const client = postgres(connectionString, {
  prepare: false, // Disable prepared statements for better Vercel compatibility
  max: 10, // Maximum connections
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 30, // Connection timeout
});

// Create Drizzle instance
export const db = drizzle(client, { schema });

// Type exports
export type Database = typeof db;
export * from "./schema";
