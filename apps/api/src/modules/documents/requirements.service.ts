import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { CreateRequirementInput, UpdateRequirementInput } from './schema.js';

function terminNotFound(): never {
  throw Object.assign(new Error('Termin tidak ditemukan'), { statusCode: 404, code: 'NOT_FOUND' });
}

function requirementExists(): never {
  throw Object.assign(new Error('Requirement doc_type ini sudah ada, gunakan PATCH untuk mengubah'), {
    statusCode: 409,
    code: 'REQUIREMENT_EXISTS',
  });
}

export type ChecklistEntry = {
  doc_type: string;
  label: string | null;
  required: boolean;
  bypass_check: boolean;
};

/**
 * Resolve-order: override document_requirements (scope=termin) menang atas default doc_types.required.
 * bypass_check=true tetap muncul di checklist (dianggap selesai oleh consumer), required=false dibuang.
 */
export async function resolveChecklist(terminId: number): Promise<ChecklistEntry[]> {
  const termin = await prisma.termin.findUnique({ where: { id: terminId } });
  if (!termin) terminNotFound();

  const [docTypes, overrides] = await Promise.all([
    prisma.docType.findMany({ where: { stage: 'pelaksanaan' } }),
    prisma.documentRequirement.findMany({ where: { scope: 'termin', termin_id: terminId } }),
  ]);

  const overrideByDocType = new Map(overrides.map((o) => [o.doc_type, o]));
  const seen = new Set<string>();
  const entries: ChecklistEntry[] = [];

  for (const dt of docTypes) {
    if (!dt.keyname) continue;
    seen.add(dt.keyname);
    const override = overrideByDocType.get(dt.keyname);
    const required = override ? override.required : dt.required;
    if (!required) continue;
    entries.push({
      doc_type: dt.keyname,
      label: override?.label ?? dt.label,
      required: true,
      bypass_check: override?.bypass_check ?? false,
    });
  }

  // Override yang doc_type-nya belum/tidak ada di katalog pelaksanaan (jaga-jaga, harusnya jarang terjadi karena auto-create).
  for (const override of overrides) {
    if (seen.has(override.doc_type) || !override.required) continue;
    entries.push({
      doc_type: override.doc_type,
      label: override.label,
      required: true,
      bypass_check: override.bypass_check,
    });
  }

  return entries;
}

export async function listRequirements(terminId: number) {
  return resolveChecklist(terminId);
}

/** Resolve-order untuk satu doc_type saja, TANPA filter required=false — dipakai untuk validasi upload. */
export async function getRequirementStatus(
  terminId: number,
  docType: string,
): Promise<{ required: boolean; bypass_check: boolean }> {
  const termin = await prisma.termin.findUnique({ where: { id: terminId } });
  if (!termin) terminNotFound();

  const [docTypeRow, override] = await Promise.all([
    prisma.docType.findUnique({ where: { keyname: docType } }),
    prisma.documentRequirement.findFirst({ where: { scope: 'termin', termin_id: terminId, doc_type: docType } }),
  ]);

  if (override) return { required: override.required, bypass_check: override.bypass_check };
  return { required: docTypeRow?.required ?? true, bypass_check: false };
}

export async function createRequirement(terminId: number, input: CreateRequirementInput) {
  const termin = await prisma.termin.findUnique({ where: { id: terminId } });
  if (!termin) terminNotFound();

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.docType.upsert({
        where: { keyname: input.doc_type },
        create: { keyname: input.doc_type, label: input.label ?? input.doc_type, stage: 'pelaksanaan', required: input.required },
        update: {},
      });

      return tx.documentRequirement.create({
        data: {
          scope: 'termin',
          project_id: termin.project_id,
          termin_id: terminId,
          doc_type: input.doc_type,
          required: input.required,
          label: input.label,
        },
      });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') requirementExists();
    throw err;
  }
}

export async function updateRequirement(terminId: number, docType: string, input: UpdateRequirementInput) {
  const termin = await prisma.termin.findUnique({ where: { id: terminId } });
  if (!termin) terminNotFound();

  return prisma.documentRequirement.upsert({
    where: {
      scope_project_id_termin_id_doc_type: {
        scope: 'termin',
        project_id: termin.project_id,
        termin_id: terminId,
        doc_type: docType,
      },
    },
    create: {
      scope: 'termin',
      project_id: termin.project_id,
      termin_id: terminId,
      doc_type: docType,
      required: input.required ?? true,
      bypass_check: input.bypass ?? false,
    },
    update: {
      ...(input.required !== undefined && { required: input.required }),
      ...(input.bypass !== undefined && { bypass_check: input.bypass }),
    },
  });
}

export async function removeRequirement(terminId: number, docType: string) {
  const termin = await prisma.termin.findUnique({ where: { id: terminId } });
  if (!termin) terminNotFound();

  await prisma.documentRequirement
    .delete({
      where: {
        scope_project_id_termin_id_doc_type: {
          scope: 'termin',
          project_id: termin.project_id,
          termin_id: terminId,
          doc_type: docType,
        },
      },
    })
    .catch((err) => {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') return; // no-op: absennya row = fallback default
      throw err;
    });

  return { doc_type: docType };
}
