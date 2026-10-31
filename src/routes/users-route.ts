import { Elysia, t } from "elysia";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  DuplicateEmailError,
  AuthenticationError,
  UnauthorizedError,
} from "../services/users-service";

export const usersRoute = new Elysia({ prefix: "/api/users" })
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
        name: t.String({ minLength: 1 }),
        email: t.String({ minLength: 1 }),
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
        email: t.String({ minLength: 1 }),
        password: t.String({ minLength: 1 }),
      }),
    }
  )
  .get("/current", async ({ headers, set }) => {
    const authHeader = headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      set.status = 401;
      return {
        error: "Unauthorized",
      };
    }

    const token = authHeader.slice(7).trim();
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
  });
