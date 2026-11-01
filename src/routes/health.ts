import { Elysia } from "elysia";
import { db, pool } from "../db";
import { sql } from "drizzle-orm";
import { jsonResponse, jsonResponseWithExamples } from "../lib/openapi";

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
        responses: {
          200: jsonResponse("Server berjalan normal", {
            message: "🦊 ElysiaJS server is running!",
          }),
        },
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
        responses: {
          200: jsonResponseWithExamples(
            "Status server dan koneksi database",
            {
              connected: {
                summary: "Database terhubung",
                value: { status: "ok", database: "connected" },
              },
              disconnected: {
                summary: "Database terputus",
                value: { status: "error", database: "disconnected" },
              },
            }
          ),
        },
      },
    }
  );
