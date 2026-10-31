import { Elysia, t } from "elysia";
import { registerUser, DuplicateEmailError } from "../services/users-service";

export const usersRoute = new Elysia({ prefix: "/api/users" }).post(
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
);

