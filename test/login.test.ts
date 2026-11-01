import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  cleanupTestUsers,
  countSessionsByUser,
  createTestUser,
  getSession,
  loginAndGetToken,
  makeTestEmail,
  postJson,
} from "./helpers/db";

const PREFIX = "login";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("POST /api/users/login - User Login & Session", () => {
  beforeEach(async () => {
    await cleanupTestUsers(PREFIX);
  });

  afterEach(async () => {
    await cleanupTestUsers(PREFIX);
  });

  it("login valid mengembalikan token UUID dan membuat session", async () => {
    const user = await createTestUser(PREFIX, "valid");

    const response = await postJson("/api/users/login", {
      email: user.email,
      password: user.password,
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { data?: string };
    expect(body.data).toMatch(UUID_V4);

    const session = await getSession(body.data!);
    expect(session).toBeDefined();
    expect(session?.userId).toBe(user.id);
  });

  it("menolak password yang salah tanpa membuat session", async () => {
    const user = await createTestUser(PREFIX, "password-salah");

    const response = await postJson("/api/users/login", {
      email: user.email,
      password: "password_salah",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Email atau password salah",
    });
    expect(await countSessionsByUser(user.id)).toBe(0);
  });

  it("menolak email yang tidak terdaftar dengan pesan yang sama", async () => {
    const response = await postJson("/api/users/login", {
      email: makeTestEmail(PREFIX, "tidak-terdaftar"),
      password: "rahasia",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Email atau password salah",
    });
  });

  it("menolak email kosong", async () => {
    const response = await postJson("/api/users/login", {
      email: "",
      password: "rahasia",
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "Data yang dikirim tidak valid",
    });
  });

  it("menolak password kosong", async () => {
    const response = await postJson("/api/users/login", {
      email: makeTestEmail(PREFIX, "password-kosong"),
      password: "",
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "Data yang dikirim tidak valid",
    });
  });

  it("menolak email lebih dari 255 karakter", async () => {
    const response = await postJson("/api/users/login", {
      email: `${"e".repeat(250)}@test.local`,
      password: "rahasia",
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "Email maksimal 255 karakter",
    });
  });

  it("login dua kali menghasilkan dua token berbeda yang keduanya tersimpan", async () => {
    const user = await createTestUser(PREFIX, "multi-login");

    const first = await loginAndGetToken(user.email, user.password);
    const second = await loginAndGetToken(user.email, user.password);

    expect(first).not.toBe(second);
    expect(await getSession(first)).toBeDefined();
    expect(await getSession(second)).toBeDefined();
    expect(await countSessionsByUser(user.id)).toBe(2);
  });

  it("menerima email dengan kapitalisasi berbeda dari saat registrasi", async () => {
    // Collation MySQL yang dipakai bersifat case-insensitive.
    const user = await createTestUser(PREFIX, "email-case");

    const response = await postJson("/api/users/login", {
      email: user.email.toUpperCase(),
      password: user.password,
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { data?: string };
    expect(body.data).toMatch(UUID_V4);
  });

  it("token yang dihasilkan berbeda untuk user yang berbeda", async () => {
    const userA = await createTestUser(PREFIX, "token-a");
    const userB = await createTestUser(PREFIX, "token-b");

    const tokenA = await loginAndGetToken(userA.email, userA.password);
    const tokenB = await loginAndGetToken(userB.email, userB.password);

    expect(tokenA).not.toBe(tokenB);
  });

  it("response login tidak memuat password atau hash", async () => {
    const user = await createTestUser(PREFIX, "no-password");

    const response = await postJson("/api/users/login", {
      email: user.email,
      password: user.password,
    });
    const body = await response.text();

    expect(body).not.toContain(user.password);
    expect(body).not.toContain("$2");
  });
});
