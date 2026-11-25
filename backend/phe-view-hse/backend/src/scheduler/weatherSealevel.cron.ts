import cron from 'node-cron';
import { runWeatherSealevelJob } from '../jobs/weatherSealevel.job.ts';

export function initWeatherSealevelCron() {
  // "5 0 * * *" = jam 00:05 setiap hari
  cron.schedule(
    '5 0 * * *',
    async () => {
      console.log('[CRON] WeatherSealevel: start');
      try {
        await runWeatherSealevelJob();
        console.log('[CRON] WeatherSealevel: done');
      } catch (err) {
        console.error('[CRON] WeatherSealevel: failed', err);
      }
    },
    {
      timezone: 'Asia/Jakarta', // WIB
    }
  );
}
