// npm run schema:dump [-- --ensure-only | --dump-only]
// 1. Menjalankan sinkronisasi skema (src/db/ensure) ke database di env (pakai DB KOSONG khusus, bukan prod).
// 2. pg_dump --schema-only ke docs/handover/database/schema.sql (baris yang berubah antar versi pg_dump dibuang).
// CI menjalankan ini lalu `git diff --exit-code` supaya schema.sql selalu sama dengan kode.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import env from '../config/env.config.ts';
import { pool } from '../db/index.ts';
import { ensureDatabaseSchema } from '../db/ensure/index.ts';

const args = new Set(process.argv.slice(2));
const out = path.resolve(process.cwd(), '../../../docs/handover/database/schema.sql');

if (!args.has('--dump-only')) {
  await ensureDatabaseSchema();
}
await pool.end();

if (!args.has('--ensure-only')) {
  const url = new URL(env.db.url);
  const res = spawnSync(
    process.env.PG_DUMP ?? 'pg_dump',
    ['--schema-only', '--no-owner', '--no-privileges', '--no-comments', '-h', url.hostname, '-p', url.port || '5432', '-U', decodeURIComponent(url.username), url.pathname.slice(1)],
    { env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  if (res.status !== 0) {
    console.error(res.stderr);
    process.exit(1);
  }
  const cleaned = res.stdout
    .split(/\r?\n/)
    .filter((l) => !/^-- Dumped (from|by)/.test(l) && !/^\\(un)?restrict /.test(l) && !/^SET transaction_timeout/.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(
    out,
    `-- Skema database HSE Proview, dihasilkan oleh \`npm run schema:dump\` (backend) dan\n-- \`python -m server.scripts.ensure_schema\` (csms-ai). Jangan diedit manual.\n${cleaned}`,
  );
  console.log(`schema.sql ditulis: ${out}`);
}
