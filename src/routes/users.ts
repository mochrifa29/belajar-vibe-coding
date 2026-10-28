import { Elysia, t } from "elysia";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export const userRoutes = new Elysia({ prefix: "/users" })
  // GET all users
  .get("/", async () => {
    const allUsers = await db.select().from(users);
    return allUsers;
  })

  // GET user by id
  .get("/:id", async ({ params }) => {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, Number(params.id)));
    if (user.length === 0) {
      return { error: "User not found" };
    }
    return user[0];
  })

  // POST create user
  .post(
    "/",
    async ({ body }) => {
      const result = await db.insert(users).values({
        name: body.name,
        email: body.email,
      });
      return { message: "User created", id: result[0].insertId };
    },
    {
      body: t.Object({
        name: t.String(),
        email: t.String(),
      }),
    }
  )

  // DELETE user by id
  .delete("/:id", async ({ params }) => {
    await db.delete(users).where(eq(users.id, Number(params.id)));
    return { message: "User deleted" };
  });

