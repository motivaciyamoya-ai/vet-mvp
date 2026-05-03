import fs from 'fs';

try {
  fs.rmSync('./dist', { recursive: true, force: true });
} catch {
  /* ignore */
}
