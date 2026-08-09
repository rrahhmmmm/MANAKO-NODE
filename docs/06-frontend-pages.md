# 06 — Frontend Pages (Next.js App Router)

Peta halaman PHP legacy → route Next.js 14 (`apps/web/src/app`).
Tujuan: setiap page PHP punya padanan yang **utuh secara UX** (tidak kehilangan tab, filter, modal, dsb.), tapi kode dipisah jadi RSC + client components.

Legenda:
- **RSC** — React Server Component (server-side render, fetch di server).
- **CC** — Client Component (`'use client'`, butuh interaktivitas).
- **SA** — Server Action (form submit tanpa API route).
- **API** — call langsung ke Fastify `/api/v1/*`.

---

## 1. Struktur Route

```
apps/web/src/app/
├── layout.tsx                    RSC — root layout + <ThemeProvider> + <QueryClientProvider>
├── globals.css                   Tailwind + shadcn tokens
├── page.tsx                      RSC — redirect ke /dashboard kalau login, /login kalau nggak
│
├── (auth)/
│   ├── layout.tsx                CC — layout kosong (tanpa sidebar)
│   ├── login/page.tsx            CC — form login
│   └── forgot/page.tsx           CC — (opsional, phase 2)
│
├── (app)/                        Route group untuk halaman yg butuh auth + sidebar
│   ├── layout.tsx                RSC — validate session, render <Sidebar> + <Topbar>
│   │
│   ├── dashboard/
│   │   ├── page.tsx              RSC — stats cards (initial), lalu <ReminderTabs> CC
│   │   └── loading.tsx           skeleton
│   │
│   ├── projects/
│   │   ├── page.tsx              RSC — list projects (initial data), <ProjectFilters> CC
│   │   ├── new/page.tsx          CC — form create project
│   │   ├── [id]/
│   │   │   ├── page.tsx          RSC — detail proyek (initial), <ProjectDetailTabs> CC
│   │   │   ├── edit/page.tsx     CC — form edit metadata
│   │   │   └── loading.tsx
│   │   └── error.tsx
│   │
│   ├── vendors/
│   │   ├── page.tsx              RSC — list vendors
│   │   ├── new/page.tsx          CC — form create
│   │   └── [id]/edit/page.tsx    CC — form edit vendor
│   │
│   ├── documents/                ← master doc_types
│   │   └── page.tsx              CC — CRUD table (interaktif tinggi)
│   │
│   ├── reports/
│   │   ├── page.tsx              CC — form generate (year + classification)
│   │   ├── preview/page.tsx      RSC — tabel preview (URL contains filter)
│   │   └── print/page.tsx        RSC — print-friendly (window.print())
│   │
│   ├── users/                    ➕ baru (belum ada di legacy)
│   │   ├── page.tsx              RSC — list users
│   │   ├── new/page.tsx          CC — form create user
│   │   └── [id]/page.tsx         CC — detail + role assignment
│   │
│   └── audit-logs/               ➕ baru
│       └── page.tsx              RSC — table viewer + filters
│
└── api/
    └── auth/[...nextauth]/       (opsional — kalau pakai NextAuth alih2 JWT manual)
```

---

## 2. Peta PHP → Next Route

