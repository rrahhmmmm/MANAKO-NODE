import path from 'node:path';

const LABEL_PATTERNS: Array<[needle: string, label: string]> = [
  ['rab', 'RAB'],
  ['po', 'PO'],
  ['kontrak', 'KONTRAK'],
  ['kak', 'KAK'],
  ['rks', 'RKS'],
  ['bast', 'BAST'],
  ['invoice', 'INVOICE'],
  ['progress', 'LAPORAN'],
];

/** Sanitasi nama untuk dipakai sebagai path/filename. Port dari legacy `cleanName()`. */
export function cleanName(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9_\-. ]/g, '_');
}

/** Deteksi label dari substring nama file. Port dari legacy `labelFromFilename()` — urutan pengecekan menentukan match pertama. */
export function labelFromFilename(filename: string): string {
  const n = filename.toLowerCase();
  for (const [needle, label] of LABEL_PATTERNS) {
    if (n.includes(needle)) return label;
  }
  return 'DOKUMEN';
}

/** `custom_label` (override admin) ?? `doc_type` (field terstruktur) ?? deteksi dari nama file, lalu dibersihkan. */
export function resolveLabel(
  docType: string | null | undefined,
  customLabel: string | null | undefined,
  originalFilenameForFallback: string,
): string {
  const raw = customLabel?.trim() || docType?.trim() || labelFromFilename(originalFilenameForFallback);
  return cleanName(raw);
}

/** `{LABEL} {PROJECT_NAME} [{TERMIN_NAME}] {YEAR}.{ext}`, seluruhnya uppercase (sama seperti legacy `strtoupper()`). */
export function buildDestFilename(
  label: string,
  projectName: string,
  terminName: string | null | undefined,
  year: number,
  ext: string,
): string {
  const parts = [label, cleanName(projectName)];
  if (terminName) parts.push(cleanName(terminName));
  parts.push(String(year));
  return `${parts.join(' ')}.${ext}`.toUpperCase();
}

export function buildProjectFolder(onedriveRoot: string, year: number, projectName: string): string {
  return path.join(onedriveRoot, String(year), cleanName(projectName));
}

export type SyncCategory = 'Kontrak' | 'Inisiasi' | 'Pelaksanaan';

export function buildDestPath(
  projectFolder: string,
  category: SyncCategory,
  filename: string,
  terminName?: string | null,
): string {
  if (category === 'Pelaksanaan') {
    return path.join(projectFolder, category, cleanName(terminName ?? ''), filename);
  }
  return path.join(projectFolder, category, filename);
}
