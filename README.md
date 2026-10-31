# Belajar Vibe Coding

Backend API project built with **Bun**, **ElysiaJS**, **Drizzle ORM**, and **MySQL**.

## Tech Stack

- **Runtime:** [Bun](https://bun.sh)
- **Framework:** [ElysiaJS](https://elysiajs.com)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team)
- **Database:** MySQL

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed
- MySQL server running

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Copy `.env.example` to `.env` and configure your database credentials:
   ```bash
   cp .env.example .env
   ```
4. Push the schema to your database:
   ```bash
   bun run db:push
   ```
5. Start the development server:
   ```bash
   bun dev
   ```

The server will start at `http://localhost:3000`.

## API Endpoints

| Method | Path                 | Headers                       | Description                              |
| ------ | -------------------- | ----------------------------- | ---------------------------------------- |
| GET    | `/`                  | -                             | Welcome message                          |
| GET    | `/health`            | -                             | Health check + DB connectivity           |
| POST   | `/api/users`         | -                             | Register new user (bcrypt password)      |
| POST   | `/api/users/login`   | -                             | User login (generates session UUID)      |
| GET    | `/api/users/current` | `Authorization: Bearer <tok>` | Get currently logged-in user profile     |
| DELETE | `/api/users/logout`  | `Authorization: Bearer <tok>` | Logout user & remove session from DB     |

## Scripts

| Script          | Description                        |
| --------------- | ---------------------------------- |
| `bun dev`       | Start dev server with watch mode   |
| `bun start`     | Start production server            |
| `bun test`      | Run automated integration tests    |
| `bun run db:generate` | Generate migration files     |
| `bun run db:push`     | Push schema to database      |
| `bun run db:migrate`  | Run migrations               |
| `bun run db:studio`   | Open Drizzle Studio          |

## Project Structure

```
├── src/
│   ├── db/
│   │   ├── index.ts          # Database connection
│   │   └── schema.ts         # Drizzle schema definitions (users, sessions)
│   ├── routes/
│   │   ├── health.ts         # Health check routes
│   │   └── users-route.ts    # User API routes (register, login, current, logout)
│   ├── services/
│   │   └── users-service.ts  # Business logic, bcrypt, sessions, auth, logout
│   └── index.ts              # App entry point
├── test/
│   ├── current-user.test.ts  # Current user profile tests
│   ├── login.test.ts         # Login & session tests
│   ├── logout.test.ts        # Logout & session deletion tests
│   └── register.test.ts      # Registration tests
├── drizzle.config.ts         # Drizzle Kit configuration
├── package.json
├── .env.example
└── tsconfig.json
```