| PHP legacy | Next route | Komponen kunci | Notes |
|------------|-----------|-----------------|-------|
| `index.php` | `/` (page.tsx redirect) | — | Redirect ke dashboard/login |
| `dashboard.php` | `/dashboard` | `<StatsCards>`, `<ReminderTabs>`, `<ProjectList>` | 3 tab merge jadi satu page |
| `add_project.php` | `/projects/new` | `<ProjectForm>` | Form modular, code preview live |
| `proses_add_project.php` | — (handler) | API `POST /projects` | Form submit langsung ke API |
| `detail_project.php` (GET) | `/projects/[id]` | `<ProjectHeader>`, `<TerminAccordion>`, `<InitDocsPanel>`, `<KontrakPanel>` | 1968-line PHP dipecah jadi 6+ komponen |
| `detail_project.php` (upload_kind) | — (handler) | API `POST /termins/:id/documents`, `POST /projects/:id/init-documents` | Upload dari komponen modal |
| `add_termin.php` | Modal di `/projects/[id]` | `<TerminFormModal>` | Bukan halaman terpisah lagi |
| `edit_termin.php` | Modal di `/projects/[id]` | `<TerminFormModal mode="edit">` | Reuse form |
| `delete_termin.php` | — (confirm dialog + API) | `<ConfirmDelete>` | shadcn `<AlertDialog>` |
| `master_vendor.php` | `/vendors` | `<VendorTable>`, `<VendorFormModal>` | Search + pagination |
| `edit_vendor.php` | `/vendors/[id]/edit` | `<VendorForm mode="edit">` | Halaman penuh (mobile-friendly) |
| `master_documents.php` | `/documents` | `<DocTypeTable>`, `<DocTypeFormModal>` | Stage filter (inisiasi/pelaksanaan) |
| `generate_report.php` | `/reports` | `<ReportGenerateForm>` | Year select + classification checkbox |
| `report_preview.php` | `/reports/preview` | `<ReportPreviewTable>` | Query params: `year`, `classification` |
| `report_print.php` | `/reports/print` | `<ReportPrintLayout>` | `@media print` CSS |
| `export_excel.php` | — (download) | `<button onClick={() => fetch('/api/v1/reports/export.xlsx')}>` | Trigger download blob |
| `init_documents.php` | ❌ | — | Redirect deprecated |

---

## 3. Sidebar Navigation

Legacy `components/Sidebar.php`:
```
📊 Dashboard          → dashboard.php
➕ Tambah Project     → add_project.php
📄 Generate Report    → generate_report.php
🏢 Master Vendor      → master_vendor.php
📋 Master Dokumen     → master_documents.php
☁️ Sync ke OneDrive   → # (JS trigger)
```

Port ke `apps/web/src/components/layout/Sidebar.tsx`:
```tsx
const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',      href: '/dashboard'  },
  { icon: FolderPlus,      label: 'Tambah Project', href: '/projects/new' },
  { icon: FileSpreadsheet, label: 'Reports',        href: '/reports'    },
  { icon: Building2,       label: 'Master Vendor',  href: '/vendors'    },
  { icon: FileText,        label: 'Master Dokumen', href: '/documents'  },
  { icon: CloudUpload,     label: 'Sync OneDrive',  action: 'sync'      },  // trigger modal
  // ➕ baru:
  { icon: Users,           label: 'Users',          href: '/users',    role: 'admin' },
  { icon: History,         label: 'Audit Logs',     href: '/audit-logs', role: 'admin' },
];
```
- Active state: pakai `usePathname()` + `startsWith(href)`.
- Icon: `lucide-react`.
- Filter by role: hide item kalau `!hasRole(user, item.role)`.
- **Responsive**: collapse jadi drawer di mobile (`< md`) pakai shadcn `<Sheet>`.

---

## 4. Detail Halaman Kunci

### 4.1 `/dashboard`
Dari `dashboard.php` (612 baris). Dipecah:

```
<StatsCards>              — 4 card: running / completed / inisiasi / cancelled
  ↳ fetch: GET /dashboard/stats?year=

<YearFilter>              — dropdown, sync ke URL ?year=

<Tabs value="reminders">
  <TabsList>
    <TabsTrigger value="reminders">🔔 Reminders</TabsTrigger>
    <TabsTrigger value="projects">📁 Projects</TabsTrigger>
  </TabsList>

  <TabsContent value="reminders">
    <ReminderTabs>        — sub-tab: overdue | pending
      ↳ GET /dashboard/reminders?tab=&page=
      ↳ pagination shadcn <Pagination>
  </TabsContent>

  <TabsContent value="projects">
    <ProjectFilters>      — year, status, classification[]
    <ProjectList>         — table with link ke /projects/[id]
      ↳ GET /dashboard/projects?tab=&search=&year=&classification[]=
  </TabsContent>
</Tabs>
```

