import { getOrFetchWeatherSealevelByDate } from '../services/daily-report/weatherSealevel.service.ts';

async function main() {
  const args = process.argv.slice(2);
  let dateStr = args[0];
  
  if (!dateStr) {
    dateStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
  }

  console.log(`Fetching weather and sealevel data for: ${dateStr}`);

  const coords = [
    { lat: -5.09992, lon: 106.34848 },
    { lat: -4.61543, lon: 106.61809, location_id: 1 },
    { lat: -5.46531, lon: 106.34728, location_id: 2 },
  ];

  try {
    const result = await getOrFetchWeatherSealevelByDate(dateStr, {
      coords,
      timezone: 'Asia/Bangkok',
      abortMs: 20000,
    });

    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Failed to fetch weather/sealevel:', error);
    process.exit(1);
  }
}

main();
