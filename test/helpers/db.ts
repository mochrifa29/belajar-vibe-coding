import { eq, inArray, like } from "drizzle-orm";
import { app } from "../../src";
import { db } from "../../src/db";
import { sessions, users } from "../../src/db/schema";

const BASE_URL = "http://localhost:3000";

export const TEST_EMAIL_DOMAIN = "test.local";

let emailSequence = 0;

/**
 * Email test selalu berakhiran `@test.local` dan punya prefix per file test.
 * Prefix dipakai oleh `cleanupTestUsers` agar penghapusan tetap terbatas.
 */
export function makeTestEmail(prefix: string, label: string): string {
  emailSequence += 1;
  return `test-${prefix}-${label}-${Date.now()}-${emailSequence}@${TEST_EMAIL_DOMAIN}`;
}

/**
 * Hapus data test berdasarkan prefix email: sessions dulu (foreign key),
 * baru users. Tidak pernah menghapus seluruh isi tabel.
 */
export async function cleanupTestUsers(prefix: string): Promise<void> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.email, `test-${prefix}-%@${TEST_EMAIL_DOMAIN}`));

  const ids = rows.map((row) => row.id);
  if (ids.length === 0) return;

  await db.delete(sessions).where(inArray(sessions.userId, ids));
  await db.delete(users).where(inArray(users.id, ids));
}

export function api(path: string, init?: RequestInit): Promise<Response> {
  return app.handle(new Request(BASE_URL + path, init));
}

export function postJson(path: string, body: unknown): Promise<Response> {
  return api(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export interface TestUserInput {
  name: string;
  email: string;
  password: string;
}

export interface TestUser extends TestUserInput {
  id: number;
}

export async function createTestUser(
  prefix: string,
  label: string,
  overrides: Partial<TestUserInput> = {}
): Promise<TestUser> {
  const input: TestUserInput = {
    name: "Test User",
    email: makeTestEmail(prefix, label),
    password: "rahasia",
    ...overrides,
  };

  const response = await postJson("/api/users", input);
  if (response.status !== 200) {
    throw new Error(
      `createTestUser gagal (${response.status}): ${await response.text()}`
    );
  }

  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (!row) {
    throw new Error("createTestUser: user tidak ditemukan di database");
  }

  return {
    id: row.id,
    name: input.name,
    email: input.email,
    password: input.password,
  };
}

export async function loginAndGetToken(
  email: string,
  password: string
): Promise<string> {
  const response = await postJson("/api/users/login", { email, password });
  if (response.status !== 200) {
    throw new Error(`login gagal (${response.status}): ${await response.text()}`);
  }

  const body = (await response.json()) as { data: string };
  return body.data;
}

export async function findUserByEmail(email: string) {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return row;
}

export async function countUsersByEmail(email: string): Promise<number> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  return rows.length;
}

export async function getSession(token: string) {
  const [row] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);
  return row;
}

export async function countSessionsByUser(userId: number): Promise<number> {
  const rows = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.userId, userId));
  return rows.length;
}
