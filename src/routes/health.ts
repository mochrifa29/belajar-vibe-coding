import { Elysia } from "elysia";
import { db, pool } from "../db";
import { sql } from "drizzle-orm";

export const healthRoutes = new Elysia().get("/", () => {
  return { message: "🦊 ElysiaJS server is running!" };
}).get("/health", async () => {
  try {
    await db.execute(sql`SELECT 1`);
    return { status: "ok", database: "connected" };
  } catch (error) {
    return { status: "error", database: "disconnected" };
  }
});

