/**
 * Копирует справочник дозирования для Prisma seed (backend без зависимости от сборки Nest).
 * Источник: VETEXPERT/SRC/lib рядом с backend в монорепо.
 *
 * Если фронтовой дерево нет, файлы уже должны лежать в prisma/vendor/.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');
const monorepoRoot = path.resolve(backendRoot, '..');
const srcDir = path.join(monorepoRoot, 'VETEXPERT', 'SRC', 'lib');
const dstDir = path.join(backendRoot, 'prisma', 'vendor');
const FILES = ['dosageKinds.ts', 'vetDosageReference.ts'];

async function bundleReferenceCjs() {
  const entry = path.join(dstDir, 'vetDosageReference.ts');
  const outfile = path.join(dstDir, 'vetDosageReference.cjs');
  if (!fs.existsSync(entry)) return;
  try {
    const esbuild = await import('esbuild');
    await esbuild.build({
      absWorkingDir: backendRoot,
      entryPoints: [entry],
      outfile,
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node18',
      logLevel: 'warning',
    });
    console.log(`sync-dosage-vendor: bundle → ${path.relative(backendRoot, outfile)}`);
  } catch (e) {
    console.warn(
      'sync-dosage-vendor: esbuild недоступен, пропускаем vetDosageReference.cjs (для импорта из API выполните npm install и повторите).',
      e instanceof Error ? e.message : e,
    );
  }
}

async function main() {
  fs.mkdirSync(dstDir, { recursive: true });
  let copied = false;
  if (fs.existsSync(srcDir)) {
    for (const file of FILES) {
      const from = path.join(srcDir, file);
      const to = path.join(dstDir, file);
      if (!fs.existsSync(from)) {
        console.error(`sync-dosage-vendor: нет источника ${from}`);
        process.exitCode = 1;
        return;
      }
      fs.copyFileSync(from, to);
      copied = true;
    }
    if (copied) {
      console.log(`sync-dosage-vendor: скопировано ${FILES.join(', ')} → ${dstDir}`);
    }
    await bundleReferenceCjs();
    return;
  }

  const missing = FILES.filter((f) => !fs.existsSync(path.join(dstDir, f)));
  if (missing.length) {
    console.error(
      'sync-dosage-vendor: не найден каталог VETEXPERT/SRC/lib и нет готовых файлов в prisma/vendor.',
    );
    console.error(`  Ожидалось: ${srcDir}`);
    console.error(`  Или вручную положите в prisma/vendor: ${missing.join(', ')}`);
    process.exitCode = 1;
    return;
  }
  console.log('sync-dosage-vendor: VETEXPERT не найден, используем уже лежащие файлы в prisma/vendor.');
  await bundleReferenceCjs();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
