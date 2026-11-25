import { db } from "../db/index.ts";
import {weather_sealevel} from "../db/schema/report.schema.ts";
import { collectAndSaveWeatherSealevel } from "../services/daily-report/weatherSealevel.service.ts";
import {and, gte, lt} from "drizzle-orm";

function getTodayRange() {
  const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
  const start = new Date(`${todayStr}T00:00:00+07:00`);
  const end = new Date(`${todayStr}T00:00:00+07:00`);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** Cek apakah data hari ini sudah ada */
export async function hasTodayWeatherSealevel() {
  const { start, end } = getTodayRange();

  const rows = await db
    .select({ id: weather_sealevel.id })
    .from(weather_sealevel)
    .where(
      and(
        gte(weather_sealevel.triggerAt, start),
        lt(weather_sealevel.triggerAt, end)
      )
    )
    .limit(1);

  return rows.length > 0;
}

export async function runWeatherSealevelJob() {
  if (await hasTodayWeatherSealevel()) {
    console.log("[JOB] WeatherSealevel: skip data hari ini sudah ada");
    return;
  }

  // Koordinat lokasi
  const coords = [
    { lat: -5.09992, lon: 106.34848 }, // lokasi 0
    { lat: -4.61543, lon: 106.61809, location_id: 1 }, // lokasi 1
    { lat: -5.46531, lon: 106.34728, location_id: 2 }, // lokasi 2
  ];

  // Fetch + insert
  await collectAndSaveWeatherSealevel({
    coords,
    timezone: "Asia/Bangkok", // atau Asia/Jakarta
    forecastDays: 1,
    abortMs: 20000, // timeout 20 detik
  });

  console.log("[JOB] WeatherSealevel: data baru berhasil disimpan");
}
