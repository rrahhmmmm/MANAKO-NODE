import { stat } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../../lib/prisma.js';
import { resolveAbsolutePath } from '../../lib/storage.js';
import { buildDestFilename, buildDestPath, buildProjectFolder, resolveLabel } from './helpers.js';
import { smartCopy } from './smart-copy.js';

export type SyncStats = { copied: number; skipped: number; failed: number };
export type ProgressCallback = (current: number, total: number, message: string) => Promise<void> | void;

async function fileExists(absolutePath: string): Promise<boolean> {
  try {
    await stat(absolutePath);
    return true;
  } catch {
    return false;
  }
}

function extOf(relativePath: string): string {
  return path.extname(relativePath).replace('.', '').toLowerCase();
}

type CopyJob = { srcRelativePath: string; destAbsolutePath: string };

/** Iterasi seluruh file upload (kontrak, dokumen inisiasi, dokumen termin) dan mirror ke ONEDRIVE_ROOT. */
export async function runOnedriveSync(onedriveRoot: string, onProgress: ProgressCallback): Promise<SyncStats> {
  if (!onedriveRoot) {
    throw Object.assign(new Error('ONEDRIVE_ROOT belum dikonfigurasi'), {
      statusCode: 400,
      code: 'ONEDRIVE_NOT_CONFIGURED',
    });
  }

  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      created_at: true,
      contract_file: true,
      initiation_documents: { select: { doc_type: true, file_path: true } },
      termins: {
        select: {
          name: true,
          termin_documents: { where: { status: 1 }, select: { doc_type: true, custom_label: true, file_path: true } },
        },
      },
    },
    orderBy: { id: 'asc' },
  });

  // Bangun daftar copy job dulu supaya `total` akurat sejak awal (docs §9.1 pakai created_at, legacy PHP pakai
  // start_date — created_at dipilih krn non-null di schema, menghindari folder tahun "NaN"/crash).
  const jobs: CopyJob[] = [];
  for (const project of projects) {
    const year = project.created_at.getFullYear();
    const projectFolder = buildProjectFolder(onedriveRoot, year, project.name);

    if (project.contract_file) {
      const ext = extOf(project.contract_file);
      const destName = buildDestFilename('KONTRAK', project.name, null, year, ext);
      jobs.push({
        srcRelativePath: project.contract_file,
        destAbsolutePath: buildDestPath(projectFolder, 'Kontrak', destName),
      });
    }

    for (const doc of project.initiation_documents) {
      const ext = extOf(doc.file_path);
      const label = resolveLabel(doc.doc_type, null, doc.file_path);
      const destName = buildDestFilename(label, project.name, null, year, ext);
      jobs.push({
        srcRelativePath: doc.file_path,
        destAbsolutePath: buildDestPath(projectFolder, 'Inisiasi', destName),
      });
    }

    for (const termin of project.termins) {
      for (const doc of termin.termin_documents) {
        const ext = extOf(doc.file_path);
        const label = resolveLabel(doc.doc_type, doc.custom_label, doc.file_path);
        const destName = buildDestFilename(label, project.name, termin.name, year, ext);
        jobs.push({
          srcRelativePath: doc.file_path,
          destAbsolutePath: buildDestPath(projectFolder, 'Pelaksanaan', destName, termin.name),
        });
      }
    }
  }

  const total = jobs.length;
  const stats: SyncStats = { copied: 0, skipped: 0, failed: 0 };

  let current = 0;
  for (const job of jobs) {
    current++;
    const srcAbsolutePath = resolveAbsolutePath(job.srcRelativePath);
    const destName = path.basename(job.destAbsolutePath);

    if (!(await fileExists(srcAbsolutePath))) {
      stats.failed++;
    } else {
      const result = await smartCopy(srcAbsolutePath, job.destAbsolutePath);
      stats[result]++;
    }

    await onProgress(current, total, `Menyalin: ${destName}`);
  }

  return stats;
}
