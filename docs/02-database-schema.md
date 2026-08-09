# 02 — Database Schema

Schema dari `manako.sql` (MariaDB legacy) diporting ke **PostgreSQL 16** via **Prisma**. Nama tabel & kolom dipertahankan supaya query raw yang masih ada bisa jalan; enum MariaDB dikonversi ke PostgreSQL native enum. Semua 12 tabel legacy tetap ada.

**Tambahan baru:**
- `refresh_tokens` — untuk JWT rotation (fitur auth baru).
- FK eksplisit `projects.pic_vendor_id → users.id` (dulu hanya index, tidak ada FK).
- Migration one-time: normalisasi casing `initiation_documents.doc_type` → UPPER_SNAKE (align dengan `doc_types.keyname`).

Lihat file `apps/api/prisma/schema.prisma` untuk definisi Prisma lengkap.

---

## Tabel Legacy

| Tabel | Peran |
|-------|-------|
| `projects` | Master proyek — vendor, PIC, nilai, kontrak, klasifikasi, status, renewal chain |
| `termins` | Termin pembayaran (`monthly`, `quarterly`, `percentage`, `oneoff`) |
| `vendors` | Master vendor + kontak PIC |
| `users` | User internal (role: `admin`, `inspector`, `viewer`, `vendor_contact`) |
| `doc_types` | Katalog jenis dokumen (PR, PO, BAST, INVOICE, dst.) |
| `document_requirements` | Mapping dokumen wajib per termin/project + bypass flag |
| `documents` | Legacy general doc (jarang dipakai — mayoritas via `termin_documents`) |
| `termin_documents` | File dokumen termin + status verifikasi |
| `initiation_documents` | Dokumen fase inisiasi proyek (PR, PO, RKS, RAB, KONTRAK, BAMK, dll) |
| `pr_po_termin_coverage` | M:N mapping PR/PO ke termins yang dicover |
| `notifications` | Notifikasi in-app / email / whatsapp |
| `audit_logs` | Jejak aktivitas user (JSON meta) |

---

## Enums

| Prisma enum | Values | Digunakan |
|-------------|--------|-----------|
| `UserRole` | `admin`, `inspector`, `viewer`, `vendor_contact` | `users.role` |
| `ProjectStatus` | `inisiasi`, `running`, `completed`, `closed`, `cancelled` | `projects.status` |
| `ContractType` | `new`, `renewal` | `projects.contract_type` |
| `Classification` | `rutin`, `non_rutin` | `projects.classification` |
| `TerminType` | `monthly`, `quarterly`, `percentage`, `oneoff` | `termins.type` |
| `DocumentStatus` | `pending`, `uploaded`, `verified`, `rejected` | `documents.status` |
| `DocTypeStage` | `inisiasi`, `pelaksanaan` | `doc_types.stage` |
| `NotificationChannel` | `email`, `whatsapp`, `inapp` | `notifications.channel` |
| `NotificationStatus` | `sent`, `failed` | `notifications.status` |
| `RequirementScope` | `termin`, `init` | `document_requirements.scope` |

**Catatan:** `termin_documents.status` di legacy adalah `TINYINT (0/1)` — bukan enum. Di Prisma dipetakan ke `Int @db.SmallInt` untuk hemat, tapi service layer men-treat sebagai boolean (`1 = uploaded`, `0 = placeholder`).

---

## Relasi Kunci

```
users
  ├─ projects (pic_ikt_id, pic_vendor_id)
  ├─ documents (uploaded_by, verified_by)
  ├─ audit_logs
  ├─ notifications (sent_to)
  └─ refresh_tokens          [BARU]

vendors
  └─ projects (vendor_id)

projects
  ├─ termins                 (CASCADE on delete)
  ├─ documents               (CASCADE)
  ├─ initiation_documents    (implisit soft-ref di legacy; FK explicit di Prisma)
  ├─ termin_documents        (via code_project → projects.code, ON UPDATE CASCADE)
  ├─ children (renewal)      (self-ref via parent_project_id, SET NULL)
  └─ notifications           (SET NULL)

termins
  ├─ termin_documents        (CASCADE)
  ├─ documents               (SET NULL)
  ├─ document_requirements   (soft ref, no FK — enforced di app)
  ├─ pr_po_termin_coverage   (CASCADE)
  └─ notifications           (SET NULL)

initiation_documents
  └─ pr_po_termin_coverage   (CASCADE)

doc_types
  ├─ documents               (via doc_type_id, RESTRICT)
  ├─ notifications           (SET NULL)
  └─ document_requirements   (soft ref by keyname — enforced di app)
```

