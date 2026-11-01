import type { DocumentDecoration } from "elysia";

/**
 * Helper untuk mendokumentasikan response body pada OpenAPI tanpa mengubah
 * validasi atau bentuk response asli. Semua nilai di sini hanya metadata
 * yang dibaca oleh plugin Swagger.
 */

type OpenAPIResponse = NonNullable<DocumentDecoration["responses"]>[string];

export interface JsonSchemaObject {
  type?: "object" | "array" | "string" | "integer" | "number" | "boolean";
  properties?: Record<string, JsonSchemaObject>;
  items?: JsonSchemaObject;
  required?: string[];
  nullable?: boolean;
  format?: string;
}

/**
 * Menurunkan schema JSON sederhana dari contoh nilai. Hasilnya dipakai agar
 * Swagger UI menampilkan tab "Schema" di samping contoh response.
 */
export function inferJsonSchema(value: unknown): JsonSchemaObject {
  if (value === null) {
    return { type: "string", nullable: true };
  }

  if (Array.isArray(value)) {
    return {
      type: "array",
      items: value.length > 0 ? inferJsonSchema(value[0]) : {},
    };
  }

  if (typeof value === "string") {
    return { type: "string" };
  }

  if (typeof value === "number") {
    return { type: Number.isInteger(value) ? "integer" : "number" };
  }

  if (typeof value === "boolean") {
    return { type: "boolean" };
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);

    return {
      type: "object",
      properties: Object.fromEntries(
        entries.map(([key, entry]) => [key, inferJsonSchema(entry)])
      ),
      required: entries.map(([key]) => key),
    };
  }

  return {};
}

/** Response JSON dengan satu contoh body. */
export function jsonResponse(
  description: string,
  example: unknown
): OpenAPIResponse {
  return {
    description,
    content: {
      "application/json": {
        schema: inferJsonSchema(example) as never,
        example,
      },
    },
  };
}

/** Response JSON dengan beberapa contoh body (mis. sukses dan error). */
export function jsonResponseWithExamples(
  description: string,
  examples: Record<string, { summary: string; value: unknown }>
): OpenAPIResponse {
  const firstExample = Object.values(examples)[0]?.value;

  return {
    description,
    content: {
      "application/json": {
        schema: inferJsonSchema(firstExample) as never,
        examples,
      },
    },
  };
}
