import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';
import { fileTypeFromBuffer } from 'file-type/core';
import { env } from '../config/env.js';

const EXT_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function invalidFile(message: string): never {
  throw Object.assign(new Error(message), { statusCode: 400, code: 'INVALID_FILE' });
}

function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.length > 150 ? base.slice(-150) : base;
}

function extOf(filename: string): string {
  return path.extname(filename).replace('.', '').toLowerCase();
}

export function contentTypeFor(filename: string): string {
  return EXT_MIME[extOf(filename)] ?? 'application/octet-stream';
}

/** Simpan stream multipart ke disk di bawah UPLOAD_ROOT/<subdir>/<uuid>-<sanitized>. Return path relatif thd UPLOAD_ROOT. */
export async function saveUploadedFile(
  fileStream: Readable,
  originalName: string,
  subdir: string,
): Promise<{ relativePath: string; absolutePath: string }> {
  const dir = path.resolve(env.UPLOAD_ROOT, subdir);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}-${sanitizeFilename(originalName)}`;
  const absolutePath = path.join(dir, filename);
  const relativePath = path.posix.join(subdir, filename);

  await pipeline(fileStream, createWriteStream(absolutePath));
  return { relativePath, absolutePath };
}

/** Validasi ekstensi whitelist + magic bytes setelah file tersimpan di disk. Throw INVALID_FILE kalau gagal. */
export async function validateUploadedFile(absolutePath: string, originalName: string, allowedExts: string[]) {
  const ext = extOf(originalName);
  if (!allowedExts.includes(ext)) {
    await deleteFile(absolutePath);
    invalidFile(`Tipe file tidak diizinkan. Hanya: ${allowedExts.join(', ')}`);
  }

  const buffer = await readFile(absolutePath);
  const detected = await fileTypeFromBuffer(buffer);
  // .doc lama = OLE/CFBF container — file-type cuma bisa deteksi sampai level 'cfb', tidak sampai 'doc'.
  const detectedExt = detected?.ext === 'cfb' ? 'doc' : detected?.ext;
  if (!detectedExt || !allowedExts.includes(detectedExt)) {
    await deleteFile(absolutePath);
    invalidFile('Isi file tidak cocok dengan ekstensinya');
  }
}

function absolutePathOf(relativePath: string): string {
  return path.resolve(env.UPLOAD_ROOT, relativePath);
}

/** Best-effort unlink. Log-only saat gagal — jangan pernah throw ke caller. */
export async function deleteFile(relativeOrAbsolutePath: string): Promise<void> {
  const absPath = path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : absolutePathOf(relativeOrAbsolutePath);
  try {
    await unlink(absPath);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[storage] Gagal menghapus file ${absPath}:`, err);
  }
}

export function resolveAbsolutePath(relativePath: string): string {
  return absolutePathOf(relativePath);
}

export const TERMIN_DOC_SUBDIR = 'termin_docs';
export const INIT_DOC_SUBDIR = 'init_docs';
export const CONTRACT_SUBDIR = 'contracts';
export const ALLOWED_DOC_EXTS = ['pdf', 'doc', 'docx'];
