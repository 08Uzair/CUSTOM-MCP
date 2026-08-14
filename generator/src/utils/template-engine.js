import fs from 'node:fs/promises';
import path from 'node:path';

export const TEXT_EXTENSIONS = new Set([
  '.js', '.jsx', '.json', '.md', '.yml', '.yaml', '.env', '.example',
  '.gitignore', '.dockerignore', '.txt', '.html', '.css', '.properties',
]);

const MAX_TEXT_SIZE = 512 * 1024;

/**
 * Recursively copies a template directory into `dest`, replacing every
 * {{TOKEN}} occurrence in text files with its value.
 */
export async function renderTemplate(sourceDir, destDir, tokens) {
  await fs.mkdir(destDir, { recursive: true });

  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(sourceDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      await renderTemplate(srcPath, destPath, tokens);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (TEXT_EXTENSIONS.has(ext)) {
      const content = await fs.readFile(srcPath, 'utf8');
      await fs.writeFile(destPath, renderTokens(content, tokens), 'utf8');
    } else {
      // Binary-safe copy (images, fonts, favicons, ...).
      const buffer = await fs.readFile(srcPath);
      if (buffer.length <= MAX_TEXT_SIZE) {
        await fs.writeFile(destPath, buffer);
      } else {
        const content = await fs.readFile(srcPath, 'utf8');
        await fs.writeFile(destPath, renderTokens(content, tokens), 'utf8');
      }
    }
  }
}

export function renderTokens(content, tokens) {
  let out = content;
  for (const [key, value] of Object.entries(tokens)) {
    out = out.split(`{{${key}}}`).join(String(value ?? ''));
  }
  return out;
}

/** Copies one file applying token replacement (for generated non-template files). */
export async function renderFile(srcPath, destPath, tokens) {
  const content = await fs.readFile(srcPath, 'utf8');
  await fs.writeFile(destPath, renderTokens(content, tokens), 'utf8');
  return destPath;
}