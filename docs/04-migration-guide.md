# 04 — Migration Guide (PHP → Node)

Peta lengkap: file PHP legacy → endpoint & modul Node.

Legenda:
- ✅ = business logic langsung dipindah
- 🔄 = di-refactor / disederhanakan
- ➕ = fitur baru (tidak ada di legacy)
- ❌ = dihapus / deprecated

---

## Root PHP Files

| PHP File | HTTP | → Node Endpoint | Modul | Status |
|----------|------|----------------|-------|--------|
| `index.php` | GET | `/` (Next redirect ke `/dashboard`) | `web` | ✅ |
| `dashboard.php` | GET | `/api/v1/dashboard/*` (3 endpoint) | `dashboard` | 🔄 auto-progress → cron |
| `add_project.php` | GET | Next page `/projects/new` | `web` | ✅ |
| `proses_add_project.php` | POST | `POST /api/v1/projects` | `projects` | ✅ + code lock |
| `generate_project_code.php` | GET | `GET /api/v1/projects/code/preview` | `projects` | 🔄 satu source |
| `detail_project.php` (GET) | GET | `GET /api/v1/projects/:id` + Next page `/projects/:id` | `projects` + `web` | 🔄 |
| `detail_project.php` POST `upload_contract` | POST | `POST /api/v1/projects/:id/contract` | `projects` | ✅ |
| `detail_project.php` POST `upload_kind=init` | POST | `POST /api/v1/projects/:id/init-documents` | `documents` | ✅ |
| `detail_project.php` POST `upload_kind=bamk` | POST | `POST /api/v1/projects/:id/init-documents` (doc_type=BAMK) | `documents` | ✅ side-effect status |
| `detail_project.php` POST `upload_kind=termin` | POST | `POST /api/v1/termins/:id/documents` | `documents` | ✅ dedup dengan `upload_termin_document.php` |
| `add_termin.php` | GET/POST | Next form + `POST /api/v1/projects/:id/termins` | `termins` | ✅ |
| `edit_termin.php` | POST | `PATCH /api/v1/termins/:id` | `termins` | ✅ |
| `delete_termin.php` | POST | `DELETE /api/v1/termins/:id?force=` | `termins` | ✅ |
| `add_termin_requirement.php` | POST | `POST /api/v1/termins/:id/requirements` | `documents` | ✅ |
| `remove_termin_requirement.php` | POST | `DELETE /api/v1/termins/:id/requirements/:doc_type` | `documents` | ✅ |
| `toggle_document_requirement.php` | POST | `PATCH /api/v1/termins/:id/requirements/:doc_type` (field `required`) | `documents` | ✅ |
| `toggle_bypass.php` | POST | `PATCH /api/v1/termins/:id/requirements/:doc_type` (field `bypass`) | `documents` | 🔄 merged |
| `upload_termin_document.php` | POST | `POST /api/v1/termins/:id/documents` | `documents` | ✅ dedup |
| `update_termin_document_status.php` | POST | `PATCH /api/v1/termin-documents/:id` | `documents` | ✅ |
| `delete_termin_document.php` | POST | `DELETE /api/v1/termin-documents/:id` | `documents` | ✅ |
| `update_progress.php` | POST | `POST /api/v1/projects/:id/progress` | `projects` | ✅ |
| `delete_document.php` | POST | `DELETE /api/v1/projects/:id/contract` **atau** `DELETE /api/v1/init-documents/:id` | `documents` | 🔄 split |
| `delete_init_doc.php` | POST | `DELETE /api/v1/init-documents/:id` | `documents` | ✅ |
| `init_documents.php` | GET | ❌ hapus (deprecated redirect) | — | ❌ |
| `master_vendor.php` | GET/POST | Next `/vendors` + `GET/POST /api/v1/vendors` | `vendors` | ✅ |
| `edit_vendor.php` | GET/POST | Next `/vendors/:id/edit` + `PATCH /api/v1/vendors/:id` | `vendors` | ✅ |
| `master_documents.php` | GET/POST | Next `/documents` + `/api/v1/doc-types` | `masters` | ✅ split by `action` |
| `generate_report.php` | GET | Next page `/reports` | `web` | ✅ |
| `report_preview.php` | GET | `GET /api/v1/reports/preview` + Next page `/reports/preview` | `reports` | ✅ |
| `report_print.php` | GET | Next `/reports/print` (uses `/dashboard/reminders` API) | `web` + `reports` | ✅ |
| `export_excel.php` | GET | `GET /api/v1/reports/export.xlsx` | `reports` | ✅ pakai `exceljs` |
| `get_project_docs.php` | GET | `GET /api/v1/projects/:id/pr-po-docs?doc_type=` | `documents` | ✅ |
| `get_project_termins.php` | GET | `GET /api/v1/projects/:id/termins` | `termins` | ✅ |
| `get_termin_documents.php` | GET | `GET /api/v1/termins/:id/documents` | `documents` | 🔄 JSON (dulu HTML) |
| `get_vendor_pic.php` | GET | `GET /api/v1/vendors/:id/pic` | `vendors` | ✅ |
| `get_previous_projects.php` | GET | `GET /api/v1/vendors/:id/previous-projects` | `vendors` | ✅ |
| `list_doc_types.php` | GET | `GET /api/v1/doc-types?stage=` | `masters` | ✅ |