---

## Decimal / Numeric

| Kolom | Prisma | Notes |
|-------|--------|-------|
| `projects.value` | `Decimal @db.Decimal(20, 2)` | Nilai kontrak |
| `projects.progress_percent` | `Decimal @db.Decimal(5, 2)` | 0..100 |
| `termins.amount` | `Decimal @db.Decimal(20, 2)` | Kalkulasi = value × percentage/100 |
| `termins.percentage` | `Decimal @db.Decimal(5, 2)` | 0..100 |

Gunakan `Prisma.Decimal` di service (jangan cast ke `number` sebelum kalkulasi — presisi hilang).

---

## Data Quirks (Migration Notes)

1. **`initiation_documents.doc_type` casing** — data legacy lowercase (`pr`, `po`, `bamk`, `izin_prinsip`), tapi `doc_types.keyname` UPPERCASE (`PR`, `PO`, `BAMK`, `ND_IJIN_PRINSIP`). Migration one-time (PostgreSQL):
   ```sql
   UPDATE initiation_documents SET doc_type = UPPER(doc_type);
   UPDATE initiation_documents SET doc_type = 'ND_IJIN_PRINSIP' WHERE doc_type = 'IZIN_PRINSIP';
   ```
2. **`vendors.id = 5` missing** — tidak perlu diperbaiki, hanya gap AUTO_INCREMENT.
3. **`projects.value = 0.00`** untuk beberapa proyek (14, 15, 17) — data legacy incomplete, dibiarkan.
4. **`termin_documents.code_project`** — denormalized. Node service tetap set nilainya saat upload untuk backward-compat, tapi query internal pakai relasi `termin_id → project`.
5. **`document_requirements.doc_type`** — soft reference ke `doc_types.keyname`. Tidak ada FK, tapi Zod validation di service memastikan hanya keyname valid yang di-INSERT.

---

## Doc Type Master (Seed)

Diseed via Prisma seed script (`apps/api/prisma/seed.ts`).

**Stage `inisiasi` (11):**
`ND_IJIN_PRINSIP`, `PR`, `PO`, `KONTRAK`, `RKS`, `RAB`, `HIRADC`, `EVATEK`, `JUSTIFIKASI`, `TKDN`, `BAMK`

**Stage `pelaksanaan` (12) — order matters (workflow priority):**
1. `TTB` — Tanda Terima Barang
2. `LAPORAN_PEKERJAAN` — Laporan Pekerjaan
3. `BAPF` — BAPF
4. `BAST` — Berita Acara Serah Terima
5. `STAGIHAN` — Surat Tagihan
6. `INVOICE` — Invoice
7. `KWITANSI` — Kwitansi
8. `FAKTUR_PAJAK` — Faktur Pajak
9. `BAP` — Berita Acara Pembayaran
10. `ND_PEMBAYARAN` — Nota Dinas Pembayaran
11. `STATUS_SSC` — Status SSC

Priority order dipakai di dashboard reminders ("next step" = doc dengan priority terendah yang belum diupload & belum bypass).

---

## Refresh Tokens (Baru)

Lihat definisi lengkap di `apps/api/prisma/schema.prisma`. Ringkas:
- `id` cuid string, `user_id` FK ke users (cascade).
- `token_hash` (unique) — SHA-256 hash dari plain token yang dikirim ke client.
- `expires_at`, `revoked_at`, `user_agent`, `ip`, `created_at` (timestamptz).
- Rotasi: setiap refresh, token lama diberi `revoked_at`, token baru di-insert.