**Note**: filter `classification[]` di legacy — kalau kedua unchecked, tidak ada hasil (§7.4 di doc 05). Port apa adanya + tooltip peringatan.

### 4.2 `/projects/[id]` (detail)
Legacy `detail_project.php` = **1968 baris** monolit. Dipecah:

```
<ProjectHeader>           — nama, kode, vendor, PIC, klasifikasi, status badge, progress bar
  ↳ prop `project` dari RSC parent

<ProjectActions>          — CC — button: edit, delete, update progress (modal)

<Tabs defaultValue="termins">
  <TabsTrigger value="termins">Termins</TabsTrigger>
  <TabsTrigger value="init">Dokumen Inisiasi</TabsTrigger>
  <TabsTrigger value="kontrak">Kontrak</TabsTrigger>
  <TabsTrigger value="prpo">PR / PO</TabsTrigger>
  <TabsTrigger value="progress">Progress History</TabsTrigger>

  <TabsContent value="termins">
    <TerminAccordion>     — CC
      per termin:
        - header: nama, periode, %, amount, due_date, status
        - collapse: <TerminDocsPanel>
          - checklist doc pelaksanaan (dari GET /termins/:id/documents)
          - toggle bypass / required per row (PATCH .../requirements/:doc_type)
          - upload button per row (modal <UploadDocModal>)
          - preview file link
        - actions: edit termin, delete termin, add requirement
      + <AddTerminButton> → modal <TerminFormModal>
  </TabsContent>

  <TabsContent value="init">
    <InitDocsPanel>       — CC
      per doc_type (single): upload / preview / delete
      + list PR & PO (multi) dengan action edit coverage
  </TabsContent>

  <TabsContent value="kontrak">
    <KontrakPanel>        — upload contract_file + no_kontrak
  </TabsContent>

  <TabsContent value="prpo">
    <PrPoCoveragePanel>   — matrix PR/PO × termin, checkbox coverage
  </TabsContent>
</Tabs>
```

**Modal-modal**:
- `<TerminFormModal>` (create/edit) — shadcn `<Dialog>` + react-hook-form + Zod.
- `<UploadDocModal>` — file input + doc_type + custom_label (opsional).
- `<UpdateProgressModal>` — slider 0..100.
- `<ConfirmDelete>` — reusable `<AlertDialog>`.

### 4.3 `/projects/new`
Field:
- Project type: radio `investasi | eksploitasi` → live preview kode `INV-2026-…` (call `GET /projects/code/preview?type=`).
- Contract type: `new | renewal`. Kalau renewal → tampilkan `<ParentProjectSelect>` (butuh vendor dipilih dulu).
- Vendor: shadcn `<Combobox>` dengan async search.
- Kalau vendor + renewal dipilih → auto-fill name & value (fetch `GET /vendors/:id/previous-projects`).
- Upload kontrak (opsional): drag-drop dropzone.

**Note**: kode `INV-YYYY-NN` di preview cuma prediksi — final ditentukan server saat submit (§1 doc 05). Tampilkan tooltip.

### 4.4 `/vendors`
- Table: kolom `nama, kontak, PIC, jumlah project aktif`.
- Search bar (debounced 300ms) → `?search=`.
- Button "Tambah" → `<VendorFormModal>` ATAU redirect ke `/vendors/new`.
- Row action: edit (link ke `/vendors/[id]/edit`), delete (`<AlertDialog>`).

