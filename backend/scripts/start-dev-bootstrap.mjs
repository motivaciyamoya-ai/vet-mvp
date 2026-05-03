/**
 * Если dist ещё пуст после «node_modules только» или после смены rootDir —
 * синхронно делаем nest build перед watch, иначе Nest спавнит node до записи файлов на диск.
 * Если остался старый dist/src/main.js после неправильного rootDir — тоже чистим.
 */
import { existsSync, rmSync } from 'fs';
import { spawnSync } from 'child_process';

if (existsSync('dist/main.js')) {
  process.exit(0);
}

try {
  rmSync('dist', { recursive: true, force: true });
} catch {
  /* ignore */
}

const r = spawnSync('npx', ['nest', 'build'], { stdio: 'inherit', shell: true });

if (r.error) {
  console.error(r.error);
  process.exit(1);
}
process.exit(typeof r.status === 'number' ? r.status : 1);
