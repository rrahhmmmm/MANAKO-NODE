# 05 — Business Logic & Auto-Jobs

Kumpulan **rule, kalkulasi, side-effect, dan race condition** yang harus dijaga saat rewrite ke Node.
Semua rule di sini diambil dari kode PHP legacy (`../manako-main`). Kalau nanti butuh berubah, tulis alasannya di PR.

Legenda: ✅ port apa adanya · 🔄 refactor · ⚠️ bug/quirk legacy · ➕ perbaikan baru

---

## 1. Kode Project (`INV-YYYY-NN` / `EKS-YYYY-NN`)

### Format
- Pattern: `{PREFIX}-{YEAR}-{NN}` — `INV` untuk `project_type=investasi`, `EKS` untuk `eksploitasi`.
- `NN` = 2 digit zero-padded (`01`..`99`).
- Tahun diambil dari **`created_at`**, bukan `start_date`.

### Bug legacy ⚠️
Ada **3 tempat** yang generate kode dan **tidak konsisten**:

| File | Metode | Risiko |
|------|--------|--------|
| `add_project.php` (preview UI) | `COUNT(*) WHERE YEAR(created_at)=? AND code LIKE 'INV-%'` + 1 | Meleset kalau ada gap/soft delete |
| `proses_add_project.php` (POST) | `ORDER BY id DESC LIMIT 1` → parse 2 digit terakhir | Salah kalau format legacy beda |
| `generate_project_code.php` (AJAX) | `ORDER BY LENGTH(code) DESC, code DESC LIMIT 1` | Beda lagi dari dua di atas |

Race condition: dua submit bersamaan → dua-duanya dapat NN yang sama → UNIQUE violation.

