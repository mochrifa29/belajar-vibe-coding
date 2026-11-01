import { Elysia, t } from "elysia";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  DuplicateEmailError,
  AuthenticationError,
  UnauthorizedError,
} from "../services/users-service";
import { extractBearerToken } from "../lib/auth";
import { jsonResponse, jsonResponseWithExamples } from "../lib/openapi";

/**
 * Batas panjang field mengikuti kolom `varchar(255)` di tabel `users`.
 * Jika schema database berubah, ubah nilai di sini juga.
 */
const MAX_LENGTH = {
  name: 255,
  email: 255,
} as const;

const FIELD_LABEL = {
  name: "Nama",
  email: "Email",
} as const;

/** TypeBox `ValueErrorType.StringMaxLength` */
const TYPEBOX_STRING_MAX_LENGTH = 51;

const bearerHeaderSchema = t.Object({
  authorization: t.Optional(
    t.String({ description: "Format: Bearer <token UUID>" })
  ),
});

export const usersRoute = new Elysia({ prefix: "/api/users" })
  // Di Elysia 1.4 hook error harus didaftarkan sebelum route agar ikut
  // terpasang pada handler yang dikompilasi.
  .onError((ctx) => {
    if (ctx.code !== "VALIDATION") {
      return;
    }

    const valueError = ctx.error.all?.[0];
    const field = (valueError?.path?.replace(/^\//, "") ??
      "") as keyof typeof MAX_LENGTH;
    const label = FIELD_LABEL[field];

    ctx.set.status = 422;

    // Hanya beri pesan spesifik untuk pelanggaran maxLength. Pelanggaran lain
    // (mis. field kosong atau tipe salah) memakai pesan umum.
    if (valueError?.type === TYPEBOX_STRING_MAX_LENGTH && label) {
      return {
        error: `${label} maksimal ${MAX_LENGTH[field]} karakter`,
      };
    }

    return {
      error: "Data yang dikirim tidak valid",
    };
  })
  .post(
    "",
    async ({ body, set }) => {
      try {
        await registerUser({
          name: body.name,
          email: body.email,
          password: body.password,
        });

        set.status = 200;
        return {
          data: "OK",
        };
      } catch (error) {
        if (error instanceof DuplicateEmailError) {
          set.status = 400;
          return {
            error: error.message,
          };
        }

        // Menangani error tak terduga
        set.status = 500;
        return {
          error: "Terjadi kesalahan pada server",
        };
      }
    },
    {
      body: t.Object({
        name: t.String({
          minLength: 1,
          maxLength: MAX_LENGTH.name,
          description: "Nama tampilan user (maksimal 255 karakter)",
        }),
        email: t.String({
          minLength: 1,
          maxLength: MAX_LENGTH.email,
          description: "Email unik user (maksimal 255 karakter)",
        }),
        password: t.String({
          minLength: 1,
          description: "Password plaintext, akan di-hash dengan bcrypt",
        }),
      }),
      detail: {
        tags: ["Auth"],
        summary: "Registrasi user baru",
        description:
          "Membuat user baru. Mengembalikan 400 jika email sudah terdaftar.",
        responses: {
          200: jsonResponse("User berhasil dibuat", {
            data: "OK",
          }),
          400: jsonResponse("Email sudah terdaftar", {
            error: "Email sudah terdaftar",
          }),
          422: jsonResponseWithExamples("Data request tidak valid", {
            invalid: {
              summary: "Validasi umum",
              value: { error: "Data yang dikirim tidak valid" },
            },
            nameTooLong: {
              summary: "Nama melebihi 255 karakter",
              value: { error: "Nama maksimal 255 karakter" },
            },
            emailTooLong: {
              summary: "Email melebihi 255 karakter",
              value: { error: "Email maksimal 255 karakter" },
            },
          }),
          500: jsonResponse("Terjadi kesalahan tak terduga", {
            error: "Terjadi kesalahan pada server",
          }),
        },
      },
    }
  )
  .post(
    "/login",
    async ({ body, set }) => {
      try {
        const result = await loginUser({
          email: body.email,
          password: body.password,
        });

        set.status = 200;
        return {
          data: result.token,
        };
      } catch (error) {
        if (error instanceof AuthenticationError) {
          set.status = 400;
          return {
            error: error.message,
          };
        }

        // Menangani error tak terduga
        set.status = 500;
        return {
          error: "Terjadi kesalahan pada server",
        };
      }
    },
    {
      body: t.Object({
        email: t.String({
          minLength: 1,
          maxLength: MAX_LENGTH.email,
          description: "Email yang terdaftar (maksimal 255 karakter)",
        }),
        password: t.String({
          minLength: 1,
          description: "Password plaintext milik user",
        }),
      }),
      detail: {
        tags: ["Auth"],
        summary: "Login user",
        description:
          "Memverifikasi email/password lalu membuat session token UUID. Pesan error sengaja sama untuk email tidak terdaftar dan password salah.",
        responses: {
          200: jsonResponse("Login berhasil, token session dalam bentuk UUID", {
            data: "3f2b8c1e-9d4a-4b7e-8c2f-1a2b3c4d5e6f",
          }),
          400: jsonResponse("Email tidak terdaftar atau password salah", {
            error: "Email atau password salah",
          }),
          422: jsonResponseWithExamples("Data request tidak valid", {
            invalid: {
              summary: "Validasi umum",
              value: { error: "Data yang dikirim tidak valid" },
            },
            emailTooLong: {
              summary: "Email melebihi 255 karakter",
              value: { error: "Email maksimal 255 karakter" },
            },
          }),
          500: jsonResponse("Terjadi kesalahan tak terduga", {
            error: "Terjadi kesalahan pada server",
          }),
        },
      },
    }
  )
  .get(
    "/current",
    async ({ headers, set }) => {
      const token = extractBearerToken(headers);
      if (!token) {
        set.status = 401;
        return {
          error: "Unauthorized",
        };
      }

      try {
        const user = await getCurrentUser(token);
        set.status = 200;
        return {
          data: user,
        };
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          set.status = 401;
          return {
            error: error.message,
          };
        }

        set.status = 500;
        return {
          error: "Terjadi kesalahan pada server",
        };
      }
    },
    {
      headers: bearerHeaderSchema,
      detail: {
        tags: ["Auth"],
        summary: "Profil user saat ini",
        description:
          "Mengembalikan data user pemilik Bearer token. Tidak menyertakan password.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: jsonResponse("Data profil user yang sedang login", {
            data: {
              id: 1,
              name: "Budi Santoso",
              email: "budi@example.com",
              created_at: "2026-11-01T10:00:00.000Z",
            },
          }),
          401: jsonResponse("Bearer token tidak ada atau session tidak valid", {
            error: "Unauthorized",
          }),
          500: jsonResponse("Terjadi kesalahan tak terduga", {
            error: "Terjadi kesalahan pada server",
          }),
        },
      },
    }
  )
  .delete(
    "/logout",
    async ({ headers, set }) => {
      const token = extractBearerToken(headers);
      if (!token) {
        set.status = 401;
        return {
          error: "Unauthorized",
        };
      }

      try {
        await logoutUser(token);
        set.status = 200;
        return {
          data: "OK",
        };
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          set.status = 401;
          return {
            error: error.message,
          };
        }

        set.status = 500;
        return {
          error: "Terjadi kesalahan pada server",
        };
      }
    },
    {
      headers: bearerHeaderSchema,
      detail: {
        tags: ["Auth"],
        summary: "Logout user",
        description:
          "Menghapus session milik token. Session lain milik user yang sama tetap aktif.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: jsonResponse("Session berhasil dihapus", {
            data: "OK",
          }),
          401: jsonResponse("Bearer token tidak ada atau session tidak ditemukan", {
            error: "Unauthorized",
          }),
          500: jsonResponse("Terjadi kesalahan tak terduga", {
            error: "Terjadi kesalahan pada server",
          }),
        },
      },
    }
  );
