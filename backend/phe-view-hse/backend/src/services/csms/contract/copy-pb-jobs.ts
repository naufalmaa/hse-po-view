/**
 * In-memory job store + lock for "copy PB to another period" (single backend process).
 * No DB imports (unit tested in isolation).
 *
 * A running job locks its target folder: a new copy is refused while a running job has
 *  - the same target, or
 *  - the new target as its source (would delete files that are being read), or
 *  - the new source as its target (would read files that are being replaced).
 */
import crypto from 'crypto';

export const COPY_CONFLICT_MESSAGE = 'Penyalinan ke folder ini sedang berjalan. Tunggu hingga selesai.';

export type CopyJobStatus = 'running' | 'completed' | 'failed';

export interface CopyJob {
  id: string;
  sourceFolderId: string;
  targetFolderId: string;
  status: CopyJobStatus;
  progress: { done: number; total: number };
  message: string;
  data: unknown;
  createdAt: number;
  finishedAt: number | null;
}

export function createCopyJobStore(opts: { ttlMs?: number; now?: () => number; newId?: () => string } = {}) {
  const ttlMs = opts.ttlMs ?? 60 * 60 * 1000;
  const now = opts.now ?? Date.now;
  const newId = opts.newId ?? (() => crypto.randomUUID());
  const jobs = new Map<string, CopyJob>();

  /** Drop finished jobs older than ttl (running jobs are never dropped). */
  const prune = () => {
    const t = now();
    for (const [id, job] of jobs) {
      if (job.status !== 'running' && job.finishedAt !== null && t - job.finishedAt > ttlMs) jobs.delete(id);
    }
  };

  const findConflict = (sourceFolderId: string, targetFolderId: string): CopyJob | null => {
    for (const job of jobs.values()) {
      if (job.status !== 'running') continue;
      if (job.targetFolderId === targetFolderId || job.sourceFolderId === targetFolderId || job.targetFolderId === sourceFolderId) {
        return job;
      }
    }
    return null;
  };

  /** Check the lock and register the job in one synchronous step. */
  const start = (sourceFolderId: string, targetFolderId: string): { ok: true; job: CopyJob } | { ok: false; conflict: CopyJob } => {
    prune();
    const conflict = findConflict(sourceFolderId, targetFolderId);
    if (conflict) return { ok: false, conflict };
    const job: CopyJob = {
      id: newId(),
      sourceFolderId,
      targetFolderId,
      status: 'running',
      progress: { done: 0, total: 0 },
      message: 'Menyiapkan penyalinan…',
      data: null,
      createdAt: now(),
      finishedAt: null,
    };
    jobs.set(job.id, job);
    return { ok: true, job };
  };

  const progress = (id: string, done: number, total: number, message?: string) => {
    const job = jobs.get(id);
    if (!job || job.status !== 'running') return;
    job.progress = { done, total };
    if (message) job.message = message;
  };

  const finish = (id: string, status: 'completed' | 'failed', message: string, data: unknown = null) => {
    const job = jobs.get(id);
    if (!job) return;
    job.status = status;
    job.message = message;
    job.data = data;
    job.finishedAt = now();
  };

  const get = (id: string): CopyJob | null => {
    prune();
    return jobs.get(id) ?? null;
  };

  return { start, progress, finish, get, findConflict, prune, size: () => jobs.size };
}

export type CopyJobStore = ReturnType<typeof createCopyJobStore>;

/** The store used by the routes (one per backend process). */
export const copyJobs = createCopyJobStore();
