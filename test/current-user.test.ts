import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  api,
  bearer,
  cleanupTestUsers,
  createTestUser,
  loginAndGetToken,
} from "./helpers/db";

const PREFIX = "cur";

interface CurrentUserBody {
  data: {
    id: number;
    name: string;
    email: string;
    created_at: string;
  };
}

describe("GET /api/users/current - Get Current User", () => {
  beforeEach(async () => {
    await cleanupTestUsers(PREFIX);
  });

  afterEach(async () => {
    await cleanupTestUsers(PREFIX);
  });

  it("mengembalikan data user yang sedang login", async () => {
    const user = await createTestUser(PREFIX, "valid", { name: "Eko" });
    const token = await loginAndGetToken(user.email, user.password);

    const response = await api("/api/users/current", { headers: bearer(token) });

    expect(response.status).toBe(200);
    const body = (await response.json()) as CurrentUserBody;
    expect(body.data.id).toBe(user.id);
    expect(body.data.name).toBe(user.name);
    expect(body.data.email).toBe(user.email);
    expect(body.data.created_at).toBeDefined();
  });

  it("tidak menyertakan password di response", async () => {
    const user = await createTestUser(PREFIX, "no-password");
    const token = await loginAndGetToken(user.email, user.password);

    const response = await api("/api/users/current", { headers: bearer(token) });
    const body = (await response.json()) as CurrentUserBody;

    expect(body.data).not.toHaveProperty("password");
    expect(JSON.stringify(body)).not.toContain("$2");
  });

  it("mengembalikan 401 tanpa header Authorization", async () => {
    const response = await api("/api/users/current");

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("mengembalikan 401 untuk skema selain Bearer", async () => {
    const user = await createTestUser(PREFIX, "skema-lain");
    const token = await loginAndGetToken(user.email, user.password);

    const response = await api("/api/users/current", {
      headers: { Authorization: `Token ${token}` },
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("mengembalikan 401 untuk header 'Bearer' tanpa token", async () => {
    const response = await api("/api/users/current", {
      headers: { Authorization: "Bearer" },
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("mengembalikan 401 untuk token kosong", async () => {
    const response = await api("/api/users/current", {
      headers: { Authorization: "Bearer " },
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("mengembalikan 401 untuk token acak yang tidak ada di sessions", async () => {
    const response = await api("/api/users/current", {
      headers: bearer("00000000-0000-0000-0000-000000000000"),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("mengembalikan 401 setelah token dipakai logout", async () => {
    const user = await createTestUser(PREFIX, "setelah-logout");
    const token = await loginAndGetToken(user.email, user.password);

    const logout = await api("/api/users/logout", {
      method: "DELETE",
      headers: bearer(token),
    });
    expect(logout.status).toBe(200);

    const response = await api("/api/users/current", { headers: bearer(token) });
    expect(response.status).toBe(401);
  });

  it("menerima dua session aktif milik user yang sama", async () => {
    const user = await createTestUser(PREFIX, "dua-session");
    const tokenA = await loginAndGetToken(user.email, user.password);
    const tokenB = await loginAndGetToken(user.email, user.password);

    const responseA = await api("/api/users/current", { headers: bearer(tokenA) });
    const responseB = await api("/api/users/current", { headers: bearer(tokenB) });

    expect(responseA.status).toBe(200);
    expect(responseB.status).toBe(200);
  });

  it("menolak skema 'bearer' dengan huruf kecil", async () => {
    const user = await createTestUser(PREFIX, "bearer-lowercase");
    const token = await loginAndGetToken(user.email, user.password);

    const response = await api("/api/users/current", {
      headers: { Authorization: `bearer ${token}` },
    });

    expect(response.status).toBe(401);
  });

  it("menerima spasi berlebih di sekitar token", async () => {
    const user = await createTestUser(PREFIX, "spasi-berlebih");
    const token = await loginAndGetToken(user.email, user.password);

    const response = await api("/api/users/current", {
      headers: { Authorization: `Bearer   ${token}` },
    });

    expect(response.status).toBe(200);
  });
});
