import cron from 'node-cron';
import { runLogManhoursJob } from '../jobs/logManhours.job.ts';

export function initLogManhoursCron() {
  // "10 0 * * *" = jam 00:10 setiap hari (setelah weatherSealevel)
  cron.schedule(
    '10 0 * * *',
    async () => {
      console.log('[CRON] LogManhours: start');
      try {
        await runLogManhoursJob();
        console.log('[CRON] LogManhours: done');
      } catch (err) {
        console.error('[CRON] LogManhours: failed', err);
      }
    },
    {
      timezone: 'Asia/Jakarta', // WIB
    }
  );
}
