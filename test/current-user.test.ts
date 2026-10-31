import { describe, expect, it } from "bun:test";
import { app } from "../src";

describe("GET /api/users/current - Get Current User", () => {
  const timestamp = Date.now();
  const testUser = {
    name: "Eko",
    email: `current_test_${timestamp}@localhost`,
    password: "rahasia",
  };
  let authToken = "";

  it("should setup user and login to obtain token", async () => {
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
  });

  it("should get current user successfully with valid token", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data?: {
        id: number;
        name: string;
        email: string;
        created_at: string;
        password?: string;
      };
    };

    expect(body.data).toBeDefined();
    expect(body.data?.name).toBe(testUser.name);
    expect(body.data?.email).toBe(testUser.email);
    expect(body.data?.id).toBeDefined();
    expect(body.data?.created_at).toBeDefined();
    // Security check: password must NOT be returned!
    expect(body.data?.password).toBeUndefined();
  });

  it("should return 401 when Authorization header is missing", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: string };
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("should return 401 when token is invalid or not in sessions", async () => {
    const fakeToken = "00000000-0000-0000-0000-000000000000";
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${fakeToken}`,
        },
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: string };
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("should return 401 when Authorization header format is not Bearer", async () => {
    const res = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: `Basic ${authToken}`,
        },
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: string };
    expect(body).toEqual({ error: "Unauthorized" });
  });
});

