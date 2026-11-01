import { describe, expect, it } from "bun:test";
import { api } from "./helpers/db";

describe("GET /health - Health Check", () => {
  it("mengembalikan status ok saat database terhubung", async () => {
    const response = await api("/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      database: "connected",
    });
  });

  it("tidak membutuhkan autentikasi", async () => {
    const response = await api("/health", { headers: {} });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      database: "connected",
    });
  });
});