### Fix di Node ➕
- **Satu source** di `modules/projects/service.ts` → `generateProjectCode(type, txClient)`.
- Bungkus dalam transaction + PostgreSQL **advisory lock** (auto-release saat tx selesai):
  ```ts
  // hashKey harus stabil per (type, year) — gunakan hashtext atau nomor konstan
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`project_code_${type}_${year}`}))`;
    const last = await tx.$queryRaw<{ code: string }[]>`
      SELECT code FROM projects
      WHERE code LIKE ${`${prefix}-${year}-%`}
      ORDER BY CAST(SPLIT_PART(code, '-', 3) AS INTEGER) DESC
      LIMIT 1`;
    const nn = last[0] ? Number.parseInt(last[0].code.split('-')[2] ?? '0', 10) + 1 : 1;
    const code = `${prefix}-${year}-${String(nn).padStart(2, '0')}`;
    // ... insert project dengan code
  });
  ```
- Endpoint preview (`GET /projects/code/preview`) **tidak** reserve — hanya prediksi. UI harus warn "kode final ditentukan saat submit".

---

## 2. Termin

### 2.1 Auto-calc saat create/edit
Diambil dari `add_termin.php`:

| Field | Rumus |
|-------|-------|
| `amount` | `project.value * percentage / 100` (Decimal) |
| `due_date` | `period_end + 7 days` (null kalau `period_end` null) |
| `order_index` | `COALESCE(MAX(order_index) WHERE project_id=?), 0) + 1` |
| `name` | Auto `"Termin N"` (readonly di form, tapi user boleh override) |

### 2.2 Race condition ⚠️
Dua submit bersamaan → dua termin dapat `order_index` yang sama.

### Fix ➕
- `SELECT ... FOR UPDATE` di `service.createTermin`, dalam satu transaction.
- Alternatif: tambah UNIQUE `(project_id, order_index)` — tapi butuh migrasi karena legacy mungkin punya duplicate. Cek dulu, baru enforce.

### 2.3 Termin type & efek downstream
| Type | Efek |
|------|------|
| `monthly` | Ikut auto-progress job (§7) |
| `quarterly` | Ikut auto-progress job |
| `percentage` | User set `percentage` manual, amount = derived |
| `oneoff` | `percentage=100` (default) |

### 2.4 Validasi yang belum ada di legacy ⚠️
Semua ini **wajib** ditambah di Zod schema Node:
- `percentage ∈ [0, 100]`
- `period_start ≤ period_end`
- **Total percentage semua termin ≤ 100** per project (warn kalau <100, block kalau >100).
- `period_start >= project.start_date` (warn only).

---

## 3. Document Requirements & Bypass

### 3.1 Tabel `document_requirements`
```
UNIQUE(scope, project_id, termin_id, doc_type)
scope ∈ {'init', 'termin'}
required TINYINT   -- 1=wajib, 0=disabled dari checklist
bypass_check TINYINT -- 1=dianggap done tanpa upload
```

### 3.2 Rule "wajib atau tidak" (resolve order)
Diambil dari dashboard reminder + upload validator:

1. Kalau ada row `document_requirements` matching → pakai `required` & `bypass_check` di situ.
2. Kalau tidak ada row → fallback ke `doc_types.required` (default katalog).
3. `bypass_check=1` ⇒ dianggap sudah done (tidak muncul di reminder, dianggap ✓ di report).
4. `required=0` ⇒ hilang dari checklist & reminder.

### 3.3 Legacy split endpoint 🔄
- `toggle_document_requirement.php` → flip `required`.
- `toggle_bypass.php` → flip `bypass_check`.

Digabung jadi satu di Node: `PATCH /termins/:id/requirements/:doc_type` body `{required?, bypass?}`.

### 3.4 Auto-create dari doc_types ➕
Kalau user tambah requirement pakai doc_type yang belum ada di `doc_types`, service auto-insert doc_type baru (legacy `add_termin_requirement.php` juga begitu). Tapi Node **wajib validasi keyname** (UPPER_SNAKE, `^[A-Z][A-Z0-9_]{1,49}$`).

---

## 4. Upload Dokumen Termin

### 4.1 Validasi pre-upload
Dari `upload_termin_document.php`:
1. `document_requirements` row untuk `(termin_id, doc_type)` dengan `required=0` → **BLOCK** ("dokumen ini di-disable untuk termin ini").
2. File extension whitelist: `pdf, doc, docx`. **Node harus tambah**: cek magic bytes (`file-type`) + max size (default 25 MB, env `MAX_UPLOAD_MB`).

### 4.2 Upsert per `(termin_id, doc_type)`
- Sudah ada row → **replace**: delete file lama dari disk, update path baru.
- Belum ada → insert baru dengan `status=1, uploaded_at=NOW()`.
- Set `code_project = project.code` (denormalized, dipertahankan untuk backward-compat).

### 4.3 Custom label ✅
`custom_label` (nullable):
- **TTB**: nomor TTB (mis. `"001"`). Report Excel & preview render label ini alih-alih ✓ (§8.4).
- Doc lain: nama alternatif kalau user mau override display.

### 4.4 Transaction ⚠️
`upload_termin_document.php` sudah pakai `beginTransaction()` + unlink kalau rollback. Node **wajib** replicate — plus:
- Simpan ke `<UPLOAD_ROOT>/termin_docs/<uuid>-<sanitized_name>` (bukan timestamp — collision).
- Commit DB dulu, baru unlink file lama. Kalau unlink gagal, log-only (jangan rollback DB).

### 4.5 Status field `termin_documents.status` (TINYINT 0/1)
- `0` = row placeholder (jarang muncul).
- `1` = uploaded.
- Node biarkan Int, tapi ekspose sebagai boolean via service layer.

Ada UI toggle "verifikasi" (`update_termin_document_status.php`) — ini flip `status` sebenarnya cuma re-toggle `1↔0`. Di Node, sebaiknya rename semantik:
- Field baru virtual: `verified` (boolean, computed dari `status=1`).
- PATCH body kirim `{status: 0|1}` atau `{verified: bool}` — service map ke `status`.

---

## 5. Initiation Documents & Kontrak

### 5.1 Kategori doc_type di stage `inisiasi`
| Doc type | Cardinality per project |
|----------|-------------------------|
| `ND_IJIN_PRINSIP`, `KONTRAK`, `RKS`, `RAB`, `HIRADC`, `EVATEK`, `JUSTIFIKASI`, `TKDN`, `BAMK` | **Single** — UNIQUE (project_id, doc_type), upsert |
| `PR`, `PO` | **Multi** — always INSERT (satu project bisa punya banyak PR/PO) |

### 5.2 Auto-generate `doc_name` untuk PR/PO
Legacy `detail_project.php`:
- Upload PR ke-3 → `doc_name = "PR3"`.
- Upload PO ke-2 → `doc_name = "PO2"`.
- Hitungan berdasarkan `COUNT(*) WHERE project_id=? AND doc_type=?` + 1.

`no_document` = nomor asli dari dokumen (mis. "PR-2024/001") — user input manual.

### 5.3 Side-effect BAMK upload ⚠️→✅
```
IF project.status = 'inisiasi' AND doc_type = 'BAMK' upload success
THEN UPDATE projects SET status = 'running' WHERE id = ?
```
Ini **satu-satunya** state transition otomatis di sistem. Wajib di-port; tulis test khusus.

### 5.4 Kontrak upload (`upload_contract=1` di detail_project.php)
- Handler pisah dari init_documents — simpan langsung ke `projects.contract_file` + `projects.no_kontrak`.
- Node pisahkan endpoint: `POST /projects/:id/contract` (bukan lewat init-documents).
- Delete kontrak: `DELETE /projects/:id/contract` → set `contract_file=NULL`, unlink file.

### 5.5 PR/PO Coverage
Tabel `pr_po_termin_coverage(init_doc_id, termin_id)`:
- Saat upload/edit PR atau PO, form kirim `termin_ids[]` = daftar termin yang di-cover.
- Service: `DELETE FROM pr_po_termin_coverage WHERE init_doc_id=?` → `INSERT` semua yang baru.
- Bungkus dalam transaction.
- Digunakan report Excel (§8.5) untuk menampilkan "PR mana saja yang cover termin ini".

---

## 6. Progress Project

### 6.1 Manual update (`update_progress.php`)
```
progress = max(0, min(100, floatval(input)))
UPDATE projects SET progress_percent = ? WHERE id = ?
```
Sederhana. Tidak trigger status change.

### 6.2 Auto-progress untuk monthly/quarterly (dashboard.php:5-42) ⚠️
Formula linear time-based:
```
total_days   = end_date - start_date
elapsed_days = today - start_date
progress = clamp(elapsed_days / total_days * 100, 0, 100)
```
- `today < start_date` → 0.
- `today > end_date` → 100.
- Diterapkan **hanya** untuk project yang punya termin type `monthly`/`quarterly`.
- Legacy hitung **setiap load dashboard** → N+1, mahal.

### 6.3 Fix di Node ➕
- **Cron BullMQ** `auto-progress` — jalan tiap **1 jam**:
  ```ts
  queue.add('auto-progress', {}, { repeat: { every: 60 * 60 * 1000 } });
  ```
- Satu SQL bulk update (PostgreSQL):
  ```sql
  UPDATE projects p
  SET progress_percent = LEAST(100, GREATEST(0,
    (CURRENT_DATE - p.start_date)::numeric
      / NULLIF((p.end_date - p.start_date)::numeric, 0) * 100
  ))
  FROM (
    SELECT DISTINCT project_id FROM termins WHERE type IN ('monthly','quarterly')
  ) t
  WHERE t.project_id = p.id
    AND p.status IN ('running','inisiasi');
  ```
- **Dashboard endpoint tidak recompute lagi** — baca `progress_percent` apa adanya.
- Endpoint manual trigger untuk admin: `POST /admin/jobs/auto-progress`.

### 6.4 "Document progress" (dipakai di report)
Selain `projects.progress_percent`, ada progress dokumen:
```
doc_progress = uploaded_count / required_count * 100
```
- `required_count` = jumlah `document_requirements` dengan `required=1` (scope termin + init) minus yang `bypass_check=1`.
- `uploaded_count` = jumlah `termin_documents.status=1` + init docs yang ada file-nya + yang di-bypass.
Dihitung on-demand di `reports` service; tidak disimpan.

---

## 7. Dashboard Reminders (bagian tersulit)

### 7.1 Sumber
`dashboard.php:189-302` — query nested + CROSS JOIN doc_types dengan prioritas.

### 7.2 Definisi "next step"
Untuk setiap termin yang **aktif** (project status `inisiasi`/`running`), ambil **satu** dokumen dengan aturan:
1. Doc type di stage `pelaksanaan` (11 doc types §11.3 di doc 02).
2. Prioritas terkecil (TTB=1, LAPORAN_PEKERJAAN=2, ..., STATUS_SSC=11).
3. **Belum uploaded** — tidak ada `termin_documents` row dengan `status=1` untuk `(termin_id, UPPER(TRIM(doc_type)))`.
4. **Tidak bypass** — `document_requirements.bypass_check != 1`.
5. **Required** — resolve pakai rule §3.2.

Kalau semua doc sudah ✓ → termin tidak muncul di reminder.

### 7.3 Tab & sorting
| Tab | Filter |
|-----|--------|
| `overdue` | `today > due_date` (positif days_overdue) |
| `pending` | `today ≤ due_date` |

Sort di dalam tab: `days_overdue DESC` (overdue paling lama dulu) / `days_until_due ASC` (yang paling dekat dulu).

### 7.4 Filter tambahan (tab `projects` di dashboard)
- `year` = `YEAR(start_date)`.
- `classification[]` = `rutin` / `non_rutin`. **Kalau kedua unchecked → tidak ada hasil** (legacy nulis `WHERE 1=0` — bukan fallback ke default). Node port apa adanya (mudah dipahami user).
- Legacy quirk ⚠️: `classification IS NULL` dianggap `'rutin'` — port di WHERE clause.

### 7.5 Fix N+1 ➕
Legacy loop per project untuk hitung reminder → lambat. Node pakai satu query CTE (MySQL 8+) atau materialized query result di Redis 5 menit.

---

## 8. Reports (Excel & Preview)

### 8.1 Filter
- `year` = `YEAR(created_at)` (bukan `start_date` — konsisten dengan code generator).
- `classification` = `rutin | non_rutin`. ⚠️ Legacy form kirim `non-rutin` (dash) sementara DB pakai `non_rutin` (underscore). Node service **wajib normalize**: `input.replace('-', '_')` sebelum query.

### 8.2 Skip project tanpa termin
`INNER JOIN termins` → project tanpa termin **tidak muncul** di report.

### 8.3 Status per doc di export
| Kode | Arti | Simbol |
|------|------|--------|
| 0 | Missing (belum upload & tidak bypass) | ✗ merah |
| 1 | Uploaded (`termin_documents.status=1`) | ✓ hijau |
| 2 | Bypassed (`bypass_check=1`) | ✓ hijau |

### 8.4 Special case TTB
Kalau `doc_type='TTB'` uploaded & `custom_label != NULL` → **render `custom_label`** (misal `"001"`) bukan ✓, warna hitam. Semua doc lain tidak render label meski ada.

### 8.5 Kolom PR/PO per termin
```sql
SELECT id.no_document
FROM initiation_documents id
JOIN pr_po_termin_coverage cov ON cov.init_doc_id = id.id
WHERE id.doc_type IN ('PR','PO') AND cov.termin_id = ?
```
Digabung newline-separated dalam satu cell.

### 8.6 Kalkulasi DPP & PPN
Legacy asumsi: **`termins.amount` sudah termasuk PPN 11%**.
```
DPP = amount / 1.11
PPN = amount - DPP
```
Kalau kebijakan pajak berubah, expose di config (`PPN_RATE=0.11`).

### 8.7 Excel library
- Legacy: PhpSpreadsheet.
- Node: `exceljs`. Style header, freeze pane row 1, auto-width kolom.

---

## 9. OneDrive Sync

### 9.1 Struktur folder target
```
{ONEDRIVE_ROOT}/
  {YEAR}/                      ← YEAR(project.created_at)
    {PROJECT_NAME_sanitized}/
      Kontrak/                 ← projects.contract_file
      Inisiasi/                ← initiation_documents.*
      Pelaksanaan/
        {TERMIN_NAME}/         ← termin_documents.*
