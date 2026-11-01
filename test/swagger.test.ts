import { describe, expect, it } from "bun:test";
import { api } from "./helpers/db";

interface OpenAPIResponse {
  description?: string;
  content?: {
    "application/json"?: {
      schema?: unknown;
      example?: unknown;
      examples?: Record<string, { summary?: string; value?: unknown }>;
    };
  };
}

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
        responses?: Record<string, OpenAPIResponse>;
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

const hasResponseExample = (response?: OpenAPIResponse) => {
  const media = response?.content?.["application/json"];

  return (
    media?.example !== undefined ||
    (media?.examples !== undefined && Object.keys(media.examples).length > 0)
  );
};

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

  it("menampilkan contoh response body pada semua endpoint", async () => {
    const response = await api("/swagger/json");
    const spec = (await response.json()) as OpenAPIDocument;

    // Setiap endpoint minimal punya contoh response sukses.
    for (const methods of Object.values(spec.paths ?? {})) {
      for (const operation of Object.values(methods)) {
        expect(hasResponseExample(operation.responses?.["200"])).toBe(true);
      }
    }

    const register = spec.paths?.["/api/users"]?.post?.responses;
    const login = spec.paths?.["/api/users/login"]?.post?.responses;
    const current = spec.paths?.["/api/users/current"]?.get?.responses;
    const logout = spec.paths?.["/api/users/logout"]?.delete?.responses;

    for (const status of ["400", "422", "500"]) {
      expect(hasResponseExample(register?.[status])).toBe(true);
      expect(hasResponseExample(login?.[status])).toBe(true);
    }

    for (const status of ["401", "500"]) {
      expect(hasResponseExample(current?.[status])).toBe(true);
      expect(hasResponseExample(logout?.[status])).toBe(true);
    }
  });
});
