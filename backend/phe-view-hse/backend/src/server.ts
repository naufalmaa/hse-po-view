// src/server.ts
import closeWithGrace from 'close-with-grace';
import { ajvFilePlugin } from '@fastify/multipart';
// Trigger bun watcher reload for newly added route files: bulk-assessment
import { buildApp } from './app.ts';
import env from './config/env.config.ts';
import { runExpiryCheckJobs } from './jobs/alarm-checker.ts';
import { startDbListener } from './db/listener.ts';
import { startWebSocketHeartbeat } from './ws/heartbeat.ts';
import { runWeatherSealevelJob } from './jobs/weatherSealevel.job.ts';
import { initWeatherSealevelCron } from './scheduler/weatherSealevel.cron.ts';
import { initLogManhoursCron } from './scheduler/logManhours.cron.ts';
import { runLogManhoursJob } from './jobs/logManhours.job.ts';

import { ensureDatabaseSchema } from './db/ensure/index.ts';
import {
  hasFatal,
  preflightSkipped,
  printResults,
  runPreflightAfterSchema,
  runPreflightBeforeSchema,
} from './preflight.ts';

async function startServer() {
  if (!preflightSkipped()) {
    const before = await runPreflightBeforeSchema();
    printResults('backend (sebelum sinkronisasi skema)', before);
    if (hasFatal(before)) {
      console.error('[preflight] Pemeriksaan wajib gagal, server tidak dijalankan. Lewati dengan SKIP_PREFLIGHT=true.');
      process.exit(1);
    }
  }

  await ensureDatabaseSchema();

  if (!preflightSkipped()) {
    const after = await runPreflightAfterSchema();
    printResults('backend (setelah sinkronisasi skema)', after);
    if (hasFatal(after)) {
      console.error('[preflight] Pemeriksaan wajib gagal, server tidak dijalankan. Lewati dengan SKIP_PREFLIGHT=true.');
      process.exit(1);
    }
  }

  const app = await buildApp({
    logger: {
      level: env.log.level,
      redact: ['headers.authorization'],
    },
    ignoreDuplicateSlashes: true,
    ajv: {
      plugins: [ajvFilePlugin as any],
    },
    pluginTimeout: 30000, // Meningkatkan timeout untuk mencegah timeout autoload saat cold start
  });

  // --- inisialisasi fitur lain ---
  await runExpiryCheckJobs();
  app.log.info('Alarm system check completed');

  await startDbListener();
  app.log.info('Listening for alarm notifications');

  startWebSocketHeartbeat();

  // --- Jadwalkan job harian ---
  initWeatherSealevelCron();
  app.log.info('Weather sealevel daily scheduler initialized');

  initLogManhoursCron();
  app.log.info('Log manhours daily scheduler initialized');

  runWeatherSealevelJob()
    .then(() => app.log.info('Weather sealevel boot job completed'))
    .catch((err) => app.log.error({ err }, 'Weather sealevel boot job failed'));

  // Check and collect log manhours data for today on boot
  runLogManhoursJob()
    .then(() => app.log.info('Log manhours boot job completed'))
    .catch((err) => app.log.error({ err }, 'Log manhours boot job failed'));

  // --- graceful shutdown ---
  closeWithGrace(async ({ signal, err }) => {
    if (err) {
      app.log.error({ err }, 'server closing with error');
    } else {
      app.log.info(`${signal} received, server closing`);
    }
    await app.close();
  });

  try {
    await app.listen({ host: env.server.host, port: env.server.port });
    app.log.info(`Server listening on ${env.server.host}:${env.server.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

await startServer();
