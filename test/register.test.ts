import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  api,
  cleanupTestUsers,
  countUsersByEmail,
  createTestUser,
  findUserByEmail,
  makeTestEmail,
  postJson,
} from "./helpers/db";

const PREFIX = "reg";

describe("POST /api/users - User Registration", () => {
  beforeEach(async () => {
    await cleanupTestUsers(PREFIX);
  });

  afterEach(async () => {
    await cleanupTestUsers(PREFIX);
  });

  it("mendaftarkan user valid dan menyimpan datanya ke database", async () => {
    const input = {
      name: "Rifa",
      email: makeTestEmail(PREFIX, "valid"),
      password: "rahasia",
    };

    const response = await postJson("/api/users", input);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: "OK" });

    const user = await findUserByEmail(input.email);
    expect(user).toBeDefined();
    expect(user?.name).toBe(input.name);
    expect(user?.email).toBe(input.email);
  });

  it("menyimpan password sebagai hash bcrypt, bukan plaintext", async () => {
    const input = {
      name: "Rifa",
      email: makeTestEmail(PREFIX, "hash"),
      password: "rahasia",
    };

    const response = await postJson("/api/users", input);
    expect(response.status).toBe(200);

    const user = await findUserByEmail(input.email);
    expect(user?.password).not.toBe(input.password);
    expect(user?.password.startsWith("$2")).toBe(true);
  });

  it("mengisi created_at secara otomatis", async () => {
    const input = {
      name: "Rifa",
      email: makeTestEmail(PREFIX, "created-at"),
      password: "rahasia",
    };

    const response = await postJson("/api/users", input);
    expect(response.status).toBe(200);

    const user = await findUserByEmail(input.email);
    expect(user?.createdAt).toBeInstanceOf(Date);
  });

  it("menolak email duplikat tanpa menambah baris baru", async () => {
    const user = await createTestUser(PREFIX, "duplikat");

    const response = await postJson("/api/users", {
      name: "User Lain",
      email: user.email,
      password: "rahasia",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Email sudah terdaftar" });
    expect(await countUsersByEmail(user.email)).toBe(1);
  });

  it("menolak email duplikat dengan kapitalisasi berbeda", async () => {
    // Collation MySQL yang dipakai bersifat case-insensitive.
    const user = await createTestUser(PREFIX, "duplikat-case");

    const response = await postJson("/api/users", {
      name: "User Lain",
      email: user.email.toUpperCase(),
      password: "rahasia",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Email sudah terdaftar" });
    expect(await countUsersByEmail(user.email)).toBe(1);
  });

  it("menolak name kosong", async () => {
    const response = await postJson("/api/users", {
      name: "",
      email: makeTestEmail(PREFIX, "name-kosong"),
      password: "rahasia",
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "Data yang dikirim tidak valid",
    });
  });

  it("menerima name tepat 255 karakter", async () => {
    const input = {
      name: "A".repeat(255),
      email: makeTestEmail(PREFIX, "name-255"),
      password: "rahasia",
    };

    const response = await postJson("/api/users", input);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: "OK" });
    expect((await findUserByEmail(input.email))?.name).toBe(input.name);
  });

  it("menolak name 256 karakter", async () => {
    const response = await postJson("/api/users", {
      name: "A".repeat(256),
      email: makeTestEmail(PREFIX, "name-256"),
      password: "rahasia",
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "Nama maksimal 255 karakter",
    });
  });

  it("menolak name 300 karakter", async () => {
    const response = await postJson("/api/users", {
      name: "A".repeat(300),
      email: makeTestEmail(PREFIX, "name-300"),
      password: "rahasia",
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "Nama maksimal 255 karakter",
    });
  });

  it("menolak email kosong", async () => {
    const response = await postJson("/api/users", {
      name: "Rifa",
      email: "",
      password: "rahasia",
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "Data yang dikirim tidak valid",
    });
  });

  it("menolak email lebih dari 255 karakter", async () => {
    const response = await postJson("/api/users", {
      name: "Rifa",
      email: `${"e".repeat(250)}@test.local`,
      password: "rahasia",
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "Email maksimal 255 karakter",
    });
  });

  it("menolak password kosong", async () => {
    const response = await postJson("/api/users", {
      name: "Rifa",
      email: makeTestEmail(PREFIX, "password-kosong"),
      password: "",
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "Data yang dikirim tidak valid",
    });
  });

  it("menolak request tanpa field name", async () => {
    const response = await postJson("/api/users", {
      email: makeTestEmail(PREFIX, "tanpa-name"),
      password: "rahasia",
    });

    expect(response.status).toBe(422);
  });

  it("menolak request tanpa field email", async () => {
    const response = await postJson("/api/users", {
      name: "Rifa",
      password: "rahasia",
    });

    expect(response.status).toBe(422);
  });

  it("menolak request tanpa field password", async () => {
    const response = await postJson("/api/users", {
      name: "Rifa",
      email: makeTestEmail(PREFIX, "tanpa-password"),
    });

    expect(response.status).toBe(422);
  });

  it("menolak body JSON yang rusak tanpa membuat server crash", async () => {
    const response = await api("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);

    const health = await api("/health");
    expect(health.status).toBe(200);
  });

  it("menolak body dengan Content-Type yang salah", async () => {
    const email = makeTestEmail(PREFIX, "content-type");

    const response = await api("/api/users", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ name: "Rifa", email, password: "rahasia" }),
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(await findUserByEmail(email)).toBeUndefined();
  });

  it("mengabaikan field tambahan di luar schema", async () => {
    const input = {
      name: "Rifa",
      email: makeTestEmail(PREFIX, "field-ekstra"),
      password: "rahasia",
    };

    const response = await postJson("/api/users", {
      ...input,
      role: "admin",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: "OK" });
    expect(await findUserByEmail(input.email)).toBeDefined();
  });

  it("menyimpan nama dengan emoji secara utuh", async () => {
    const input = {
      name: "Rifa 🦊🚀",
      email: makeTestEmail(PREFIX, "emoji"),
      password: "rahasia",
    };

    const response = await postJson("/api/users", input);
    expect(response.status).toBe(200);

    const user = await findUserByEmail(input.email);
    expect(user?.name).toBe(input.name);
  });

  it("menyimpan nama berisi karakter aneh sebagai teks biasa", async () => {
    const berbahaya = "'; DROP TABLE users; --";
    const input = {
      name: berbahaya,
      email: makeTestEmail(PREFIX, "injection"),
      password: "rahasia",
    };

    const response = await postJson("/api/users", input);
    expect(response.status).toBe(200);

    const user = await findUserByEmail(input.email);
    expect(user?.name).toBe(berbahaya);

    // Tabel users masih bisa dipakai setelah input tersebut.
    const another = await createTestUser(PREFIX, "setelah-injection");
    expect(another.id).toBeGreaterThan(0);
  });
});
