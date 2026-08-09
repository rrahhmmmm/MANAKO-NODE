# 03 — REST API Endpoints

Base URL: `/api/v1`

Semua endpoint (kecuali `/auth/login`) butuh `Authorization: Bearer <access_token>`.
Response envelope:
```json
{ "success": true, "data": ... }
{ "success": false, "error": { "code": "...", "message": "..." } }
```

---

## Auth

| Method | Path | Body | Response | Deskripsi |
|--------|------|------|----------|-----------|
| POST | `/auth/login` | `{email, password}` | `{access_token, refresh_token, user}` | Login |
| POST | `/auth/refresh` | `{refresh_token}` | `{access_token, refresh_token}` | Rotate refresh |
| POST | `/auth/logout` | — | `{}` | Revoke refresh token |
| GET  | `/auth/me` | — | `User` | Current user |

**Fitur baru**: legacy tidak ada auth sama sekali. Semua endpoint di-guard.

---

## Users (admin only)

| Method | Path | Notes |
|--------|------|-------|
| GET    | `/users` | list, `?role=`, `?search=` |
| POST   | `/users` | create |
| GET    | `/users/:id` | detail |
| PATCH  | `/users/:id` | update |
| DELETE | `/users/:id` | soft delete (nullifies FK) |

---

## Vendors  ← legacy: `master_vendor.php`, `edit_vendor.php`

| Method | Path | Notes |
|--------|------|-------|
| GET    | `/vendors` | `?search=` |
| POST   | `/vendors` | create |
| GET    | `/vendors/:id` | detail |
| GET    | `/vendors/:id/pic` | PIC info (legacy: `get_vendor_pic.php`) |
| GET    | `/vendors/:id/previous-projects` | dulu `get_previous_projects.php` |
| PATCH  | `/vendors/:id` | update |
| DELETE | `/vendors/:id` | delete |

---

## Doc Types (Masters)  ← legacy: `master_documents.php`, `list_doc_types.php`

| Method | Path | Notes |
|--------|------|-------|
| GET    | `/doc-types` | `?stage=inisiasi|pelaksanaan` |
| POST   | `/doc-types` | `{keyname, label, stage, required}` |
| PATCH  | `/doc-types/:id` | `{label?, required?}` |
| POST   | `/doc-types/:id/toggle-required` | flip `required` |
| DELETE | `/doc-types/:id` | |

---

## Projects  ← legacy: `add_project.php`, `proses_add_project.php`, `detail_project.php` (read), `generate_project_code.php`

| Method | Path | Notes |
|--------|------|-------|
| GET    | `/projects` | `?search=&year=&status=&classification=&page=&per_page=` |
| POST   | `/projects` | multipart, field `contract_file` opsional |
| GET    | `/projects/:id` | detail lengkap (termins, init docs, progress) |
| PATCH  | `/projects/:id` | update metadata |
| DELETE | `/projects/:id` | cascade ke termins/docs |
| POST   | `/projects/:id/contract` | multipart `contract_file`, `no_kontrak` (legacy: `upload_contract=1` di detail_project.php) |
| DELETE | `/projects/:id/contract` | unlink contract |
| POST   | `/projects/:id/progress` | `{progress}` (legacy: `update_progress.php`) |
| GET    | `/projects/code/preview?type=investasi|eksploitasi` | preview kode berikutnya (legacy: `generate_project_code.php`) |

**Note**: creation body juga menerima `project_type` (`investasi|eksploitasi`) untuk memilih prefix code (`INV-YYYY-NN` atau `EKS-YYYY-NN`). Code generation di-serialize via transaction + row lock.

---

## Termins  ← legacy: `add_termin.php`, `edit_termin.php`, `delete_termin.php`, `get_project_termins.php`

| Method | Path | Notes |
|--------|------|-------|
| GET    | `/projects/:id/termins` | order by `order_index` |
| POST   | `/projects/:id/termins` | `{name, type, period_start, period_end, percentage}` |
| GET    | `/termins/:id` | detail |
| PATCH  | `/termins/:id` | update |
| DELETE | `/termins/:id` | `?force=true` untuk cascade delete docs (legacy `delete_documents=1`) |

**Server auto-calc:**
- `amount = project.value * percentage / 100`
- `due_date = period_end + 7 days`
- `order_index = max(order_index) + 1`

---

## Document Requirements  ← legacy: `add_termin_requirement.php`, `remove_termin_requirement.php`, `toggle_document_requirement.php`, `toggle_bypass.php`

