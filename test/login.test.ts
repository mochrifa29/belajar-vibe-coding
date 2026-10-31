import { describe, expect, it } from "bun:test";
import { app } from "../src";

describe("POST /api/users/login - User Login & Session", () => {
  const timestamp = Date.now();
  const testUser = {
    name: "Rifa",
    email: `login_test_${timestamp}@example.com`,
    password: "rahasia",
  };

  it("should register a user first", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testUser),
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data?: string };
    expect(body).toEqual({ data: "OK" });
  });

  it("should login successfully with correct credentials and return a token", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data?: string };
    expect(body.data).toBeDefined();
    // Verify token format is a UUID v4
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(body.data!)).toBe(true);
  });

  it("should return error when password is wrong", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          password: "password_salah",
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body).toEqual({ error: "Email atau password salah" });
  });

  it("should return error when email is not registered", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "tidak_terdaftar@example.com",
          password: "rahasia",
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body).toEqual({ error: "Email atau password salah" });
  });
});

