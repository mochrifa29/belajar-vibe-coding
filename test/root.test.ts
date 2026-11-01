import { describe, expect, it } from "bun:test";
import { api } from "./helpers/db";

describe("GET / - Welcome", () => {
  it("mengembalikan 200 dengan Content-Type JSON", async () => {
    const response = await api("/");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("mengembalikan pesan sapaan yang tidak kosong", async () => {
    const response = await api("/");

    expect(response.status).toBe(200);
    const body = (await response.json()) as { message?: string };
    expect(typeof body.message).toBe("string");
    expect(body.message?.length).toBeGreaterThan(0);
  });
});
