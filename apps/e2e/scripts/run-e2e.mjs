import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const e2eRoot = fileURLToPath(new URL('..', import.meta.url));

const PROJECT = 'tech-challenge-e2e';
const PORTS = {
  POSTGRES_PORT: '15432',
  KAFKA_PORT: '19092',
  KAFKA_UI_PORT: '18080',
  TRANSACTIONS_PORT: '13001',
  ANTI_FRAUD_PORT: '13002',
  WEB_PORT: '13000',
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  return result.status ?? 1;
}

function playwright(env) {
  const installStatus = run('pnpm', ['exec', 'playwright', 'install', 'chromium'], {
    cwd: e2eRoot,
  });
  if (installStatus !== 0) return installStatus;
  return run('pnpm', ['exec', 'playwright', 'test'], { cwd: e2eRoot, env });
}

if (process.env.E2E_BASE_URL) {
  process.exit(playwright(process.env));
}

const composeEnv = { ...process.env, ...PORTS };
const compose = (...args) =>
  run('docker', ['compose', '-p', PROJECT, ...args], { cwd: repoRoot, env: composeEnv });

let status = compose('up', '--build', '--detach', '--wait', 'web', 'anti-fraud');
if (status === 0) {
  status = playwright({ ...process.env, E2E_BASE_URL: `http://localhost:${PORTS.WEB_PORT}` });
} else {
  compose('logs', '--tail', '100');
}
compose('down', '--volumes', '--remove-orphans');
process.exit(status);