---

## Maintenance PHP (dev tools)

| PHP File | Node Equivalent |
|----------|-----------------|
| `check_db.php`, `check_db_schema.php`, `debug_schema_ttb.php` | `pnpm --filter api prisma studio` / `prisma db pull` |
| `check_doc_assignments.php` | ad-hoc script `apps/api/scripts/check-doc-assignments.ts` |
| `deduplicate_requirements.php`, `fix_duplicates_server.php` | one-time migration script (Prisma seed / raw SQL) |
| `migrate_db.php`, `run_migration.php` | `pnpm db:migrate` (Prisma migrations) |
| `migrations/*.sql` & `migrations/*.php` | konversi ke Prisma migration file di `apps/api/prisma/migrations/` |

---

## OneDrive Integration

| PHP | Node |
|-----|------|
| `includes/onedrive_copy.php` | `POST /api/v1/sync/onedrive/start`, `GET /api/v1/sync/onedrive/status/:id` |
| `includes/onedrive_copy_runner.php` | `apps/api/src/modules/sync/worker.ts` (BullMQ) |
| `config/onedrive_config.php` | `apps/api/src/config/onedrive.ts` |

**Perubahan**:
- Session-based progress → Redis-backed job state (survives restart).
- `exec()`/`popen()` background → BullMQ worker process (proper monitoring).
- Progress polling → SSE stream (opsional).

---

## Frontend Assets

| PHP asset | Node/Next equivalent |
|-----------|----------------------|
| `assets/manako.css` | `apps/web/src/app/globals.css` + Tailwind |
| `assets/js/onedrive_sync.js` | React hook `useSyncProgress()` di `apps/web/src/lib/hooks/` |
| `components/Sidebar.php` | React `<Sidebar>` di `apps/web/src/components/layout/Sidebar.tsx` |
| Bootstrap 5 (CDN) | Tailwind + shadcn/ui |

---

## Yang Dihapus / Digabung

- `init_documents.php` — cuma redirect, tidak perlu.
- `check_*`, `debug_*` — pindah ke `pnpm scripts`.
- `deduplicate_requirements.php`, `fix_duplicates_server.php` — jadi one-time SQL di migration `prisma/migrations/<ts>_normalize_data/`.
- `edit_termin.php` + `add_termin.php` UI standalone → digabung jadi modal di halaman detail_project Next.
- `toggle_document_requirement.php` + `toggle_bypass.php` → satu endpoint `PATCH .../requirements/:doc_type`.

---

## Fitur Baru (Node-only)

- ➕ **Auth** (login, refresh, logout, RBAC)
- ➕ **User CRUD** (dulu tidak ada UI — hanya tabel)
- ➕ **Audit log viewer** (`GET /api/v1/audit-logs`)
- ➕ **Notification center** — pakai tabel `notifications` yang sudah ada (dulu tidak ada UI aktif)
- ➕ **Cron auto-progress** (BullMQ)
- ➕ **SSE untuk sync progress**
- ➕ **File signed URL** untuk download aman
- ➕ **Rate limit** (`@fastify/rate-limit`)

---

## Data Migration Steps

Target sekarang adalah **PostgreSQL**, bukan MySQL. Alur import data legacy MariaDB → PostgreSQL:

1. Backup DB legacy: `mysqldump --no-tablespaces --compatible=postgresql manako > legacy.sql` — hanya bantu, output masih perlu di-scrub.
2. Konversi ke Postgres pakai `pgloader` (rekomendasi):
   ```bash
   pgloader mysql://user:pass@localhost/manako postgresql://postgres:postgres@localhost/manako
   ```
   Atau tulis script one-time TS (`apps/api/scripts/import-legacy.ts`) yang baca dump lalu insert via Prisma.
3. Jalankan Prisma migrate ke DB baru:
   ```bash
   pnpm --filter api prisma migrate deploy
   ```
4. Jalankan normalization migration untuk casing doc_type & data quirks:
   ```bash
   pnpm --filter api tsx scripts/normalize-doc-types.ts
   ```
5. Seed doc_types + admin user:
   ```bash
   pnpm --filter api seed
   ```
6. Verifikasi via Prisma Studio: `pnpm db:studio`
