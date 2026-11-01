import { describe, expect, it } from "bun:test";
import { app } from "../src";

describe("POST /api/users - User Registration", () => {
  const testEmail = `test_${Date.now()}@example.com`;

  it("should register a new user successfully", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Rifa",
          email: testEmail,
          password: "rahasia",
        }),
      })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { data?: string };
    expect(body).toEqual({ data: "OK" });
  });

  it("should return error when registering with duplicate email", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Rifa",
          email: testEmail,
          password: "rahasia",
        }),
      })
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: string };
    expect(body).toEqual({ error: "Email sudah terdaftar" });
  });

  it("should reject name longer than 255 characters", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "A".repeat(256),
          email: `toolong_${Date.now()}@example.com`,
          password: "rahasia",
        }),
      })
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body).toEqual({ error: "Nama maksimal 255 karakter" });
  });

  it("should accept name with exactly 255 characters", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "B".repeat(255),
          email: `batas255_${Date.now()}@example.com`,
          password: "rahasia",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: "OK" });
  });

  it("should reject empty name with a generic validation error", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "",
          email: `kosong_${Date.now()}@example.com`,
          password: "rahasia",
        }),
      })
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "Data yang dikirim tidak valid",
    });
  });
});

