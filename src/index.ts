import { Elysia } from "elysia";
import { healthRoutes } from "./routes/health";
import { usersRoute } from "./routes/users-route";

const app = new Elysia()
  .use(healthRoutes)
  .use(usersRoute)
  .listen(3000);

console.log(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
export { app };
