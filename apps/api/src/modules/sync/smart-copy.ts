import { mkdir, stat, copyFile } from 'node:fs/promises';
import path from 'node:path';

export type CopyResult = 'copied' | 'skipped' | 'failed';

/** Copy src → dest, skip kalau dest sudah ada dengan ukuran sama (dedupe). Port dari legacy `smartCopy()`. Tidak pernah throw. */
export async function smartCopy(srcAbsolutePath: string, destAbsolutePath: string): Promise<CopyResult> {
  try {
    await mkdir(path.dirname(destAbsolutePath), { recursive: true });

    try {
      const [srcStat, destStat] = await Promise.all([stat(srcAbsolutePath), stat(destAbsolutePath)]);
      if (srcStat.size === destStat.size) return 'skipped';
    } catch {
      // dest belum ada — lanjut copy
    }

    await copyFile(srcAbsolutePath, destAbsolutePath);
    return 'copied';
  } catch (err) {
    console.error(`[onedrive-sync] Gagal copy ${srcAbsolutePath} -> ${destAbsolutePath}:`, err);
    return 'failed';
  }
}
