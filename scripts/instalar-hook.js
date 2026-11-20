import fs from 'node:fs';
import path from 'node:path';

const git = path.resolve('.git');
if (!fs.existsSync(git) || !fs.statSync(git).isDirectory()) {
  console.log('instalar-hook: no hay .git, no se instala el hook.');
} else {
  const hook = path.join(git, 'hooks', 'pre-commit');
  fs.mkdirSync(path.dirname(hook), { recursive: true });
  fs.writeFileSync(hook, '#!/bin/sh\nexec node scripts/chequear-keys.js\n', { mode: 0o755 });
  console.log('instalar-hook: pre-commit instalado.');
}
