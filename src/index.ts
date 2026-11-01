import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { healthRoutes } from "./routes/health";
import { usersRoute } from "./routes/users-route";

const app = new Elysia()
  .use(
    swagger({
      provider: "swagger-ui",
      path: "/swagger",
      documentation: {
        info: {
          title: "Belajar Vibe Coding API",
          version: "1.0.0",
          description:
            "REST API autentikasi user: registrasi, login, profil, dan logout.",
        },
        servers: [
          {
            url: "http://localhost:3000",
            description: "Local development",
          },
        ],
        tags: [
          { name: "System", description: "Informasi server dan health check" },
          {
            name: "Auth",
            description: "Registrasi, login, profil user, dan logout",
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "UUID",
            },
          },
        },
      },
    })
  )
  .use(healthRoutes)
  .use(usersRoute)
  .listen(3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
export { app };
