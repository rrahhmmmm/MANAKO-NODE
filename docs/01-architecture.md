# 01 — Arsitektur Baru

Rewrite Manako dari **PHP monolit** (`file-per-endpoint`) menjadi **API-first + SPA/SSR frontend**.

---

## Perbandingan Stack

| Layer          | Legacy PHP                          | Node Rewrite                                |
|----------------|-------------------------------------|---------------------------------------------|
| Runtime        | PHP 8.2 + Apache/Nginx              | Node.js 20 + Fastify                        |
| Framework      | None (native)                       | Fastify (backend) + Next.js 14 (frontend)   |
| Database       | MySQL/MariaDB                       | **PostgreSQL 16** (target rewrite)          |
| DB access      | PDO raw SQL                         | Prisma ORM (type-safe)                      |
| Routing        | Satu file `.php` per endpoint       | Modular routes per-domain                   |
| View           | Server-side echo + Bootstrap 5      | React (Next App Router) + shadcn/ui         |
| State (FE)     | Vanilla JS + fetch                  | React Query + Zustand                       |
| Auth           | ❌ tidak ada                        | JWT (access + refresh) + RBAC middleware    |
| File upload    | `move_uploaded_file` inline         | `@fastify/multipart` + validasi MIME/magic  |
| OneDrive sync  | `popen` background PHP CLI          | BullMQ worker (Redis) + progress via SSE    |
| Reports        | PhpSpreadsheet                      | `exceljs`                                   |
| Sessions       | PHP session file                    | JWT stateless + Redis blacklist             |
| Deployment     | Apache/Nginx + PHP-FPM              | Docker compose (api, web, mysql, redis)     |

---

## Diagram Arsitektur

```
┌────────────────────────────────────────────────────────────┐
│                      Browser (User)                        │
│         Next.js 14 (App Router) + Tailwind + shadcn        │
└─────────────┬────────────────────────────────┬─────────────┘
              │ RSC / server actions           │ REST (fetch)
              ▼                                ▼
      ┌───────────────────┐          ┌───────────────────────┐
      │ Next.js Server    │          │  Fastify API          │
      │ (SSR + BFF)       │──HTTP──▶│  /api/v1/*             │
      │ - auth cookie     │  JWT     │  - Zod validation     │
      │ - proxy to API    │          │  - RBAC guard         │
      └───────────────────┘          │  - Prisma queries     │
                                     └──────┬────────────────┘
                                            │
                       ┌────────────────────┼───────────────────┐
                       ▼                    ▼                   ▼
                 ┌───────────┐       ┌──────────────┐    ┌────────────┐
                 │ PostgreSQL│       │  Redis       │    │ Local FS   │
                 │  (Prisma) │       │  (BullMQ +   │    │ uploads/   │
                 └───────────┘       │   cache)     │    └─────┬──────┘
                                     └──────┬───────┘          │
                                            │ enqueue          │
                                            ▼                  │
                                     ┌──────────────┐          │
                                     │ OneDrive     │◀─────────┘
                                     │ Sync Worker  │  copy
                                     └──────────────┘
```

---

## Prinsip Desain Baru

1. **API-first** — semua data lewat REST `/api/v1/*` (Fastify). FE cuma konsumen.
2. **Type-safe end-to-end** — TypeScript + Prisma + Zod schemas dishare ke FE via `packages/shared` (opsional next step).
3. **Modular per-domain** — `modules/projects/`, `modules/termins/`, dst. Setiap modul punya `routes.ts`, `service.ts`, `schema.ts`.
4. **Idempotent auto-jobs** — auto-progress **tidak** lagi berjalan tiap load dashboard (mahal). Digantikan cron worker (BullMQ repeatable job) tiap 1 jam.
5. **Sync-on-write via queue** — upload file → enqueue OneDrive mirror job → worker pisah. Menghindari lag response.
6. **Auth wajib** — tidak ada endpoint publik selain `/api/v1/auth/login`.

---

## Lapisan Aplikasi

### Presentation (`apps/web`)
- **Next.js 14 App Router** — layout bersarang, RSC untuk halaman dominan-read (dashboard, detail).
- **shadcn/ui + Tailwind CSS** — komponen accessible.
- **React Query** — cache + revalidation untuk client fetch.
- **React Hook Form + Zod** — form + validasi.

