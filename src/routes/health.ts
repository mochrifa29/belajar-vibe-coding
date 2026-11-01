import { Elysia } from "elysia";
import { db, pool } from "../db";
import { sql } from "drizzle-orm";

export const healthRoutes = new Elysia()
  .get(
    "/",
    () => {
      return { message: "🦊 ElysiaJS server is running!" };
    },
    {
      detail: {
        tags: ["System"],
        summary: "Welcome message",
        description: "Memastikan server berjalan dan merespons.",
      },
    }
  )
  .get(
    "/health",
    async () => {
      try {
        await db.execute(sql`SELECT 1`);
        return { status: "ok", database: "connected" };
      } catch (error) {
        return { status: "error", database: "disconnected" };
      }
    },
    {
      detail: {
        tags: ["System"],
        summary: "Health check",
        description:
          "Mengecek konektivitas database. Response tetap 200 meskipun database terputus.",
      },
    }
  );
