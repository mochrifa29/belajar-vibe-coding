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
    "/",
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
        name: t.String({ minLength: 1, maxLength: MAX_LENGTH.name }),
        email: t.String({ minLength: 1, maxLength: MAX_LENGTH.email }),
        password: t.String({ minLength: 1 }),
      }),
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
        email: t.String({ minLength: 1, maxLength: MAX_LENGTH.email }),
        password: t.String({ minLength: 1 }),
      }),
    }
  )
  .get("/current", async ({ headers, set }) => {
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
  })
  .delete("/logout", async ({ headers, set }) => {
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
  });
