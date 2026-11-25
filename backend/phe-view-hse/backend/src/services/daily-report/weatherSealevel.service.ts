// src/services/weatherSealevel.service.ts

import { db } from '../../db/index.ts';
import { weather_sealevel } from '../../db/schema/report.schema.ts';
import { and, desc, gte, lt } from 'drizzle-orm';

/* =========================
   Types
   ========================= */
type Coords = { lat: number; lon: number; location_id?: number };
type WeatherResponse = any;
type SealevelResponse = any;

interface FetchOptions {
  coords: Coords[];
  timezone?: string;     // default 'Asia/Jakarta'
  forecastDays?: number; // default 1
  abortMs?: number;      // default 20000
}

/* =========================
   WIB helpers
   ========================= */

/** Dapatkan rentang 1 hari penuh WIB untuk filter ke DB */
function getDateRangeWIB(dateStr: string) {
  const startUTC = new Date(`${dateStr}T00:00:00+07:00`);
  const endUTC = new Date(`${dateStr}T00:00:00+07:00`);
  endUTC.setDate(endUTC.getDate() + 1);
  return { startUTC, endUTC };
}

/** Buat timestamp persis 00:00 WIB untuk tanggal tsb (disimpan ke DB) */
function getTriggerAtForDateWIB(dateStr: string) {
  return new Date(`${dateStr}T00:00:00+07:00`);
}

/** Format Date → string WIB: "YYYY-MM-DD HH:mm:ss.SSS+07" (tanpa ':00') */
function toWIBString(d: Date) {
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    fractionalSecondDigits: 3, hour12: false,
  });
  // "YYYY-MM-DD HH:mm:ss.SSS"
  const base = fmt.format(d);
  return `${base}+07`;
}

/* =========================
   Open-Meteo URL builders
   ========================= */

function joinParams(values: (string | number)[]) {
  return values.join(',');
}

/** Region Weather (daratan) — non by-date (harian) */
function buildRegionWeatherUrl(
  { coords, timezone = 'Asia/Jakarta', forecastDays = 1 }: FetchOptions
) {
  const latitudes = joinParams(coords.map(c => c.lat));
  const longitudes = joinParams(coords.map(c => c.lon));
  const hourly = 'temperature_2m,weather_code,wind_speed_10m,cloud_cover';

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', latitudes);
  url.searchParams.set('longitude', longitudes);
  url.searchParams.set('hourly', hourly);
  url.searchParams.set('timezone', timezone);
  url.searchParams.set('forecast_days', String(forecastDays));
  url.searchParams.set('format', 'json');
  url.searchParams.set('timeformat', 'unixtime');
  return url.toString();
}

/** Region Sealevel (marine) — non by-date (harian) */
function buildRegionSealevelUrl(
  { coords, timezone = 'Asia/Jakarta', forecastDays = 1 }: FetchOptions
) {
  const latitudes = joinParams(coords.map(c => c.lat));
  const longitudes = joinParams(coords.map(c => c.lon));

  const url = new URL('https://marine-api.open-meteo.com/v1/marine');
  url.searchParams.set('latitude', latitudes);
  url.searchParams.set('longitude', longitudes);
  url.searchParams.set('hourly', 'sea_level_height_msl');
  url.searchParams.set('timezone', timezone);
  url.searchParams.set('forecast_days', String(forecastDays));
  // Jika API error 400, hapus dua baris di bawah
  url.searchParams.set('past_minutely_15', '4');
  url.searchParams.set('forecast_minutely_15', '4');

  url.searchParams.set('format', 'json');
  url.searchParams.set('timeformat', 'unixtime');
  return url.toString();
}

/** Weather — by-date */
function buildRegionWeatherUrlByDate(
  { coords, timezone = 'Asia/Jakarta', date }:
  Pick<FetchOptions, 'coords' | 'timezone'> & { date: string }
) {
  const latitudes = coords.map(c => c.lat).join(',');
  const longitudes = coords.map(c => c.lon).join(',');
  const hourly = 'temperature_2m,weather_code,wind_speed_10m,cloud_cover';

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', latitudes);
  url.searchParams.set('longitude', longitudes);
  url.searchParams.set('hourly', hourly);
  url.searchParams.set('timezone', timezone);
  url.searchParams.set('format', 'json');
  url.searchParams.set('timeformat', 'unixtime');
  url.searchParams.set('start_date', date);
  url.searchParams.set('end_date', date);
  return url.toString();
}

/** Sealevel — by-date */
function buildRegionSealevelUrlByDate(
  { coords, timezone = 'Asia/Jakarta', date }:
  Pick<FetchOptions, 'coords' | 'timezone'> & { date: string }
) {
  const latitudes = coords.map(c => c.lat).join(',');
  const longitudes = coords.map(c => c.lon).join(',');

  const url = new URL('https://marine-api.open-meteo.com/v1/marine');
  url.searchParams.set('latitude', latitudes);
  url.searchParams.set('longitude', longitudes);
  url.searchParams.set('hourly', 'sea_level_height_msl');
  url.searchParams.set('timezone', timezone);
  url.searchParams.set('format', 'json');
  url.searchParams.set('timeformat', 'unixtime');
  url.searchParams.set('start_date', date);
  url.searchParams.set('end_date', date);
  return url.toString();
}

