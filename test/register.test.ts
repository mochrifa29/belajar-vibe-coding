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
});

