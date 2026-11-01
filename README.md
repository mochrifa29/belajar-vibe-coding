# Belajar Vibe Coding

Backend REST API untuk autentikasi user, dibangun dengan **Bun**, **ElysiaJS**, **Drizzle ORM**, dan **MySQL**. Project ini adalah media belajar membangun API yang rapi: route tipis, business logic terpisah di service layer, validasi request, session berbasis database, dan test otomatis.

## Daftar Isi

- [Fitur](#fitur)
- [Technology Stack](#technology-stack)
- [Arsitektur](#arsitektur)
- [Schema Database](#schema-database)
- [API Reference](#api-reference)
- [Dokumentasi API (Swagger)](#dokumentasi-api-swagger)
- [Setup Project](#setup-project)
- [Menjalankan Aplikasi](#menjalankan-aplikasi)
- [Menjalankan Test](#menjalankan-test)
- [Scripts](#scripts)
- [Batasan yang Diketahui](#batasan-yang-diketahui)

## Fitur

- Registrasi user dengan password yang di-hash bcrypt.
- Login yang membuat session token (UUID v4) dan menyimpannya di database.
- Mendapatkan profil user yang sedang login lewat Bearer token.
- Logout yang menghapus session dari database.
- Health check beserta status koneksi database.
- Validasi request (panjang field, field wajib, tipe data) dengan response error yang konsisten.
- Dokumentasi API interaktif (Swagger UI) di `/swagger` dan spesifikasi OpenAPI di `/swagger/json`.
- Test otomatis untuk seluruh endpoint (63 test) memakai `bun test`.

## Technology Stack

| Kategori | Teknologi | Keterangan |
| --- | --- | --- |
| Runtime | [Bun](https://bun.sh) | Menjalankan TypeScript langsung, menyediakan HTTP server, test runner, dan bcrypt bawaan |
| Bahasa | TypeScript | Strict mode, target ESNext |
| Framework HTTP | [ElysiaJS](https://elysiajs.com) | Routing, validasi schema (TypeBox), error handling |
| ORM | [Drizzle ORM](https://orm.drizzle.team) | Query builder type-safe dan schema definisi |
| Driver database | `mysql2` | Connection pool ke MySQL |
| Database | MySQL 8 | Menyimpan `users` dan `sessions` |
| Migrasi/schema tool | `drizzle-kit` | `generate`, `push`, `migrate`, `studio` |
| Password hashing | `Bun.password` (bcrypt) | Tanpa package tambahan, cost 10 |
| Dokumentasi API | `@elysiajs/swagger` | Swagger UI + spesifikasi OpenAPI 3 |
| Test runner | `bun:test` | Test in-process lewat `app.handle()` |

### Library yang Digunakan

**Dependencies** (`package.json`):

| Package | Versi | Fungsi |
| --- | --- | --- |
| `elysia` | `^1.4.30` | Framework HTTP, validasi request, error handler |
| `@elysiajs/swagger` | `^1.3.1` | Swagger UI dan spesifikasi OpenAPI 3 |
| `drizzle-orm` | `^0.45.4` | ORM/query builder |
| `mysql2` | `^3.24.6` | Driver koneksi MySQL (promise API + pool) |

**Dev dependencies:**

| Package | Versi | Fungsi |
| --- | --- | --- |
| `drizzle-kit` | `^0.31.11` | CLI migrasi dan Drizzle Studio |
| `@types/bun` | `latest` | Type definitions untuk API Bun |
| `typescript` | `^7` (peer) | Type checking (`bun check`) |

Tidak ada library bcrypt eksternal: hashing memakai `Bun.password.hash()` dan `Bun.password.verify()` dengan algoritma `bcrypt`.

## Arsitektur

### Alur Request

```
Client
  │  HTTP request
  ▼
Elysia route (src/routes)
  │  1. Validasi body/header (schema TypeBox)
  │  2. Panggil service
  ▼
Service (src/services)
  │  Business logic + query lewat Drizzle
  ▼
Drizzle ORM (src/db)
  │  SQL
  ▼
MySQL (users, sessions)
```

Response selalu memakai salah satu bentuk berikut:

```json
{ "data": "..." }
```

```json
{ "error": "..." }
```

Jika service melempar error domain (mis. `DuplicateEmailError`, `AuthenticationError`, `UnauthorizedError`), route memetakannya menjadi status HTTP yang sesuai. Error tak terduga dipetakan menjadi `500` dengan pesan generik.

### Struktur Folder

```
.
├── src/
│   ├── index.ts               # Entry point: swagger, route, health, listen 3000
│   ├── db/
│   │   ├── index.ts           # Connection pool MySQL + instance Drizzle
│   │   └── schema.ts          # Definisi tabel users & sessions + tipe infer
│   ├── routes/
│   │   ├── health.ts          # GET / dan GET /health
│   │   └── users-route.ts     # Semua endpoint /api/users + handler validasi
│   ├── services/
│   │   └── users-service.ts   # Business logic user, bcrypt, session, error domain
│   └── lib/
│       └── auth.ts            # Helper ekstraksi Bearer token
├── test/
│   ├── helpers/
│   │   └── db.ts              # Helper test: email unik, cleanup, registrasi, login
│   ├── root.test.ts           # Test GET /
│   ├── health.test.ts         # Test GET /health
│   ├── register.test.ts       # Test POST /api/users
│   ├── login.test.ts          # Test POST /api/users/login
│   ├── current-user.test.ts   # Test GET /api/users/current
│   ├── logout.test.ts         # Test DELETE /api/users/logout
│   ├── flows.test.ts          # Test alur end-to-end antar endpoint
│   └── swagger.test.ts        # Test halaman & spesifikasi Swagger/OpenAPI
├── drizzle.config.ts          # Konfigurasi drizzle-kit
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### Tanggung Jawab Tiap Layer

| Layer | Lokasi | Tanggung jawab |
| --- | --- | --- |
| Entry point | `src/index.ts` | Membuat instance Elysia, memasang plugin Swagger, route, `listen(3000)`, mengekspor `app` untuk test |
| Route | `src/routes/` | Menerima HTTP request, mendefinisikan schema validasi, memanggil service, memetakan error ke status code |
| Service | `src/services/` | Business logic, query database, hashing password, pembuatan/penghapusan session, class error domain |
| Database | `src/db/` | Pool koneksi (`index.ts`) dan definisi tabel (`schema.ts`) |
| Library | `src/lib/` | Helper kecil yang dipakai lintas route/service |
| Test | `test/` | Test per endpoint + helper database |

### Konvensi Penamaan & Pola Kode

- **Route:** `src/routes/<resource>-route.ts`, mengekspor instance Elysia dengan `prefix` (contoh `usersRoute` → `/api/users`). Route didaftarkan di `src/index.ts` lewat `.use(...)`.
- **Service:** `src/services/<resource>-service.ts`, berisi fungsi bisnis (`registerUser`, `loginUser`, `getCurrentUser`, `logoutUser`) dan class error (`DuplicateEmailError`, `AuthenticationError`, `UnauthorizedError`).
- **Database:** file `src/db/schema.ts` memakai `mysqlTable`; properti TypeScript camelCase (`createdAt`) dipetakan ke kolom snake_case (`created_at`).
- **Helper:** `src/lib/<nama>.ts` untuk utilitas murni tanpa state (contoh `extractBearerToken`).
- **Test:** `test/<nama-api>.test.ts`; helper bersama di `test/helpers/`.
- **Fungsi & variabel:** camelCase. **Kolom database:** snake_case. **File:** kebab-case.
- **Validasi:** schema didefinisikan di route dengan `t.Object({...})`. Handler validasi (`onError`) didaftarkan **sebelum** route karena perilaku Elysia 1.4 — jika diletakkan setelah route, hook tidak terpasang.

## Schema Database

Database default: `belajar_vibe_coding` (dapat diubah lewat `DB_NAME`).

### Tabel `users`

| Kolom | Tipe | Constraint | Keterangan |
| --- | --- | --- | --- |
| `id` | `int` | Primary key, auto increment | ID user |
| `name` | `varchar(255)` | NOT NULL | Nama tampilan, divalidasi maksimal 255 karakter |
| `email` | `varchar(255)` | NOT NULL, UNIQUE | Login identifier; unik dan case-insensitive (collation MySQL) |
| `password` | `varchar(255)` | NOT NULL | Hash bcrypt, bukan plaintext |
| `created_at` | `timestamp` | NOT NULL, default `now()` | Waktu registrasi |

### Tabel `sessions`

| Kolom | Tipe | Constraint | Keterangan |
| --- | --- | --- | --- |
| `id` | `int` | Primary key, auto increment | ID session |
| `token` | `varchar(255)` | NOT NULL, UNIQUE | Token UUID v4 yang dikirim client sebagai Bearer token |
| `user_id` | `int` | NOT NULL, FK → `users.id` | Pemilik session |
| `created_at` | `timestamp` | NOT NULL, default `now()` | Waktu login |

### Relasi

```
users (1) ──── (N) sessions
        id   ←   user_id
```

- Satu user bisa punya banyak session (login di beberapa perangkat).
- Setiap login membuat baris `sessions` baru; logout menghapus satu baris berdasarkan token.
- Tidak ada `ON DELETE CASCADE`: hapus `sessions` lebih dulu sebelum menghapus `users`.

### Menerapkan Schema

```bash
# Development: sinkronkan schema langsung ke database
bun run db:push

# Atau buat file migrasi lalu jalankan
bun run db:generate
bun run db:migrate

# Inspeksi data lewat GUI
bun run db:studio
```

## API Reference

Base URL: `http://localhost:3000`

### Konvensi Response

| Status | Arti | Contoh body |
| --- | --- | --- |
| `200` | Sukses | `{ "data": "OK" }` |
| `400` | Error bisnis / body tidak valid | `{ "error": "Email sudah terdaftar" }` |
| `401` | Token tidak ada / tidak valid | `{ "error": "Unauthorized" }` |
| `422` | Validasi field gagal | `{ "error": "Nama maksimal 255 karakter" }` |
| `500` | Error tak terduga di server | `{ "error": "Terjadi kesalahan pada server" }` |

Catatan: body JSON yang rusak dibalas `400` dengan teks `Bad Request` (bukan format `{ "error": ... }`).

### `GET /`

Pesan sapaan server.

```bash
curl http://localhost:3000/
```

```json
{ "message": "🦊 ElysiaJS server is running!" }
```

### `GET /health`

Health check sekaligus mengecek koneksi database. Tidak butuh autentikasi. Jika database tidak bisa diakses, response tetap `200` dengan status `error`.

```bash
curl http://localhost:3000/health
```

```json
{ "status": "ok", "database": "connected" }
```

```json
{ "status": "error", "database": "disconnected" }
```

### `POST /api/users`

Registrasi user baru. Password di-hash bcrypt sebelum disimpan.

| Item | Nilai |
| --- | --- |
| Auth | Tidak perlu |
| Body | `name` (1–255 karakter), `email` (1–255 karakter), `password` (minimal 1 karakter) |

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Rifa","email":"rifa@example.com","password":"rahasia"}'
```

```json
{ "data": "OK" }
```

Kemungkinan error:

- `400 { "error": "Email sudah terdaftar" }`
- `422 { "error": "Nama maksimal 255 karakter" }`
- `422 { "error": "Email maksimal 255 karakter" }`
- `422 { "error": "Data yang dikirim tidak valid" }` (field kosong/hilang/tipe salah)
- `500 { "error": "Terjadi kesalahan pada server" }`

### `POST /api/users/login`

Login dan membuat session baru. Response berisi token yang dipakai sebagai Bearer token.

| Item | Nilai |
| --- | --- |
| Auth | Tidak perlu |
| Body | `email`, `password` |

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rifa@example.com","password":"rahasia"}'
```

```json
{ "data": "3f2b8c1e-9d4a-4b7e-8c2f-1a2b3c4d5e6f" }
```

Kemungkinan error:

- `400 { "error": "Email atau password salah" }` — dipakai untuk email tidak terdaftar maupun password salah (tidak membocorkan apakah email terdaftar).
- `422` untuk field kosong atau melebihi 255 karakter.
- `500` untuk error tak terduga.

### `GET /api/users/current`

Mengambil profil user pemilik token. Password tidak pernah disertakan.

| Item | Nilai |
| --- | --- |
| Auth | `Authorization: Bearer <token>` |

```bash
curl http://localhost:3000/api/users/current \
  -H "Authorization: Bearer 3f2b8c1e-9d4a-4b7e-8c2f-1a2b3c4d5e6f"
```

```json
{
  "data": {
    "id": 1,
    "name": "Rifa",
    "email": "rifa@example.com",
    "created_at": "2026-11-01T11:04:24.000Z"
  }
}
```

Kemungkinan error:

- `401 { "error": "Unauthorized" }` — header tidak ada, format bukan `Bearer`, token kosong, token tidak dikenal, atau session sudah di-logout.

### `DELETE /api/users/logout`

Menghapus session milik token yang dikirim. Session lain milik user yang sama tetap aktif.

| Item | Nilai |
| --- | --- |
| Auth | `Authorization: Bearer <token>` |

```bash
curl -X DELETE http://localhost:3000/api/users/logout \
  -H "Authorization: Bearer 3f2b8c1e-9d4a-4b7e-8c2f-1a2b3c4d5e6f"
```

```json
{ "data": "OK" }
```

Kemungkinan error:

- `401 { "error": "Unauthorized" }` — token tidak ada, tidak valid, atau sudah di-logout sebelumnya.

## Dokumentasi API (Swagger)

Dokumentasi interaktif dibuat otomatis dari route dan schema Elysia, jadi tidak perlu menulis ulang daftar endpoint secara manual.

| Halaman | URL | Isi |
| --- | --- | --- |
| Swagger UI | `http://localhost:3000/swagger` | Dokumentasi interaktif, bisa mencoba request |
| Spesifikasi OpenAPI | `http://localhost:3000/swagger/json` | Dokumen OpenAPI 3.0.3 (JSON) |

### Cara Mencoba Endpoint yang Butuh Token

1. Jalankan `POST /api/users` untuk mendaftarkan user (lewat UI atau `curl`).
2. Jalankan `POST /api/users/login`, lalu salin nilai `data` dari response (token UUID).
3. Klik tombol **Authorize** di halaman Swagger.
4. Tempel token **tanpa** kata `Bearer` (cukup UUID-nya), lalu klik Authorize.
5. Endpoint `GET /api/users/current` dan `DELETE /api/users/logout` sekarang bisa dicoba.
6. Setelah selesai, klik **Logout** untuk menghapus session dan bersihkan user hasil uji manual.

### Yang Perlu Diketahui

- Konfigurasi Swagger ada di `src/index.ts` (bagian `.use(swagger({...}))`): judul, versi, deskripsi, `servers`, tag, dan skema `bearerAuth`.
- Metadata tiap endpoint (`summary`, `description`, `tags`, `security`) didefinisikan lewat opsi `detail` pada route.
- UI Swagger memuat aset JavaScript/CSS dari CDN (unpkg), sehingga halaman memerlukan koneksi internet. Spesifikasi JSON tetap bisa diakses tanpa CDN.
- Halaman dokumentasi bersifat publik (belum ada autentikasi untuk `/swagger`).

## Setup Project

### Prasyarat

- [Bun](https://bun.sh) (disarankan versi 1.4+)
- MySQL 8 (server berjalan di `localhost:3306` atau sesuai konfigurasi)
- Git

### Langkah Setup

1. **Clone repository**

   ```bash
   git clone https://github.com/mochrifa29/belajar-vibe-coding.git
   cd belajar-vibe-coding
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Siapkan environment**

   ```bash
   cp .env.example .env
   ```

   Isi `.env`:

   | Variabel | Default | Keterangan |
   | --- | --- | --- |
   | `DB_HOST` | `localhost` | Host MySQL |
   | `DB_PORT` | `3306` | Port MySQL |
   | `DB_USER` | `root` | User MySQL |
   | `DB_PASSWORD` | *(kosong)* | Password MySQL |
   | `DB_NAME` | `belajar_vibe_coding` | Nama database |

4. **Buat database** (jika belum ada)

   ```bash
   mysql -u root -p -e "CREATE DATABASE belajar_vibe_coding;"
   ```

5. **Terapkan schema**

   ```bash
   bun run db:push
   ```

6. **Jalankan server**

   ```bash
   bun dev
   ```

7. **Verifikasi**

   ```bash
   curl http://localhost:3000/health
   # {"status":"ok","database":"connected"}
   ```

## Menjalankan Aplikasi

| Perintah | Mode | Keterangan |
| --- | --- | --- |
| `bun dev` | Development | Watch mode; server restart otomatis saat file berubah |
| `bun start` | Production-like | Menjalankan `src/index.ts` tanpa watch |

Server berjalan di `http://localhost:3000` dan menampilkan:

```
🦊 Elysia is running at http://localhost:3000
```

Port diatur langsung di `src/index.ts` (`.listen(3000)`).

## Menjalankan Test

```bash
bun test
```

Test memakai **database MySQL yang sama** dengan development, jadi MySQL dan `.env` harus siap sebelum menjalankan test. Tidak perlu menyalakan server: test memanggil aplikasi secara in-process lewat `app.handle(new Request(...))`.

### Cakupan Test

| File | Fokus |
| --- | --- |
| `test/root.test.ts` | `GET /` |
| `test/health.test.ts` | `GET /health` |
| `test/register.test.ts` | Registrasi: validasi, duplikat email, batas panjang, hash password |
| `test/login.test.ts` | Login, session, kredensial salah, multi-login |
| `test/current-user.test.ts` | Bearer token, variasi header, data profil |
| `test/logout.test.ts` | Penghapusan session, isolasi antar session/user |
| `test/flows.test.ts` | Alur end-to-end antar endpoint |
| `test/swagger.test.ts` | Halaman Swagger, spesifikasi OpenAPI, skema bearer, tag |

Total: **63 test**.

### Cara Test Menjaga Konsistensi Data

- Setiap file punya prefix email sendiri: `test-<prefix>-<label>-<waktu>-<urutan>@test.local`.
- `cleanupTestUsers(prefix)` dipanggil **sebelum dan sesudah** setiap skenario.
- Cleanup hanya menghapus baris dengan prefix tersebut: `sessions` lebih dulu, lalu `users` — tidak pernah mengosongkan tabel.
- Setiap skenario membuat datanya sendiri, sehingga tidak bergantung pada urutan test.

### Pemeriksaan Tambahan

```bash
# Jalankan test dua kali untuk memastikan idempotent
bun test && bun test

# Type checking
bun run typecheck
```

Catatan: `src/index.ts` menjalankan `.listen(3000)` saat di-import, sehingga proses test ikut membuka port tersebut. Saat ini tidak mengganggu, tetapi perlu diingat jika port 3000 sedang dipakai.

## Scripts

| Script | Perintah | Keterangan |
| --- | --- | --- |
| `bun dev` | `bun run --watch src/index.ts` | Dev server dengan watch mode |
| `bun start` | `bun run src/index.ts` | Jalankan server tanpa watch |
| `bun test` | `bun test` | Jalankan seluruh test |
| `bun run typecheck` | `bun check` | Type checking TypeScript |
| `bun run db:generate` | `bunx drizzle-kit generate` | Buat file migrasi dari schema |
| `bun run db:push` | `bunx drizzle-kit push` | Sinkronkan schema langsung ke database |
| `bun run db:migrate` | `bunx drizzle-kit migrate` | Jalankan file migrasi |
| `bun run db:studio` | `bunx drizzle-kit studio` | Buka Drizzle Studio |

## Batasan yang Diketahui

- Format email belum divalidasi (hanya panjang dan wajib diisi).
- Password tidak dibatasi panjangnya; bcrypt hanya memakai 72 byte pertama, sehingga password yang lebih panjang terpotong diam-diam.
- Belum ada rate limiting, captcha, CORS, atau refresh token.
- Token session tidak memiliki masa kedaluwarsa; session hanya hilang saat logout.
- Body JSON yang rusak dibalas teks `400 Bad Request`, belum memakai format `{ "error": ... }`.
- Halaman Swagger UI membutuhkan koneksi internet karena memuat aset dari CDN.