/* =========================
   Fetch helper (timeout)
   ========================= */

async function fetchJson(url: string, abortMs = 20000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), abortMs);
  try {
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
    }
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/* =========================
   Public APIs (Service)
   ========================= */

/** Fetch kedua API (non by-date) */
export async function getRegionWeatherAndSealevel(opts: FetchOptions): Promise<{
  regionWeather: WeatherResponse;
  regionSealevel: SealevelResponse;
}> {
  const weatherUrl = buildRegionWeatherUrl(opts);
  const sealevelUrl = buildRegionSealevelUrl(opts);
  const [regionWeather, regionSealevel] = await Promise.all([
    fetchJson(weatherUrl, opts.abortMs),
    fetchJson(sealevelUrl, opts.abortMs),
  ]);
  return { regionWeather, regionSealevel };
}

/** Simpan payload ke tabel; triggerAt default = now() */
export async function storeWeatherSealevel(payload: {
  regionWeather: WeatherResponse;
  regionSealevel: SealevelResponse;
  triggerAt?: Date;
}) {
  const { regionWeather, regionSealevel, triggerAt = new Date() } = payload;
  await db.insert(weather_sealevel).values({ regionWeather, regionSealevel, triggerAt });
}

/** Ambil + simpan (non by-date) */
export async function collectAndSaveWeatherSealevel(opts: FetchOptions) {
  const { regionWeather, regionSealevel } = await getRegionWeatherAndSealevel(opts);
  await storeWeatherSealevel({ regionWeather, regionSealevel, triggerAt: new Date() });
  return { ok: true };
}

/** Ambil record terbaru. triggerAt dikembalikan sebagai string WIB */
export async function getLatestWeatherSealevel() {
  const rows = await db
    .select({
      id: weather_sealevel.id,
      regionWeather: weather_sealevel.regionWeather,
      regionSealevel: weather_sealevel.regionSealevel,
      triggerAt: weather_sealevel.triggerAt,
    })
    .from(weather_sealevel)
    .orderBy(desc(weather_sealevel.triggerAt))
    .limit(1);

  const r = rows[0];
  if (!r) return null;

  return {
    id: r.id,
    regionWeather: r.regionWeather,
    regionSealevel: r.regionSealevel,
    triggerAt: toWIBString(r.triggerAt), // kembalikan WIB string
  };
}

/**
 * Ambil data by-date (WIB). Jika belum ada di DB:
 * - fetch dari Open-Meteo untuk tanggal tsb,
 * - simpan dengan triggerAt = 00:00 WIB (tanggal diminta),
 * - kembalikan record dengan triggerAt sebagai string WIB.
 */
export async function getOrFetchWeatherSealevelByDate(
  dateStr: string,
  opts: Omit<FetchOptions, 'forecastDays'>
) {
  // 1) Cek di DB
  const { startUTC, endUTC } = getDateRangeWIB(dateStr);
  const existing = await db
    .select({
      id: weather_sealevel.id,
      regionWeather: weather_sealevel.regionWeather,
      regionSealevel: weather_sealevel.regionSealevel,
      triggerAt: weather_sealevel.triggerAt,
    })
    .from(weather_sealevel)
    .where(and(
      gte(weather_sealevel.triggerAt, startUTC),
      lt(weather_sealevel.triggerAt, endUTC)
    ))
    .orderBy(desc(weather_sealevel.triggerAt))
    .limit(1);

  if (existing.length > 0) {
    const r = existing[0];
    return {
      id: r.id,
      regionWeather: r.regionWeather,
      regionSealevel: r.regionSealevel,
      triggerAt: toWIBString(r.triggerAt),
    };
  }

  // 2) Tidak ada di DB → coba fetch API
  try {
    const weatherUrl = buildRegionWeatherUrlByDate({ ...opts, date: dateStr });
    const sealevelUrl = buildRegionSealevelUrlByDate({ ...opts, date: dateStr });
    const [regionWeather, regionSealevel] = await Promise.all([
      fetchJson(weatherUrl, opts.abortMs),
      fetchJson(sealevelUrl, opts.abortMs),
    ]);

    // 3) Simpan hasilnya
    const triggerAt = getTriggerAtForDateWIB(dateStr);
    const [inserted] = await db
      .insert(weather_sealevel)
      .values({ regionWeather, regionSealevel, triggerAt })
      .returning({
        id: weather_sealevel.id,
        regionWeather: weather_sealevel.regionWeather,
        regionSealevel: weather_sealevel.regionSealevel,
        triggerAt: weather_sealevel.triggerAt,
      });

    return {
      data:{
        id: inserted.id,
        regionWeather: inserted.regionWeather,
        regionSealevel: inserted.regionSealevel,
        triggerAt: toWIBString(inserted.triggerAt),
      }
    };
  } catch (err: any) {
    // 4) Tangkap error → return standar
    return {
      success: false
    };
  }
}
