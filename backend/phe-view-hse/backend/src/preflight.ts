// src/preflight.ts
// Pemeriksaan konfigurasi dan dependensi saat start (dan lewat `npm run preflight`).
// Tidak pernah mencetak password atau secret.
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import env, { getUploadsRootDir } from './config/env.config.ts';

export type CheckLevel = 'fatal' | 'warn';
export interface CheckResult {
  name: string;
  level: CheckLevel;
  ok: boolean;
  message: string;
  ms: number;
}

const isProduction = process.env.NODE_ENV === 'production';

function dbTarget(): string {
  try {
    const u = new URL(env.db.url);
    return `${u.hostname}:${u.port || 5432}${u.pathname}`;
  } catch {
    return '(DB URL tidak valid)';
  }
}

async function timed(
  name: string,
  level: CheckLevel,
  fn: () => Promise<string>,
): Promise<CheckResult> {
  const t0 = Date.now();
  try {
    const message = await fn();
    return { name, level, ok: true, message, ms: Date.now() - t0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { name, level, ok: false, message, ms: Date.now() - t0 };
  }
}

async function withClient<T>(fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: env.db.url, connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => undefined);
  }
}

export function checkUploadsWritable(): string {
  const dir = getUploadsRootDir();
  const probe = path.join(dir, `.preflight-${process.pid}-${Date.now()}`);
  fs.writeFileSync(probe, 'ok');
  fs.rmSync(probe, { force: true });
  return dir;
}

/** Pemeriksaan sebelum skema disinkronkan: DB terjangkau, uploads, konfigurasi. */
export async function runPreflightBeforeSchema(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  results.push(
    await timed('Database', 'fatal', async () =>
      withClient(async (c) => {
        await c.query('select current_database()');
        return dbTarget();
      }).catch((err: Error) => {
        throw new Error(`${dbTarget()} tidak terjangkau: ${err.message}`);
      }),
    ),
  );

  results.push(
    await timed('Uploads', isProduction ? 'fatal' : 'warn', async () => `${checkUploadsWritable()} (dapat ditulis)`),
  );

  results.push(
    await timed('Konfigurasi', 'fatal', async () => {
      const secret = env.server.secretKey;
      if (isProduction && (!secret || secret === 'secret' || secret.length < 32)) {
        throw new Error('BETTER_AUTH_SECRET kosong, bawaan, atau < 32 karakter. Buat dengan: openssl rand -hex 32');
      }
      return 'BETTER_AUTH_SECRET diset';
    }),
  );

  results.push(
    await timed('URL', 'warn', async () => {
      const urls = { FRONTEND_URL: env.server.frontendUrl, BASE_URL: env.server.baseUrl, BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? '' };
      const bad = Object.entries(urls).filter(([, v]) => v.endsWith('/')).map(([k]) => k);
      if (bad.length) throw new Error(`hapus slash di akhir: ${bad.join(', ')}`);
      return 'tanpa slash di akhir';
    }),
  );

  if (env.server.chromePath) {
    results.push(
      await timed('Chrome', 'warn', async () => {
        if (!fs.existsSync(env.server.chromePath as string)) throw new Error(`CHROME_PATH tidak ditemukan: ${env.server.chromePath}`);
        return env.server.chromePath as string;
      }),
    );
  }
  return results;
}

/** Pemeriksaan setelah skema disinkronkan: ekstensi dan layanan csms-ai. */
export async function runPreflightAfterSchema(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  results.push(
    await timed('Ekstensi', 'fatal', async () =>
      withClient(async (c) => {
        const { rows } = await c.query<{ extname: string }>('select extname from pg_extension');
        const have = new Set(rows.map((r) => r.extname));
        const missing = ['ltree', 'uuid-ossp', 'pgcrypto'].filter((e) => !have.has(e));
        if (missing.length) {
          throw new Error(
            `ekstensi wajib belum terpasang: ${missing.join(', ')} (server memasangnya saat start bila user DB berhak CREATE EXTENSION; bila tidak, minta DBA)`,
          );
        }
        return [...['ltree', 'uuid-ossp', 'pgcrypto'], ...(have.has('vector') ? ['vector'] : [])].join(', ');
      }),
    ),
  );

  results.push(
    await timed('pgvector', 'warn', async () =>
      withClient(async (c) => {
        const { rowCount } = await c.query("select 1 from pg_extension where extname = 'vector'");
        if (!rowCount) throw new Error('ekstensi vector tidak ada: pencarian knowledge base CSMS AI berbasis embedding tidak aktif');
        return 'terpasang';
      }),
    ),
  );

  results.push(
    await timed('csms-ai', 'warn', async () => {
      const base = env.csmsAi.serviceUrl.replace(/\/+$/, '');
      const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(3000) });
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) throw new Error(`${base} menjawab HTTP ${res.status}`);
      const notes: string[] = [`${base} terjangkau`];
      if (body.vision === false) notes.push('vision OCR offline (memakai PaddleOCR)');
      const engineDir = typeof body.uploads_dir === 'string' ? path.resolve(body.uploads_dir) : null;
      const backendDir = path.resolve(getUploadsRootDir());
      if (engineDir && engineDir !== backendDir) {
        throw new Error(`UPLOADS_DIR beda: engine=${engineDir}, backend=${backendDir}`);
      }
      return notes.join('; ');
    }),
  );
  return results;
}

export function printResults(title: string, results: CheckResult[]): void {
  console.log(`[preflight] ${title}`);
  for (const r of results) {
    const tag = r.ok ? 'OK  ' : r.level === 'fatal' ? 'FAIL' : 'WARN';
    console.log(`  ${tag}  ${r.name.padEnd(12)} ${r.message} (${r.ms} ms)`);
  }
}

export function hasFatal(results: CheckResult[]): boolean {
  return results.some((r) => !r.ok && r.level === 'fatal');
}

export const preflightSkipped = (): boolean => process.env.SKIP_PREFLIGHT === 'true';