```

### 9.2 Filename cleaning & auto-label
Legacy `labelFromFilename()`:
- Non-alphanumeric → `_`.
- Auto-detect label dari nama file: `rab, po, kontrak, kak, rks, bast, invoice, progress`.
- Format final: `{LABEL} {PROJECT_NAME} {TERMIN_NAME} {YEAR}.{ext}`.

Port ke `apps/api/src/modules/sync/helpers.ts` sebagai fungsi pure.

### 9.3 Smart copy (dedupe)
`onedrive_copy_runner.php:87-101`:
```
IF destExists AND filesize(src) == filesize(dest) → SKIP
ELSE                                              → COPY
```
Track hasil per file: `copied | skipped | failed`. Final message:
```
✅ Selesai! Baru: {copied}, Skipped: {skipped}, Gagal: {failed}
```

### 9.4 Progress reporting 🔄
Legacy: PHP session file, update tiap 5 file (batch), rawan hilang kalau session GC.
Node: Redis-backed BullMQ job state:
```ts
await job.updateProgress({ current, total, message, complete: false });
```
Frontend consume via SSE `GET /sync/onedrive/stream/:job_id` (polling fallback: `GET /sync/onedrive/status/:job_id`).

### 9.5 Trigger process 🔄
Legacy: `exec()` / `popen()` fire-and-forget → tidak ada supervisor, gagal senyap.
Node: enqueue ke BullMQ `sync-onedrive` queue, worker process pisah (`pnpm --filter api start:worker`). Job retry 3× dengan backoff eksponensial.

---

## 10. Audit Log

Belum aktif di legacy (tabel `audit_logs` ada, tapi jarang di-write; sebagian handler pakai try/catch kosong).

Fix ➕ — di Node, middleware `withAudit(handler)` otomatis insert setelah mutation sukses:
```ts
{
  user_id: request.user.id,
  action: 'upload_termin_document',   // = handler name
  meta: { termin_id, doc_type, file_id, ... },
  ip: request.ip,
  user_agent: request.headers['user-agent'],
  created_at: now(),
}
```
Failure di audit **tidak** rollback bisnis — hanya log warning.

---

## 11. State Transitions Ringkas

```
projects.status:
  inisiasi ─── (upload BAMK) ──▶ running
  running  ─── (manual)      ──▶ completed / closed / cancelled
  * ─── (manual only)         ──▶ *

