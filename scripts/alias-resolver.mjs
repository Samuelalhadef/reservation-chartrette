import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const SRC = path.resolve(process.cwd(), 'src');

// Résout un chemin sans extension à la façon de TypeScript (.ts, .tsx, /index.ts).
function resolveFile(base) {
  const candidates = [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), base];
  return candidates.find(candidate => path.extname(candidate) !== '' && existsSync(candidate));
}

export async function resolve(specifier, context, nextResolve) {
  // Alias "@/..." du tsconfig
  if (specifier.startsWith('@/')) {
    const resolved = resolveFile(path.join(SRC, specifier.slice(2)));
    if (resolved) return nextResolve(pathToFileURL(resolved).href, context);
  }

  // Imports relatifs sans extension entre fichiers TypeScript
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:') && !path.extname(specifier)) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const resolved = resolveFile(path.resolve(parentDir, specifier));
    if (resolved) return nextResolve(pathToFileURL(resolved).href, context);
  }

  return nextResolve(specifier, context);
}
