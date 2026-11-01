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
      },
    }
  );
