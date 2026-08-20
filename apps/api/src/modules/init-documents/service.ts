import type { Prisma } from '@prisma/client';
import type { Readable } from 'node:stream';
import { prisma } from '../../lib/prisma.js';
import {
  ALLOWED_DOC_EXTS,
  CONTRACT_SUBDIR,
  INIT_DOC_SUBDIR,
  contentTypeFor,
  deleteFile,
  resolveAbsolutePath,
  saveUploadedFile,
  validateUploadedFile,
} from '../../lib/storage.js';
import { SINGLE_CARDINALITY_TYPES } from './schema.js';
import type { UpdateInitDocumentInput } from './schema.js';

function notFound(): never {
  throw Object.assign(new Error('Dokumen inisiasi tidak ditemukan'), { statusCode: 404, code: 'NOT_FOUND' });
}

function projectNotFound(): never {
  throw Object.assign(new Error('Project tidak ditemukan'), { statusCode: 404, code: 'NOT_FOUND' });
}

function contractNotFound(): never {
  throw Object.assign(new Error('Project belum punya file kontrak'), { statusCode: 404, code: 'NOT_FOUND' });
}

export async function list(projectId: number) {
  return prisma.initiationDocument.findMany({
    where: { project_id: projectId },
    orderBy: { uploaded_at: 'desc' },
  });
}

export async function listPrPo(projectId: number, docType: 'PR' | 'PO') {
  return prisma.initiationDocument.findMany({
    where: { project_id: projectId, doc_type: docType },
    include: { pr_po_coverage: { include: { termin: true } } },
    orderBy: { uploaded_at: 'asc' },
  });
}

async function nextPrPoDocName(tx: Prisma.TransactionClient, projectId: number, docType: string) {
  const count = await tx.initiationDocument.count({ where: { project_id: projectId, doc_type: docType } });
  return `${docType}${count + 1}`;
}

async function replaceCoverage(tx: Prisma.TransactionClient, initDocId: number, terminIds: number[]) {
  await tx.prPoTerminCoverage.deleteMany({ where: { init_doc_id: initDocId } });
  if (terminIds.length) {
    await tx.prPoTerminCoverage.createMany({
      data: terminIds.map((termin_id) => ({ init_doc_id: initDocId, termin_id })),
      skipDuplicates: true,
    });
  }
}

export async function upload(
  projectId: number,
  docType: string,
  fileStream: Readable,
  originalFilename: string,
  opts: { no_document?: string; doc_name?: string; termin_ids?: number[] },
) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) projectNotFound();

  const { relativePath, absolutePath } = await saveUploadedFile(fileStream, originalFilename, INIT_DOC_SUBDIR);

  try {
    await validateUploadedFile(absolutePath, originalFilename, ALLOWED_DOC_EXTS);

    const isSingle = SINGLE_CARDINALITY_TYPES.has(docType);
    const isBamkTransition = docType === 'BAMK' && project.status === 'inisiasi';

    const existing = isSingle
      ? await prisma.initiationDocument.findFirst({ where: { project_id: projectId, doc_type: docType } })
      : null;

    const saved = await prisma.$transaction(async (tx) => {
      const row =
        isSingle && existing
          ? await tx.initiationDocument.update({
              where: { id: existing.id },
              data: {
                file_path: relativePath,
                uploaded_at: new Date(),
                no_document: opts.no_document,
                doc_name: opts.doc_name,
              },
            })
          : await tx.initiationDocument.create({
              data: {
                project_id: projectId,
                doc_type: docType,
                file_path: relativePath,
                no_document: opts.no_document,
                doc_name: isSingle ? opts.doc_name : await nextPrPoDocName(tx, projectId, docType),
              },
            });

      if (!isSingle && opts.termin_ids) {
        await replaceCoverage(tx, row.id, opts.termin_ids);
      }

      if (isBamkTransition) {
        await tx.project.update({ where: { id: projectId }, data: { status: 'running' } });
      }

      return row;
    });

    if (existing) await deleteFile(existing.file_path);
    return saved;
  } catch (err) {
    await deleteFile(absolutePath);
    throw err;
  }
}

export async function update(id: number, input: UpdateInitDocumentInput) {
  const existing = await prisma.initiationDocument.findUnique({ where: { id } });
  if (!existing) notFound();

  return prisma.$transaction(async (tx) => {
    const row = await tx.initiationDocument.update({
      where: { id },
      data: {
        ...(input.no_document !== undefined && { no_document: input.no_document }),
        ...(input.doc_name !== undefined && { doc_name: input.doc_name }),
      },
    });
    if (input.termin_ids !== undefined) await replaceCoverage(tx, id, input.termin_ids);
    return row;
  });
}

export async function remove(id: number) {
  const existing = await prisma.initiationDocument.findUnique({ where: { id } });
  if (!existing) notFound();

  await prisma.initiationDocument.delete({ where: { id } });
  await deleteFile(existing.file_path);
  return { id };
}

export async function getFile(id: number) {
  const existing = await prisma.initiationDocument.findUnique({ where: { id } });
  if (!existing) notFound();

  return {
    absolutePath: resolveAbsolutePath(existing.file_path),
    contentType: contentTypeFor(existing.file_path),
    filename: existing.file_path.split('/').pop() ?? `document-${id}`,
  };
}

// ── Kontrak ─────────────────────────────────────────────────────

export async function uploadContract(
  projectId: number,
  fileStream: Readable,
  originalFilename: string,
  noKontrak?: string,
) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) projectNotFound();

  const { relativePath, absolutePath } = await saveUploadedFile(fileStream, originalFilename, CONTRACT_SUBDIR);

  try {
    await validateUploadedFile(absolutePath, originalFilename, ALLOWED_DOC_EXTS);

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        contract_file: relativePath,
        ...(noKontrak !== undefined && { no_kontrak: noKontrak }),
      },
    });

    if (project.contract_file) await deleteFile(project.contract_file);
    return updated;
  } catch (err) {
    await deleteFile(absolutePath);
    throw err;
  }
}

export async function removeContract(projectId: number) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) projectNotFound();
  if (!project.contract_file) return { id: projectId };

  const updated = await prisma.project.update({ where: { id: projectId }, data: { contract_file: null } });
  await deleteFile(project.contract_file);
  return updated;
}

export async function getContractFile(projectId: number) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) projectNotFound();
  if (!project.contract_file) contractNotFound();

  return {
    absolutePath: resolveAbsolutePath(project.contract_file),
    contentType: contentTypeFor(project.contract_file),
    filename: project.contract_file.split('/').pop() ?? `contract-${projectId}`,
  };
}