| Method | Path | Notes |
|--------|------|-------|
| GET    | `/termins/:id/requirements` | list requirements + status |
| POST   | `/termins/:id/requirements` | `{doc_type, label?, required=1}` — auto-create doc_type kalau belum ada |
| DELETE | `/termins/:id/requirements/:doc_type` | remove |
| PATCH  | `/termins/:id/requirements/:doc_type` | `{required?, bypass?}` (legacy: dua endpoint terpisah — di sini satu) |

---

## Termin Documents  ← legacy: `upload_termin_document.php`, `update_termin_document_status.php`, `delete_termin_document.php`, `get_termin_documents.php`

| Method | Path | Notes |
|--------|------|-------|
| GET    | `/termins/:id/documents` | list dokumen + requirement + status per doc_type |
| POST   | `/termins/:id/documents` | multipart `{doc_type, file, custom_label?}` |
| PATCH  | `/termin-documents/:id` | `{status?, custom_label?}` |
| DELETE | `/termin-documents/:id` | unlink + delete |

**Legacy `get_termin_documents.php` mengembalikan HTML partial.** Di Node, endpoint ini return **JSON**; rendering dilakukan di FE (React component `<TerminDocsPanel>`).

---

## Initiation Documents  ← legacy: `detail_project.php` (POST handler `init`/`bamk`), `delete_init_doc.php`, `delete_document.php`, `get_project_docs.php`

| Method | Path | Notes |
|--------|------|-------|
| GET    | `/projects/:id/init-documents` | list per doc_type (single + multi PR/PO) |
| POST   | `/projects/:id/init-documents` | multipart `{doc_type, file, no_document?, doc_name?, termin_ids?[]}` |
| PATCH  | `/init-documents/:id` | update metadata + coverage |
| DELETE | `/init-documents/:id` | delete row (dulu `delete_init_doc.php`) |
| GET    | `/projects/:id/pr-po-docs?doc_type=PR|PO` | dulu `get_project_docs.php` |

**Side effect BAMK**: upload doc_type `BAMK` otomatis update `project.status: inisiasi → running` (di service).

**PR/PO coverage**: di POST/PATCH, kalau `termin_ids[]` dikirim, service akan replace `pr_po_termin_coverage` untuk doc tersebut.

---

## Dashboard  ← legacy: `dashboard.php`

| Method | Path | Notes |
|--------|------|-------|
| GET | `/dashboard/stats` | `?year=` → `{running, completed, inisiasi, cancelled}` |
| GET | `/dashboard/reminders` | `?tab=overdue|pending&page=` — next-step per termin |
| GET | `/dashboard/projects` | `?tab=running|completed|inisiasi&page=&search=&year=&classification[]=` |

**Auto-progress**: **tidak** dihitung on-request lagi. Cron BullMQ (setiap jam) recompute untuk semua project bertype `monthly`/`quarterly`.

---

## Reports  ← legacy: `generate_report.php`, `report_preview.php`, `report_print.php`, `export_excel.php`

| Method | Path | Notes |
|--------|------|-------|
| GET | `/reports/years` | distinct years dari `projects.start_date` |
| GET | `/reports/preview` | `?year=&classification=rutin|non_rutin` → JSON tabel |
| GET | `/reports/export.xlsx` | download Excel via `exceljs` |
| GET | `/reports/print` | HTML print-friendly (bisa juga di FE saja) |

**Perbaikan**: normalisasi `classification` (dulu form kirim `non-rutin` tapi DB `non_rutin`).

---

## OneDrive Sync  ← legacy: `includes/onedrive_copy.php`, `includes/onedrive_copy_runner.php`

| Method | Path | Notes |
|--------|------|-------|
| POST | `/sync/onedrive/start` | enqueue job → `{job_id}` |
| GET  | `/sync/onedrive/status/:job_id` | `{current, total, message, complete}` |
| GET  | `/sync/onedrive/stream/:job_id` | SSE stream progress (opsional, replace polling) |

**Worker** (`apps/api/src/modules/sync/worker.ts`) berjalan pisah process:
```bash
pnpm --filter api start:worker
```

---

## File Serving

Legacy: file diakses langsung via web (`uploads/…`).

Node:
- **Public files (dokumen kontrak, dll)**: served via `GET /files/:kind/:filename` dengan RBAC check + signed URL (short-lived JWT).
- **Static assets** (CSS/img) di FE Next.js pakai `public/`.

Kind: `contract | init | termin`.

---

## Audit Log

Tiap mutation (POST/PATCH/DELETE) otomatis insert ke `audit_logs`:
```json
{
  "user_id": 1,
  "action": "upload_termin_document",
  "meta": {
    "termin_id": 3,
    "doc_type": "BAST",
    "file": "..."
  }
}
```

Endpoint read-only untuk viewer:
| GET | `/audit-logs?user_id=&project_id=&action=&from=&to=` |