### API Gateway / BFF (`apps/web/app/api/*` — opsional)
- Bila perlu proxy cookie-based session ke API, gunakan Next route handlers.
- Default: browser langsung ke Fastify (CORS + JWT bearer).

### Application (`apps/api`)
Struktur `src/modules/<domain>/`:
- `routes.ts` — Fastify route registrations
- `service.ts` — business logic (dulu tersebar di berbagai file `.php`)
- `schema.ts` — Zod input/output schema
- `repo.ts` — Prisma queries kompleks (opsional; simple queries di service)

Modul:
- `auth/` — login, refresh, logout
- `users/` — CRUD user + role management
- `vendors/` — master vendor (dulu `master_vendor.php`)
- `masters/` — `doc_types` CRUD (dulu `master_documents.php`)
- `projects/` — CRUD project + code generator (dulu `add_project.php`, `proses_add_project.php`, `detail_project.php` read-side)
- `termins/` — CRUD termin + requirements (dulu `add_termin.php`, `edit_termin.php`, `add_termin_requirement.php`, dll)
- `documents/` — upload/download init & termin docs, PR/PO coverage
- `dashboard/` — stats + reminders (dulu `dashboard.php`)
- `reports/` — Excel/HTML preview (dulu `export_excel.php`, `report_preview.php`, `report_print.php`)
- `sync/` — OneDrive trigger + worker (dulu `includes/onedrive_*.php`)

### Data (`prisma/schema.prisma`)
- Semua 12 tabel legacy dipertahankan.
- Tambahan: `refresh_tokens` untuk JWT rotation.
- Perbaikan FK: `pic_vendor_id` diberi relasi eksplisit ke `users`.
- Perbaikan casing: migrasi normalisasi `initiation_documents.doc_type` ke UPPER_SNAKE.

### Integration
- `lib/onedrive.ts` — client copy ke folder lokal (yang di-sync OneDrive desktop client).
- `lib/queue.ts` — BullMQ (Redis) untuk sync + notifikasi + auto-progress.
- `lib/storage.ts` — abstraksi FS (bisa swap ke S3 nanti).

---

## Perbaikan dari Legacy

| Legacy issue                                              | Fix di Node                                    |
|-----------------------------------------------------------|------------------------------------------------|
| Auto-progress recompute tiap load `dashboard.php`         | Cron BullMQ tiap 1 jam                         |
| Code generator ada di 2 tempat (race condition)           | Satu service, dibungkus transaction advisory lock |
| Upload path inconsistent (`uploads/` vs `/home/dev/...`)  | Satu `UPLOAD_ROOT` env, migrasi path lama      |
| Casing `doc_type` inconsistent (upper/lower)              | Normalisasi migration + Zod enum guard         |
| Tidak ada auth                                            | JWT + RBAC + audit log                         |
| CSRF absent                                               | `@fastify/csrf-protection` (form) + SameSite   |
| File upload validasi longgar                              | MIME + magic bytes (`file-type`) + max size    |
| DB creds hardcoded di `db.php`                            | `.env` + `zod` env validator                   |
| OneDrive sync monolithic PHP CLI                          | Worker BullMQ, progress via SSE                |
| `initiation_documents` casing mismatch                    | Migrasi one-time normalisasi                   |
| Report `type=non-rutin` vs `classification=non_rutin`     | Normalize di service layer                     |

---

## Deployment Target

### Development
```bash
docker compose up -d postgres redis
pnpm dev  # api + web parallel
```

### Production (Ubuntu)
```
/opt/manako/
├── docker-compose.yml
│   ├── postgres (postgres:16-alpine)
│   ├── redis  (redis:7-alpine)
│   ├── api    (node:20-alpine, port 3001, internal)
│   ├── web    (node:20-alpine, port 3000)
│   ├── worker (node:20-alpine, BullMQ)
│   └── nginx  (reverse proxy, TLS)
└── /home/dev/onedrive_manako/manako   ← target OneDrive
```

Nginx routes:
- `/` → web:3000
- `/api/*` → api:3001
- `/uploads/*` → static (protected: signed URLs untuk file sensitif)
