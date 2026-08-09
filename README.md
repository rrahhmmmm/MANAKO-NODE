# Manako Node — Reverse Engineering

Rewrite aplikasi **Manako** (manajemen kontrak & termin vendor PT. IKT) dari **PHP native** ke stack modern:

- **Backend:** Node.js 20 + Fastify + Prisma + TypeScript
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Database:** PostgreSQL 16 (schema legacy MariaDB diporting via Prisma)
- **Auth:** JWT session (dulu tidak ada — sekarang wajib)
- **File Storage:** local `uploads/` + OneDrive mirror (via worker queue)

Repo ini adalah **hasil reverse engineering** dari kode PHP di `../manako-main`. Semua endpoint, business rule, dan struktur data sudah dipetakan supaya bisa migrasi bertahap tanpa kehilangan behavior.

## Struktur Monorepo

```
manako-node/
├── docs/                      # dokumentasi reverse-engineering
│   ├── 01-architecture.md      # arsitektur baru
│   ├── 02-database-schema.md   # schema DB + perubahan
│   ├── 03-api-endpoints.md     # REST API spec
│   ├── 04-migration-guide.md   # peta PHP → Node
│   ├── 05-business-logic.md    # business rules & auto-jobs
│   └── 06-frontend-pages.md    # peta halaman FE
├── apps/
│   ├── api/                    # Fastify backend
│   └── web/                    # Next.js frontend
├── package.json                # workspace root
└── pnpm-workspace.yaml
```

## Prasyarat

- Node.js 20+
- pnpm 9+ (`npm i -g pnpm`)
- PostgreSQL 15+ (rekomendasi 16)
- Redis 7+ (untuk BullMQ + rate limit)
- (opsional) folder OneDrive tersinkron untuk mirror file

## Quick Start

```bash
# 1. Install deps
pnpm install

# 2. Setup env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# edit DB URL, JWT secret, dll

# 3. Migrasi DB (bikin dulu database `manako` di Postgres)
createdb manako
pnpm --filter api prisma migrate dev
pnpm --filter api seed

# 4. Jalankan dev
pnpm dev
# api:  http://localhost:3001
# web:  http://localhost:3000
```

## Roadmap Migrasi

Baca `docs/04-migration-guide.md` untuk peta lengkap 30+ endpoint PHP → REST API. Rekomendasi urutan implementasi:

1. Auth + Users (fondasi keamanan yang dulu tidak ada)
2. Master data (vendors, doc_types)
3. Projects CRUD + code generator
4. Termins + document requirements
5. Upload termin/init documents
6. Dashboard (stats + reminders + auto-progress)
7. Reports (Excel via `exceljs`)
8. OneDrive sync worker (BullMQ)

## Kredensial & Keamanan

Beberapa masalah dari legacy PHP yang **wajib** diatasi:

- ❌ **Tidak ada auth** → sekarang JWT + role-based access
- ❌ CSRF protection tidak ada → Fastify `@fastify/csrf-protection`
- ❌ File upload validasi longgar → validate MIME + size + magic bytes
- ❌ DB creds hardcoded → semua via env
- ❌ Path upload inconsistent (`uploads/…` vs `/home/dev/…`) → tunggal via `UPLOAD_ROOT` env

## Lisensi

Proprietary — internal PT. Indonesia Kendaraan Terminal Tbk.
