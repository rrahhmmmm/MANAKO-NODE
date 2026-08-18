import type { Readable } from 'node:stream';
import { prisma } from '../../lib/prisma.js';
import {
  ALLOWED_DOC_EXTS,
  TERMIN_DOC_SUBDIR,
  contentTypeFor,
  deleteFile,
  resolveAbsolutePath,
  saveUploadedFile,
  validateUploadedFile,
} from '../../lib/storage.js';
import { getRequirementStatus, resolveChecklist } from './requirements.service.js';
import type { UpdateTerminDocumentInput } from './schema.js';

function notFound(): never {
  throw Object.assign(new Error('Dokumen termin tidak ditemukan'), { statusCode: 404, code: 'NOT_FOUND' });
}

function terminNotFound(): never {
  throw Object.assign(new Error('Termin tidak ditemukan'), { statusCode: 404, code: 'NOT_FOUND' });
}

function docRequirementDisabled(): never {
  throw Object.assign(new Error('Doc type ini tidak diperlukan (required=false) untuk termin ini'), {
    statusCode: 400,
    code: 'REQUIREMENT_DISABLED',
  });
}

export async function listChecklist(terminId: number) {
  const [checklist, docs] = await Promise.all([
    resolveChecklist(terminId),
    prisma.terminDocument.findMany({ where: { termin_id: terminId } }),
  ]);

  const docByType = new Map(docs.map((d) => [d.doc_type, d]));

  return checklist.map((entry) => {
    const doc = docByType.get(entry.doc_type);
    return {
      ...entry,
      uploaded: !!doc,
      termin_document_id: doc?.id,
      file_path: doc?.file_path,
      uploaded_at: doc?.uploaded_at,
      custom_label: doc?.custom_label,
      status: doc?.status,
    };
  });
}

export async function upload(
  terminId: number,
  docType: string,
  fileStream: Readable,
  originalFilename: string,
  customLabel?: string,
) {
  const termin = await prisma.termin.findUnique({ where: { id: terminId }, include: { project: true } });
  if (!termin) terminNotFound();

  const status = await getRequirementStatus(terminId, docType);
  if (!status.required) docRequirementDisabled();

  const { relativePath, absolutePath } = await saveUploadedFile(fileStream, originalFilename, TERMIN_DOC_SUBDIR);

  try {
    await validateUploadedFile(absolutePath, originalFilename, ALLOWED_DOC_EXTS);

    const existing = await prisma.terminDocument.findUnique({
      where: { termin_id_doc_type: { termin_id: terminId, doc_type: docType } },
    });

    const saved = await prisma.terminDocument.upsert({
      where: { termin_id_doc_type: { termin_id: terminId, doc_type: docType } },
      create: {
        termin_id: terminId,
        doc_type: docType,
        file_path: relativePath,
        status: 1,
        custom_label: customLabel,
        code_project: termin.project.code ?? '',
      },
      update: {
        file_path: relativePath,
        status: 1,
        uploaded_at: new Date(),
        custom_label: customLabel,
        code_project: termin.project.code ?? '',
      },
    });

    if (existing) await deleteFile(existing.file_path);

    return saved;
  } catch (err) {
    await deleteFile(absolutePath);
    throw err;
  }
}

export async function updateStatus(id: number, input: UpdateTerminDocumentInput) {
  const existing = await prisma.terminDocument.findUnique({ where: { id } });
  if (!existing) notFound();

  const status = input.status !== undefined ? input.status : input.verified !== undefined ? (input.verified ? 1 : 0) : undefined;

  return prisma.terminDocument.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(input.custom_label !== undefined && { custom_label: input.custom_label }),
    },
  });
}

export async function remove(id: number) {
  const existing = await prisma.terminDocument.findUnique({ where: { id } });
  if (!existing) notFound();

  await prisma.terminDocument.delete({ where: { id } });
  await deleteFile(existing.file_path);

  return { id };
}

export async function getFile(id: number) {
  const existing = await prisma.terminDocument.findUnique({ where: { id } });
  if (!existing) notFound();

  return {
    absolutePath: resolveAbsolutePath(existing.file_path),
    contentType: contentTypeFor(existing.file_path),
    filename: existing.file_path.split('/').pop() ?? `document-${id}`,
  };
}
