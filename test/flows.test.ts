import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  api,
  bearer,
  cleanupTestUsers,
  createTestUser,
  loginAndGetToken,
} from "./helpers/db";

const PREFIX = "flow";

describe("Alur end-to-end user", () => {
  beforeEach(async () => {
    await cleanupTestUsers(PREFIX);
  });

  afterEach(async () => {
    await cleanupTestUsers(PREFIX);
  });

  it("register -> login -> current -> logout -> current kembali 401", async () => {
    const user = await createTestUser(PREFIX, "alur-lengkap");

    const token = await loginAndGetToken(user.email, user.password);

    const current = await api("/api/users/current", { headers: bearer(token) });
    expect(current.status).toBe(200);

    const logout = await api("/api/users/logout", {
      method: "DELETE",
      headers: bearer(token),
    });
    expect(logout.status).toBe(200);

    const afterLogout = await api("/api/users/current", {
      headers: bearer(token),
    });
    expect(afterLogout.status).toBe(401);
  });

  it("logout dari satu perangkat tidak mengganggu perangkat lain", async () => {
    const user = await createTestUser(PREFIX, "dua-perangkat");

    const perangkatSatu = await loginAndGetToken(user.email, user.password);
    const perangkatDua = await loginAndGetToken(user.email, user.password);

    const logout = await api("/api/users/logout", {
      method: "DELETE",
      headers: bearer(perangkatSatu),
    });
    expect(logout.status).toBe(200);

    const currentDua = await api("/api/users/current", {
      headers: bearer(perangkatDua),
    });
    expect(currentDua.status).toBe(200);
  });

  it("login ulang setelah logout menghasilkan token baru yang valid", async () => {
    const user = await createTestUser(PREFIX, "login-ulang");

    const tokenLama = await loginAndGetToken(user.email, user.password);
    await api("/api/users/logout", {
      method: "DELETE",
      headers: bearer(tokenLama),
    });

    const tokenBaru = await loginAndGetToken(user.email, user.password);

    expect(tokenBaru).not.toBe(tokenLama);

    const current = await api("/api/users/current", {
      headers: bearer(tokenBaru),
    });
    expect(current.status).toBe(200);
  });
});
