import { describe, expect, it } from "bun:test";
import { api } from "./helpers/db";

interface OpenAPIDocument {
  openapi?: string;
  info?: { title?: string; version?: string };
  tags?: Array<{ name?: string }>;
  paths?: Record<
    string,
    Record<
      string,
      {
        summary?: string;
        tags?: string[];
        security?: Array<Record<string, unknown>>;
      }
    >
  >;
  components?: {
    securitySchemes?: Record<
      string,
      { type?: string; scheme?: string; bearerFormat?: string }
    >;
  };
}

describe("Dokumentasi API (Swagger/OpenAPI)", () => {
  it("menyajikan halaman Swagger UI", async () => {
    const response = await api("/swagger");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
  });

  it("menyajikan spesifikasi OpenAPI 3", async () => {
    const response = await api("/swagger/json");

    expect(response.status).toBe(200);
    const spec = (await response.json()) as OpenAPIDocument;

    expect(spec.openapi?.startsWith("3.")).toBe(true);
    expect(spec.info).toBeDefined();
  });

  it("mendokumentasikan semua endpoint yang tersedia", async () => {
    const response = await api("/swagger/json");
    const spec = (await response.json()) as OpenAPIDocument;

    expect(Object.keys(spec.paths ?? {})).toEqual(
      expect.arrayContaining([
        "/",
        "/health",
        "/api/users",
        "/api/users/login",
        "/api/users/current",
        "/api/users/logout",
      ])
    );
  });

  it("mendefinisikan skema autentikasi bearer", async () => {
    const response = await api("/swagger/json");
    const spec = (await response.json()) as OpenAPIDocument;

    expect(spec.components?.securitySchemes?.bearerAuth).toMatchObject({
      type: "http",
      scheme: "bearer",
      bearerFormat: "UUID",
    });
  });

  it("menandai endpoint yang butuh Bearer token", async () => {
    const response = await api("/swagger/json");
    const spec = (await response.json()) as OpenAPIDocument;

    expect(spec.paths?.["/api/users/current"]?.get?.security).toEqual([
      { bearerAuth: [] },
    ]);
    expect(spec.paths?.["/api/users/logout"]?.delete?.security).toEqual([
      { bearerAuth: [] },
    ]);
  });

  it("mengelompokkan endpoint dengan tag System dan Auth", async () => {
    const response = await api("/swagger/json");
    const spec = (await response.json()) as OpenAPIDocument;

    const tagNames = (spec.tags ?? []).map((tag) => tag.name);
    expect(tagNames).toEqual(expect.arrayContaining(["System", "Auth"]));
  });
});