termin_documents.status:
  (none) ── upload ── ▶ 1 (uploaded)
  1     ── verify PATCH ── ▶ 0 / 1 (toggle)
  * ── DELETE ── ▶ row removed + file unlink

document_requirements:
  (none) ── PATCH ── ▶ required=1/0, bypass=1/0 (upsert)
  * ── DELETE ── ▶ row removed
```

---

## 12. Race Condition Summary

| Situasi | Legacy | Fix Node |
|---------|--------|----------|
| Dua create project bersamaan | UNIQUE violation | `pg_advisory_xact_lock` + tx (§1) |
| Dua add termin bersamaan | duplicate `order_index` | `FOR UPDATE` di tx (§2.2) |
| Dua upload doc sama | last-write-wins tanpa cleanup file lama | Tx + delete-file-after-commit (§4.4) |
| BAMK upload race | dua-duanya ubah status → aman (idempotent) | Port apa adanya |
| Auto-progress bersamaan dengan manual update | manual bisa ditimpa | Cron pakai `WHERE progress_percent != <baru>` + lock advisory `auto_progress` |

---

## 13. Env & Config Wajib

```env
# .env untuk apps/api
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/manako?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET="..."            # 32+ chars
JWT_REFRESH_SECRET="..."
JWT_ACCESS_TTL="15m"
JWT_REFRESH_TTL="30d"
UPLOAD_ROOT="/var/lib/manako/uploads"
ONEDRIVE_ROOT="/home/dev/onedrive_manako/manako"
MAX_UPLOAD_MB="25"
PPN_RATE="0.11"
CORS_ORIGIN="http://localhost:3000"
NODE_ENV="development"
```

Semua validasi via Zod di `apps/api/src/config/env.ts` — crash saat boot kalau ada yang missing.

---

## 14. Test Priority (untuk regression)

Wajib ada e2e test untuk 5 skenario ini sebelum ganti PHP di production:

1. **Code generator konsisten** — 100 concurrent request `POST /projects` → tidak ada duplicate code.
2. **BAMK side effect** — upload BAMK di project inisiasi → status jadi running; upload di project running → status tetap running.
3. **Auto-progress cron** — project dengan termin monthly dari `start=2025-01-01, end=2025-12-31` di tanggal `2025-07-01` → `progress ≈ 49.5%`.
4. **PR/PO coverage replace** — update coverage `[1,2,3] → [2,4]` → row `[1,3]` hilang, `[4]` masuk, `[2]` tetap.
5. **Report normalize** — request `classification=non-rutin` (dash) tetap balikin project `non_rutin`.
