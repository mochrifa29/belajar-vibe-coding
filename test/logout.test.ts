import { describe, expect, it } from "bun:test";
import { app } from "../src";
import { db } from "../src/db";
import { sessions } from "../src/db/schema";
import { eq } from "drizzle-orm";

describe("DELETE /api/users/logout - User Logout", () => {
  const timestamp = Date.now();
  const testUser = {
    name: "Logout User",
    email: `logout_test_${timestamp}@localhost`,
    password: "rahasia",
  };
  let authToken = "";

  it("should setup user and login to obtain session token", async () => {
    // 1. Register user
    const registerRes = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testUser),
      })
    );
    expect(registerRes.status).toBe(200);

    // 2. Login to get token
    const loginRes = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      })
    );
    expect(loginRes.status).toBe(200);
    const loginBody = (await loginRes.json()) as { data?: string };
    expect(loginBody.data).toBeDefined();
    authToken = loginBody.data!;

    // 3. Confirm session exists in DB
    const [sessionInDb] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, authToken));
    expect(sessionInDb).toBeDefined();
  });

  it("should logout successfully with valid token and delete session from DB", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data?: string };
    expect(body).toEqual({ data: "OK" });

    // Verify session record is completely removed from DB
    const [deletedSession] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, authToken));
    expect(deletedSession).toBeUndefined();
  });

  it("should return 401 when trying to get current user with the logged out token", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: string };
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("should return 401 when trying to logout again with the same token", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: string };
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("should return 401 when Authorization header is missing", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: string };
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("should return 401 when token is fake or not found", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: "Bearer fake-token-12345",
        },
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: string };
    expect(body).toEqual({ error: "Unauthorized" });
  });
});

