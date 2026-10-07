import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [mode, command] = process.argv.slice(2);

if (!['demo', 'production'].includes(mode) || !['dev', 'build', 'start'].includes(command)) {
  console.error('Usage: node scripts/run-mode.mjs <demo|production> <dev|build|start>');
  process.exit(1);
}

const args = command === 'dev'
  ? ['next', 'dev', '--port', '3010']
  : command === 'start'
    ? ['next', 'start', '--port', '3010']
    : ['next', 'build'];

const nextCli = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const result = spawnSync(process.execPath, [nextCli, ...args.slice(1)], {
  stdio: 'inherit',
  env: { ...process.env, NEXT_PUBLIC_APP_MODE: mode },
});

process.exit(result.status ?? 1);