### 4.5 `/documents` (Master Doc Types)
- Filter: stage `inisiasi | pelaksanaan | semua`.
- Table: `keyname, label, stage, required (toggle), priority (drag-handle)`.
- Toggle `required` → optimistic UI + `PATCH /doc-types/:id`.
- Drag-drop reorder priority (dnd-kit) → `PATCH /doc-types/reorder` (batch).
- Form tambah: keyname (auto UPPER_SNAKE dari label), stage, required.

### 4.6 `/reports` + `/reports/preview`
```
/reports
  <ReportGenerateForm>
    - Year select (dari GET /reports/years)
    - Classification: radio rutin | non-rutin (default: rutin)
    - Button: [Preview] → /reports/preview?year=&classification=
                    [Download Excel] → GET /reports/export.xlsx
                    [Print] → /reports/print

/reports/preview
  RSC — GET /reports/preview server-side
  <ReportPreviewTable>
    - Sticky header
    - Per project: nama, vendor, nilai, total termin, kolom-kolom doc status per termin
    - Cell TTB dengan custom_label render sebagai teks (bukan ✓)
    - Warna: ✗ merah, ✓ hijau (bypass juga hijau)
  Actions: [Download Excel] [Print]
```

### 4.7 `/login`
Form:
- Email + password.
- POST ke `/api/v1/auth/login` → simpan `access_token` di memory (Zustand) + `refresh_token` di **httpOnly cookie** (server action + `Set-Cookie`).
- Redirect ke `?next=/dashboard` atau default `/dashboard`.
- Error state: shadcn `<Alert>`.

---

## 5. Komponen Reusable (`components/`)

### `components/ui/` — shadcn
Install via CLI: `button, input, select, dialog, alert-dialog, dropdown-menu, tabs, table, badge, checkbox, radio-group, textarea, tooltip, popover, command, sheet, sonner (toast), skeleton, progress, form, pagination`.

### `components/forms/`
| Komponen | Guna |
|----------|------|
| `<ProjectForm>` | Create + edit project (mode prop) |
| `<TerminForm>` | Create + edit termin |
| `<VendorForm>` | Create + edit vendor |
| `<UploadDropzone>` | Drag-drop file + preview + validasi client (size, ext) |
| `<DocTypeSelect>` | Combobox untuk pilih doc_type (fetch cached) |
| `<VendorCombobox>` | Async search vendor |
| `<DateRangePicker>` | period_start + period_end |

### `components/layout/`
| Komponen | Guna |
|----------|------|
| `<Sidebar>` | Nav utama (§3) |
| `<Topbar>` | Breadcrumb + user menu + notifikasi bell |
| `<PageHeader>` | Judul halaman + actions kanan |
| `<EmptyState>` | Placeholder kalau data kosong |
| `<ErrorBoundary>` | Fallback error client |

### `components/features/` (per-domain, opsional)
- `projects/` — `ProjectTable`, `ProjectStatusBadge`, `ProgressBar`
- `termins/` — `TerminAccordion`, `TerminStatusPill`
- `documents/` — `DocChecklistItem`, `DocStatusIcon`, `UploadDocModal`
- `dashboard/` — `StatsCard`, `ReminderRow`
- `reports/` — `ReportPreviewTable`, `ReportCellStatus`

---

## 6. State Management

- **Server state**: React Query (`@tanstack/react-query`) — dipakai untuk semua fetch API.
- **Auth state**: Zustand store `useAuthStore` — user, accessToken (in-memory).
- **UI state lokal**: `useState` / `useReducer` di komponen.
- **Form state**: `react-hook-form` + `@hookform/resolvers/zod` — schema Zod di-share dari `apps/api` (via `packages/shared` — phase 2, awalnya duplikasi).

Setup:
```tsx
// apps/web/src/app/providers.tsx
'use client';
export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }));
  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider attribute="class" defaultTheme="system">
        {children}
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

---

## 7. Data Fetching Pattern

### RSC (halaman utama)
```tsx
// app/(app)/dashboard/page.tsx
import { getStats } from '@/lib/api/dashboard';

