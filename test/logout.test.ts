import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  api,
  bearer,
  cleanupTestUsers,
  countSessionsByUser,
  createTestUser,
  getSession,
  loginAndGetToken,
} from "./helpers/db";

const PREFIX = "logout";

describe("DELETE /api/users/logout - User Logout", () => {
  beforeEach(async () => {
    await cleanupTestUsers(PREFIX);
  });

  afterEach(async () => {
    await cleanupTestUsers(PREFIX);
  });

  it("logout valid menghapus session dari database", async () => {
    const user = await createTestUser(PREFIX, "valid");
    const token = await loginAndGetToken(user.email, user.password);

    const response = await api("/api/users/logout", {
      method: "DELETE",
      headers: bearer(token),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: "OK" });
    expect(await getSession(token)).toBeUndefined();
    expect(await countSessionsByUser(user.id)).toBe(0);
  });

  it("mengembalikan 401 saat current dipakai setelah logout", async () => {
    const user = await createTestUser(PREFIX, "current-setelah-logout");
    const token = await loginAndGetToken(user.email, user.password);

    await api("/api/users/logout", { method: "DELETE", headers: bearer(token) });

    const response = await api("/api/users/current", { headers: bearer(token) });
    expect(response.status).toBe(401);
  });

  it("mengembalikan 401 saat logout dua kali dengan token yang sama", async () => {
    const user = await createTestUser(PREFIX, "logout-ganda");
    const token = await loginAndGetToken(user.email, user.password);

    const first = await api("/api/users/logout", {
      method: "DELETE",
      headers: bearer(token),
    });
    const second = await api("/api/users/logout", {
      method: "DELETE",
      headers: bearer(token),
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(401);
    expect(await second.json()).toEqual({ error: "Unauthorized" });
  });

  it("mengembalikan 401 tanpa header Authorization", async () => {
    const response = await api("/api/users/logout", { method: "DELETE" });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("mengembalikan 401 untuk skema selain Bearer", async () => {
    const response = await api("/api/users/logout", {
      method: "DELETE",
      headers: { Authorization: "Token abc" },
    });

    expect(response.status).toBe(401);
  });

  it("mengembalikan 401 untuk header 'Bearer' tanpa token", async () => {
    const response = await api("/api/users/logout", {
      method: "DELETE",
      headers: { Authorization: "Bearer" },
    });

    expect(response.status).toBe(401);
  });

  it("mengembalikan 401 untuk token acak tanpa menghapus session lain", async () => {
    const user = await createTestUser(PREFIX, "token-acak");
    const token = await loginAndGetToken(user.email, user.password);

    const response = await api("/api/users/logout", {
      method: "DELETE",
      headers: bearer("token-acak-tidak-dikenal"),
    });

    expect(response.status).toBe(401);
    expect(await getSession(token)).toBeDefined();

    const current = await api("/api/users/current", { headers: bearer(token) });
    expect(current.status).toBe(200);
  });

  it("logout satu session tidak menghapus session lain milik user yang sama", async () => {
    const user = await createTestUser(PREFIX, "dua-session");
    const tokenA = await loginAndGetToken(user.email, user.password);
    const tokenB = await loginAndGetToken(user.email, user.password);

    const response = await api("/api/users/logout", {
      method: "DELETE",
      headers: bearer(tokenA),
    });

    expect(response.status).toBe(200);
    expect(await getSession(tokenA)).toBeUndefined();
    expect(await getSession(tokenB)).toBeDefined();
    expect(await countSessionsByUser(user.id)).toBe(1);
  });

  it("logout dengan token sendiri tidak menghapus session user lain", async () => {
    const userA = await createTestUser(PREFIX, "user-a");
    const userB = await createTestUser(PREFIX, "user-b");
    const tokenA = await loginAndGetToken(userA.email, userA.password);
    const tokenB = await loginAndGetToken(userB.email, userB.password);

    const response = await api("/api/users/logout", {
      method: "DELETE",
      headers: bearer(tokenA),
    });

    expect(response.status).toBe(200);
    expect(await getSession(tokenB)).toBeDefined();

    const currentB = await api("/api/users/current", { headers: bearer(tokenB) });
    expect(currentB.status).toBe(200);
  });
});
