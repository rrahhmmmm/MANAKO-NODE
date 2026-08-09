import { PrismaClient, DocTypeStage, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DOC_TYPES = [
  // stage: inisiasi
  { keyname: 'ND_IJIN_PRINSIP', label: 'Nota Dinas Izin Prinsip', stage: DocTypeStage.inisiasi, priority: 0 },
  { keyname: 'PR',              label: 'Dokumen PR',              stage: DocTypeStage.inisiasi, priority: 0 },
  { keyname: 'PO',              label: 'Dokumen PO',              stage: DocTypeStage.inisiasi, priority: 0 },
  { keyname: 'KONTRAK',         label: 'Dokumen Kontrak',         stage: DocTypeStage.inisiasi, priority: 0 },
  { keyname: 'RKS',             label: 'Dokumen RKS',             stage: DocTypeStage.inisiasi, priority: 0 },
  { keyname: 'RAB',             label: 'Dokumen RAB',             stage: DocTypeStage.inisiasi, priority: 0 },
  { keyname: 'HIRADC',          label: 'HiraDC',                  stage: DocTypeStage.inisiasi, priority: 0 },
  { keyname: 'EVATEK',          label: 'Evatek',                  stage: DocTypeStage.inisiasi, priority: 0 },
  { keyname: 'JUSTIFIKASI',     label: 'Justifikasi',             stage: DocTypeStage.inisiasi, priority: 0 },
  { keyname: 'TKDN',            label: 'TKDN',                    stage: DocTypeStage.inisiasi, priority: 0 },
  { keyname: 'BAMK',            label: 'BAMK',                    stage: DocTypeStage.inisiasi, priority: 0 },
  // stage: pelaksanaan (priority menentukan urutan "next step" di dashboard reminder)
  { keyname: 'TTB',               label: 'Tanda Terima Barang',   stage: DocTypeStage.pelaksanaan, priority: 1 },
  { keyname: 'LAPORAN_PEKERJAAN', label: 'Laporan Pekerjaan',     stage: DocTypeStage.pelaksanaan, priority: 2 },
  { keyname: 'BAPF',              label: 'BAPF',                  stage: DocTypeStage.pelaksanaan, priority: 3 },
  { keyname: 'BAST',              label: 'BAST',                  stage: DocTypeStage.pelaksanaan, priority: 4 },
  { keyname: 'STAGIHAN',          label: 'Surat Tagihan',         stage: DocTypeStage.pelaksanaan, priority: 5 },
  { keyname: 'INVOICE',           label: 'Invoice',               stage: DocTypeStage.pelaksanaan, priority: 6 },
  { keyname: 'KWITANSI',          label: 'Kwitansi',              stage: DocTypeStage.pelaksanaan, priority: 7 },
  { keyname: 'FAKTUR_PAJAK',      label: 'Faktur Pajak',          stage: DocTypeStage.pelaksanaan, priority: 8 },
  { keyname: 'BAP',               label: 'BAP',                   stage: DocTypeStage.pelaksanaan, priority: 9 },
  { keyname: 'ND_PEMBAYARAN',     label: 'Nota Dinas Pembayaran', stage: DocTypeStage.pelaksanaan, priority: 10 },
  { keyname: 'STATUS_SSC',        label: 'Status SSC',            stage: DocTypeStage.pelaksanaan, priority: 11 },
];

async function main() {
  console.log('🌱 Seeding doc_types…');
  for (const dt of DOC_TYPES) {
    await prisma.docType.upsert({
      where: { keyname: dt.keyname },
      update: { label: dt.label, stage: dt.stage, priority: dt.priority, required: true },
      create: { ...dt, required: true },
    });
  }

  console.log('👤 Seeding admin user…');
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@manako.local';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
  const hash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Administrator',
      email: adminEmail,
      role: UserRole.admin,
      password_hash: hash,
    },
  });

  console.log(`✅ Done. Admin: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