export default async function DashboardPage({ searchParams }: { searchParams: { year?: string } }) {
  const year = Number(searchParams.year) || new Date().getFullYear();
  const stats = await getStats(year);   // server fetch with cookie token
  return (
    <>
      <StatsCards data={stats} />
      <ReminderTabs year={year} />       {/* CC — pakai React Query */}
    </>
  );
}
```

### CC (interaktif)
```tsx
// components/features/dashboard/ReminderTabs.tsx
'use client';
export function ReminderTabs({ year }: { year: number }) {
  const [tab, setTab] = useState<'overdue' | 'pending'>('overdue');
  const { data, isLoading } = useQuery({
    queryKey: ['reminders', { year, tab }],
    queryFn: () => apiClient.get('/dashboard/reminders', { params: { tab, year } }),
  });
  // ...
}
```

### API client helper (`lib/api/client.ts`)
- Axios (atau native fetch) + interceptor auto-refresh saat 401.
- Base URL dari `NEXT_PUBLIC_API_URL`.
- Server-side: pakai `next/headers` cookies untuk ambil token.
- Client-side: token dari Zustand.

---

## 8. UI/UX Improvements dari Legacy ➕

Diambil dari observasi PHP legacy:

| Legacy pain | Fix Next |
|-------------|----------|
| Halaman detail 1968 baris — scroll tak berujung | Tabs + accordion, per-section |
| Upload file: form submit + page reload | Modal + optimistic UI + toast success |
| Delete tanpa konfirmasi (`onclick="return confirm(...)"`) | shadcn `<AlertDialog>` |
| Filter table via GET reload | React Query + client-side re-fetch |
| Search vendor: full-page reload | Debounced combobox async search |
| Toggle bypass: form kecil per row → 1 request | Optimistic update + rollback on error |
| Dashboard: hitung auto-progress on-load (lambat) | Data dari cron cache, instant load |
| OneDrive sync: alert() + polling manual | Toast + SSE progress bar |
| Report: HTML tabel tanpa print CSS | Print layout dedicated + `<button onClick={window.print}>` |

---

## 9. Accessibility & i18n

- Semua komponen shadcn sudah accessible by default (radix primitives).
- Focus trap di modal.
- Keyboard shortcut: `/` untuk focus search bar (opsional).
- i18n: **bahasa Indonesia** only untuk sekarang. Kalau nanti butuh, pakai `next-intl` (semua string sudah di komponen, tinggal wrap).

---

## 10. Roadmap Implementasi Frontend

Urut berdasarkan dependency (asumsi API sudah jalan dulu):

1. **Setup base** — Next 14 App Router + Tailwind + shadcn init + providers + auth Zustand.
2. **Layout & auth** — Sidebar, Topbar, `(auth)/login`, `(app)/layout` guard.
3. **Dashboard** — stats + reminders (paling banyak dipakai user).
4. **Projects list + detail (read-only)** — pakai halaman detail tanpa upload dulu.
5. **Projects create + edit** — form modular.
6. **Termins CRUD** — modal.
7. **Upload termin doc + init doc** — dropzone + validasi.
8. **Master vendor + doc types**.
9. **Reports** — preview + download.
10. **Sync OneDrive** — modal + SSE progress.
11. **Users & audit logs** (admin) — phase 2.

---

## 11. Testing Frontend

- **Unit**: Vitest untuk helper `lib/*`.
- **Component**: React Testing Library untuk komponen kritikal (`ProjectForm`, `TerminAccordion`).
- **E2E**: Playwright — cover flow: login → create project → add termin → upload doc → lihat di dashboard.

Minimal E2E scenario:
1. Login sebagai admin.
2. Create project baru → assert kode `INV-2026-01` (asumsi DB kosong).
3. Add termin → assert amount auto-calc.
4. Upload BAMK → assert status project berubah ke "running".
5. Buka dashboard → assert reminder muncul untuk termin baru (dengan TTB sebagai next step).
