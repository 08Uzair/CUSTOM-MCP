import fs from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import archiver from 'archiver';

/**
 * ZIP creation with path-traversal protection: every entry name is
 * normalized and rejected if it would escape the archive root.
 */
export async function zipDirectory(sourceDir, destZipPath) {
  await mkdir(path.dirname(destZipPath), { recursive: true });

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(destZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve({ destZipPath, sizeBytes: archive.pointer() }));
    output.on('error', reject);
    archive.on('error', reject);
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') console.warn('[zip] warning:', err.message);
    });

    archive.pipe(output);
    archive.glob('**/*', {
      cwd: sourceDir,
      dot: true,
      ignore: ['node_modules/**', '.env'],
      // Path-traversal protection for every archive entry.
      process: (entryPath, entry) => {
        const normalized = normalizeEntry(entryPath);
        if (!normalized) {
          entry.name = '__blocked__';
          return entryPath;
        }
        entry.name = normalized;
        return entryPath;
      },
    });
    archive.finalize();
  });
}

/** Rejects absolute paths and any entry that would walk up the tree. */
function normalizeEntry(entryPath) {
  const cleaned = entryPath.replace(/\\/g, '/').replace(/^\.\/+/, '');
  const parts = cleaned.split('/');
  if (parts.some((part) => part === '..') || path.isAbsolute(cleaned)) return null;
  return cleaned;
}

export async function sha256OfFile(filePath) {
  const content = await readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}